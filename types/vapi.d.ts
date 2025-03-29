declare module "@vapi-ai/web" {
  enum MessageTypeEnum {
    TRANSCRIPT = "transcript",
    FUNCTION_CALL = "function-call",
    FUNCTION_CALL_RESULT = "function-call-result",
    ADD_MESSAGE = "add-message",
  }

  enum MessageRoleEnum {
    USER = "user",
    SYSTEM = "system",
    ASSISTANT = "assistant",
  }

  enum TranscriptMessageTypeEnum {
    PARTIAL = "partial",
    FINAL = "final",
  }

  interface BaseMessage {
    type: MessageTypeEnum;
  }

  interface TranscriptMessage extends BaseMessage {
    type: MessageTypeEnum.TRANSCRIPT;
    role: MessageRoleEnum;
    transcriptType: TranscriptMessageTypeEnum;
    transcript: string;
  }

  interface FunctionCallMessage extends BaseMessage {
    type: MessageTypeEnum.FUNCTION_CALL;
    functionCall: {
      name: string;
      parameters: unknown;
    };
  }

  interface FunctionCallResultMessage extends BaseMessage {
    type: MessageTypeEnum.FUNCTION_CALL_RESULT;
    functionCallResult: {
      forwardToClientEnabled?: boolean;
      result: unknown;
      [a: string]: unknown;
    };
  }

  type Message =
    | TranscriptMessage
    | FunctionCallMessage
    | FunctionCallResultMessage;

  export interface VapiService {
    createAssistant(params: {
      name: string;
      model: string;
      tools: Array<{
        type: string;
        knowledge_base_id?: string;
      }>;
      instructions: string;
    }): Promise<{ id: string }>;

    createCall(params: {
      assistant_id: string;
      workflow?: {
        id: string;
        data: Record<string, any>;
      };
    }): Promise<{ id: string }>;

    getFileContent(fileId: string): Promise<{ text: string }>;
  }

  export default class Vapi implements VapiService {
    constructor(token: string);
    
    files: {
      create(file: Buffer | ReadableStream): Promise<{ id: string }>;
      get(id: string): Promise<{ text: string }>;
    };

    on(event: string, callback: (message: any) => void): void;
    off(event: string, callback: (message: any) => void): void;
    start(workflowIdOrAssistant: string | any, options?: { variableValues?: Record<string, any> }): Promise<void>;
    stop(): Promise<void>;

    createAssistant(params: {
      name: string;
      model: string;
      tools: Array<{
        type: string;
        knowledge_base_id?: string;
      }>;
      instructions: string;
    }): Promise<{ id: string }>;

    createCall(params: {
      assistant_id: string;
      workflow?: {
        id: string;
        data: Record<string, any>;
      };
    }): Promise<{ id: string }>;
    
    getFileContent(fileId: string): Promise<{ text: string }>;

    uploadFile(params: {
      file: string;
      fileName: string;
      mimeType: string;
    }): Promise<{ id: string }>;
  }
}

declare module "@vapi/server-sdk" {
  interface VapiClientOptions {
    token: string;
  }

  interface VapiFile {
    id: string;
    text: string;
  }

  export class VapiClient {
    constructor(options: VapiClientOptions);
    
    files: {
      create(file: Buffer | ReadableStream): Promise<{ id: string }>;
      get(id: string): Promise<VapiFile>;
    };
  }
}

// Export type for the service
export interface VapiService extends Vapi {}
