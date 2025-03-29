import { NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { vapi, vapiService } from "@/lib/vapi.sdk";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as 'profile' | 'resume';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
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

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64String = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64String}`;

    // Upload to Cloudinary
    const uploadOptions: any = {
      folder: type === 'profile' ? 'profile-pictures' : 'resumes',
      resource_type: type === 'profile' ? 'image' : 'raw',
    };

    if (type === 'resume') {
      uploadOptions.format = 'pdf';
      uploadOptions.tags = ['resume'];
    }

    const cloudinaryResult = await cloudinary.uploader.upload(dataURI, uploadOptions);

    // If it's a resume, also upload to VAPI
    let vapiFileId = null;
    if (type === 'resume') {
      try {
        const vapiResponse = await vapi.uploadFile(
          base64String,
          file.name,
          file.type
        );
        vapiFileId = vapiResponse.fileId;
      } catch (vapiError) {
        console.error('VAPI upload error:', vapiError);
      }
    }

    return NextResponse.json({
      success: true,
      url: cloudinaryResult.secure_url,
      format: cloudinaryResult.format,
      vapiFileId
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

// Increase payload size limit
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}; 