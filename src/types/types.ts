export type OpenAIModel = 'gpt-4o' | 'gpt-3.5-turbo';
export type StudyCondition = 'low_control' | 'medium_control' | 'high_control';

export interface ChatBody {
  inputCode: string;
  model: OpenAIModel;
  messages?: { role: 'user' | 'assistant'; content: string }[];
  condition?: StudyCondition;
}
