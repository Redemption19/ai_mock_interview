import Vapi from "@vapi-ai/web";

// Export the VAPI instance directly as before
export const vapi = new Vapi(process.env.NEXT_PUBLIC_VAPI_WEB_TOKEN!);

// Keep the service for additional functionality if needed
class VapiService {
  // Your additional methods here
}

export const vapiService = new VapiService();

export async function getResumeContent(fileId: string) {
  try {
    const content = await vapi.getFileContent(fileId);
    return content.text;
  } catch (error) {
    console.error('Error retrieving resume content:', error);
    return null;
  }
}
