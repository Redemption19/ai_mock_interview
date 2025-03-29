import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import Vapi from '@vapi-ai/web';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize VAPI with web token for other operations
const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

async function getOrCreateAssistant(knowledgeBaseId: string) {
  try {
    // First, try to get existing assistant
    const assistantId = process.env.VAPI_ASSISTANT_ID; // Store this in your .env
    if (assistantId) {
      const getResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`
        }
      });

      if (getResponse.ok) {
        // Update existing assistant with new knowledge base
        const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tools: [{
              type: 'knowledge_base',
              knowledge_base_id: knowledgeBaseId
            }]
          })
        });

        if (updateResponse.ok) {
          const assistantData = await updateResponse.json();
          return assistantData.id;
        }
      }
    }

    // If no existing assistant or update failed, create new one
    const createResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Interview Assistant',
        model: 'gpt-4',
        tools: [{
          type: 'knowledge_base',
          knowledge_base_id: knowledgeBaseId
        }],
        instructions: 'You are an AI interviewer. Use the candidate\'s resume to ask relevant questions about their experience.'
      })
    });

    if (!createResponse.ok) {
      throw new Error('Failed to create assistant');
    }

    const newAssistantData = await createResponse.json();
    return newAssistantData.id;
  } catch (error) {
    console.error('Assistant error:', error);
    throw error;
  }
}

async function uploadToVapi(buffer: Buffer, fileName: string, fileType: string) {
  try {
    // 1. Upload file
    const formData = new FormData();
    const blob = new Blob([buffer], { type: fileType });
    formData.append('file', blob, fileName);

    const fileResponse = await fetch('https://api.vapi.ai/file', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`
      },
      body: formData
    });

    if (!fileResponse.ok) {
      throw new Error(`File upload failed: ${await fileResponse.text()}`);
    }

    const fileData = await fileResponse.json();
    const fileId = fileData.id;

    // 2. Create knowledge base
    const kbResponse = await fetch('https://api.vapi.ai/knowledge-base', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `Resume_${fileName}`,
        files: [fileId],
        description: 'Resume knowledge base for interview preparation'
      })
    });

    if (!kbResponse.ok) {
      throw new Error(`Knowledge base creation failed: ${await kbResponse.text()}`);
    }

    const kbData = await kbResponse.json();
    const knowledgeBaseId = kbData.id;

    // 3. Update or create assistant with knowledge base
    const assistantId = process.env.VAPI_ASSISTANT_ID;
    if (assistantId) {
      const updateResponse = await fetch(`https://api.vapi.ai/assistant/${assistantId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.VAPI_PRIVATE_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tools: [{
            type: 'knowledge_base',
            knowledge_base_id: knowledgeBaseId
          }]
        })
      });

      if (!updateResponse.ok) {
        throw new Error(`Assistant update failed: ${await updateResponse.text()}`);
      }
    }

    return {
      url: fileData.url,
      fileId,
      knowledgeBaseId
    };
  } catch (error) {
    console.error('VAPI integration error:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate resume file type
    if (type === 'resume') {
      const validResumeTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validResumeTypes.includes(file.type)) {
        return NextResponse.json(
          { error: 'Invalid file type. Please upload a PDF or Word document.' },
          { status: 400 }
        );
      }
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload to Cloudinary first
    const dataURI = `data:${file.type};base64,${buffer.toString('base64')}`;
    const cloudinaryResult = await cloudinary.uploader.upload(dataURI, {
      folder: type === 'profile' ? 'profile-pictures' : 'resumes',
      resource_type: type === 'profile' ? 'image' : 'raw',
      format: type === 'resume' ? 'pdf' : undefined,
      tags: type === 'resume' ? ['resume'] : undefined,
    });

    // If it's a resume, upload to VAPI and create knowledge base
    let vapiFileId = null;
    let vapiKnowledgeBaseId = null;
    if (type === 'resume') {
      try {
        const vapiData = await uploadToVapi(buffer, file.name, file.type);
        vapiFileId = vapiData.fileId;
        vapiKnowledgeBaseId = vapiData.knowledgeBaseId;
      } catch (error: any) {
        return NextResponse.json(
          { error: error?.message || 'Failed to upload to VAPI' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      url: cloudinaryResult.secure_url,
      vapiFileId,
      vapiKnowledgeBaseId
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Upload failed' },
      { status: 500 }
    );
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 