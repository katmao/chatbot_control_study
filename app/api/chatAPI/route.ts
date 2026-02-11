import { ChatBody } from '@/types/types';
import { OpenAIStream } from '@/utils/chatStream';

const isInitialGreeting = (input: string, messages?: { role: 'user' | 'assistant'; content: string }[]) => {
  if (messages && messages.length > 0) return false;
  const normalized = input.trim().toLowerCase();
  return /^(hi|hello)[.!?]*$/.test(normalized);
};

const FINAL_CLOSING_LINE = 'Thank you and please proceed to the next page.';

const isAwaitingFinalClosing = (messages?: { role: 'user' | 'assistant'; content: string }[]) => {
  if (!messages || messages.length === 0) return false;
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'assistant') return false;
  const normalized = lastMessage.content.trim().toLowerCase();
  if (normalized.includes(FINAL_CLOSING_LINE.toLowerCase())) return false;
  return /anything.*adjust|anything.*change|anything.*needs adjustment/.test(normalized);
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

export async function GET(req: Request): Promise<Response> {
  try {
    const { inputCode, model, messages } = (await req.json()) as ChatBody;

    if (!messages || !Array.isArray(messages)) {
      return new Response('No messages provided', { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response('OpenAI API key not configured', { status: 500 });
    }

    if (isAwaitingFinalClosing(messages)) {
      return new Response(textToStream(FINAL_CLOSING_LINE));
    }

    if (isInitialGreeting(inputCode, messages)) {
      return new Response(textToStream('Hi. I’m a support chatbot. I’ll guide the process, and we’ll decide next steps together. What’s going on?'));
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

    if (isAwaitingFinalClosing(messages)) {
      return new Response(textToStream(FINAL_CLOSING_LINE));
    }

    if (isInitialGreeting(inputCode, messages)) {
      return new Response(textToStream('Hi. I’m a support chatbot. I’ll guide the process, and we’ll decide next steps together. What’s going on?'));
    }

    const stream = await OpenAIStream(inputCode, model, process.env.OPENAI_API_KEY, messages);
    return new Response(stream);
  } catch (error) {
    console.error(error);
    return new Response('Error processing your request', { status: 500 });
  }
}
