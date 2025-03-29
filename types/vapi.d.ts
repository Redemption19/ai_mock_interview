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

declare module "@vapi-ai/web" {
  interface CreateAssistantDTO {
    assistantId?: string;
    name?: string;
    model?: string;
    systemPrompt?: string;
    options?: any;
    [key: string]: any;
  }

  interface CallOptions {
    assistantId: string;
    options?: any;
  }

  interface FileContent {
    text: string;
    [key: string]: any;
  }

  export default class Vapi {
    constructor(token: string);
    
    // Event handlers
    on(event: string, callback: (...args: any[]) => void): void;
    off(event: string, callback: (...args: any[]) => void): void;
    
    // Call methods
    start(assistantId: string, options?: any): Promise<void>;
    stop(): Promise<void>;
    
    // Assistant methods
    createAssistant(params: CreateAssistantDTO): Promise<any>;
    createCall(assistantId: string, options?: any): Promise<any>;
    
    // File methods
    uploadFile(file: string | Buffer, options?: any): Promise<any>;
    getFileContent(fileId: string): Promise<FileContent>;
  }
}

// Export a helper type for the service
export interface VapiService extends Vapi {}
