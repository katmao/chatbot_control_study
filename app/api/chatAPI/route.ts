import { ChatBody, StudyCondition } from '@/types/types';
import { OpenAIStream } from '@/utils/chatStream';

type InputChatMessage = { role: 'user' | 'assistant'; content: string };

const DEFAULT_CONDITION: StudyCondition = 'low_control';
const DEFAULT_MODEL = 'gpt-4o';
const FINAL_CLOSING_LINE = 'Thank you and please proceed to the next page.';

const isInitialGreeting = (input: string, messages?: InputChatMessage[]) => {
  if (messages && messages.length > 0) return false;
  const normalized = input.trim().toLowerCase();
  return /^(hi|hello)[.!?]*$/.test(normalized);
};

const isAdviceRequest = (input: string) => {
  const normalized = input.trim().toLowerCase();
  return /\bwhat should i do\b|\bany suggestions\b|\btell me what to do\b/.test(normalized);
};

const isLikeWhat = (input: string) => {
  const normalized = input.trim().toLowerCase();
  return /^like what[.!?]*$/.test(normalized);
};

const isControlHandOff = (input: string) => {
  const normalized = input.trim().toLowerCase();
  return /\byou decide\b|\bjust choose for me\b/.test(normalized);
};

const isAwaitingFinalClosing = (messages?: InputChatMessage[]) => {
  if (!messages || messages.length === 0) return false;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'assistant') return false;
  const normalized = lastMessage.content.trim().toLowerCase();
  if (normalized.includes(FINAL_CLOSING_LINE.toLowerCase())) return false;
  return /anything.*adjust|anything.*change|anything.*needs adjustment/.test(normalized);
};

const ADVICE_RESPONSE =
  'I can’t tell you what to do or give direct advice. I can help you think it through. What options have you considered so far, even if they feel imperfect?';

const LIKE_WHAT_RESPONSE =
  'I can’t tell you what to do or give direct advice. I can help you think it through. What’s one option you’ve thought about but haven’t said out loud?';

const CONTROL_HANDOFF_RESPONSE =
  'I won’t choose for you. I can help you clarify what fits you best. What matters most to you here: protecting the relationship, protecting your peace, or getting clarity?';

const CONDITION_SETTINGS: Record<
  StudyCondition,
  {
    initialGreeting: string;
    useLowControlOverrides?: boolean;
    useFinalClosingGuard?: boolean;
  }
> = {
  low_control: {
    initialGreeting: 'Hi. I’m a support chatbot. I’ll help you explore your own thoughts and choices. What’s going on?',
    useLowControlOverrides: true,
  },
  medium_control: {
    initialGreeting: 'Hi. I’m a support chatbot. I’ll guide the process, and we’ll decide next steps together. What’s going on?',
    useFinalClosingGuard: true,
  },
  high_control: {
    initialGreeting:
      "Hi. I'm a support chatbot. Please share as much detail as you can so I can provide clear and direct guidance. What is happening right now?",
  },
};

const getStudyCondition = (condition?: string): StudyCondition => {
  if (condition === 'medium_control' || condition === 'high_control' || condition === 'low_control') {
    return condition;
  }
  return DEFAULT_CONDITION;
};

const textToStream = (text: string) => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
};

const handleRequest = async (req: Request): Promise<Response> => {
  try {
    const { inputCode, model, messages, condition } = (await req.json()) as ChatBody;

    if (!messages || !Array.isArray(messages)) {
      return new Response('No messages provided', { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    const studyCondition = getStudyCondition(condition);
    const settings = CONDITION_SETTINGS[studyCondition];

    if (settings.useFinalClosingGuard && isAwaitingFinalClosing(messages)) {
      return new Response(textToStream(FINAL_CLOSING_LINE));
    }

    if (isInitialGreeting(inputCode, messages)) {
      return new Response(textToStream(settings.initialGreeting));
    }

    if (settings.useLowControlOverrides) {
      if (isAdviceRequest(inputCode)) {
        return new Response(textToStream(ADVICE_RESPONSE));
      }

      if (isLikeWhat(inputCode)) {
        return new Response(textToStream(LIKE_WHAT_RESPONSE));
      }

      if (isControlHandOff(inputCode)) {
        return new Response(textToStream(CONTROL_HANDOFF_RESPONSE));
      }
    }

    const stream = await OpenAIStream(
      inputCode,
      model ?? DEFAULT_MODEL,
      process.env.OPENAI_API_KEY,
      messages,
      studyCondition,
    );
    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error processing your request', { status: 500 });
  }
};

export async function GET(req: Request): Promise<Response> {
  return handleRequest(req);
}

export async function POST(req: Request) {
  return handleRequest(req);
}
