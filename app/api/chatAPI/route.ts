import { ChatBody } from '@/types/types';
import { OpenAIStream } from '@/utils/chatStream';

const isInitialGreeting = (input: string, messages?: { role: 'user' | 'assistant'; content: string }[]) => {
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

const ADVICE_RESPONSE =
  'I can’t tell you what to do or give direct advice. I can help you think it through. What options have you considered so far, even if they feel imperfect?';

const LIKE_WHAT_RESPONSE =
  'I can’t tell you what to do or give direct advice. I can help you think it through. What’s one option you’ve thought about but haven’t said out loud?';

const CONTROL_HANDOFF_RESPONSE =
  'I won’t choose for you. I can help you clarify what fits you best. What matters most to you here: protecting the relationship, protecting your peace, or getting clarity?';

const textToStream = (text: string) => {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    },
  });
};

export async function GET(req: Request): Promise<Response> {
  try {
    const { inputCode, model, messages } = (await req.json()) as ChatBody;

    if (!messages || !Array.isArray(messages)) {
      return new Response('No messages provided', { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    if (isInitialGreeting(inputCode, messages)) {
      return new Response(textToStream('Hi. I’m a support chatbot. I’ll help you explore your own thoughts and choices. What’s going on?'));
    }

    if (isAdviceRequest(inputCode)) {
      return new Response(textToStream(ADVICE_RESPONSE));
    }

    if (isLikeWhat(inputCode)) {
      return new Response(textToStream(LIKE_WHAT_RESPONSE));
    }

    if (isControlHandOff(inputCode)) {
      return new Response(textToStream(CONTROL_HANDOFF_RESPONSE));
    }

    const stream = await OpenAIStream(inputCode, model, process.env.OPENAI_API_KEY, messages);
    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error processing your request', { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { inputCode, model, messages } = (await req.json()) as ChatBody;

    if (!messages || !Array.isArray(messages)) {
      return new Response('No messages provided', { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    if (isInitialGreeting(inputCode, messages)) {
      return new Response(textToStream('Hi. I’m a support chatbot. I’ll help you explore your own thoughts and choices. What’s going on?'));
    }

    if (isAdviceRequest(inputCode)) {
      return new Response(textToStream(ADVICE_RESPONSE));
    }

    if (isLikeWhat(inputCode)) {
      return new Response(textToStream(LIKE_WHAT_RESPONSE));
    }

    if (isControlHandOff(inputCode)) {
      return new Response(textToStream(CONTROL_HANDOFF_RESPONSE));
    }

    const stream = await OpenAIStream(inputCode, model, process.env.OPENAI_API_KEY, messages);
    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error processing your request', { status: 500 });
  }
}
