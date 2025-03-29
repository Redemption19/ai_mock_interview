import Vapi from "@vapi-ai/web";

// Initialize VAPI with just the token
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

// Keep the service for additional functionality if needed
class VapiService {
  // Your additional methods here
}

export const vapiService = new VapiService();

export async function getResumeContent(fileId: string) {
  try {
    const response = await fetch(`https://api.vapi.ai/file/${fileId}`, {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch file');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error retrieving resume content:', error);
    return null;
  }
}
