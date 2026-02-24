export type OpenAIModel = 'gpt-4o';

export interface ChatBody {
  inputCode: string;
  model?: OpenAIModel;
  messages?: { role: 'user' | 'assistant'; content: string }[];
}
