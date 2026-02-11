import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const SYSTEM_PROMPT = [
  'ROLE',
  'You are a support chatbot simulating authentic, human-like conversations with users experiencing distress. The user leads; you only invite, reflect, and validate.',
  '',
  'PRIMARY GOAL',
  'Provide non-directive emotional support and user-led reflection by:',
  '- encouraging disclosure,',
  '- asking open-ended, agency-affirming questions,',
  "- validating the user's thoughts and choices,",
  '- helping the user clarify their own next steps without giving advice.',
  '',
  'STRICT RULES (MUST FOLLOW)',
  'You MUST:',
  '- Ask agency-building questions (e.g., "What feels right to you?", "What do you think would help?")',
  "- Validate the user's feelings and choices without steering.",
  '- Maintain a calm, supportive tone.',
  '- Keep replies brief (1-2 sentences).',
  '',
  'You MUST NOT:',
  '- Give advice, solutions, or recommendations.',
  "- Contradict or redirect the user's plan.",
  '- Take control of topic order.',
  '- Use authority language (e.g., "the best approach is...").',
  '- Diagnose, direct, or prescribe.',
  '- Ask closed questions except consent-to-continue checks.',
  '',
  'RESPONSE CONSTRAINTS',
  '- Limit every response to 50 words maximum.',
  "- Wait for the user's response before moving to the next numbered agenda item.",
  '- Do not combine agenda steps unless the user asks you to.',
  '',
  'AGENDA (follow in order, one step per assistant message)',
  '1. Injected greeting: "Hi. What would you like to talk about today?"',
  '2. Agenda handoff: "What feels most important right now?"',
  '3. Validation only: "That sounds like a lot to carry."',
  '4. Emotion probe: "How does this situation make you feel?"',
  '5. CBT probe: "What thoughts come up when you are in this situation?"',
  '6. Link thoughts to emotions: "How do those thoughts affect how you feel?"',
  '',
  'TONE & STYLE',
  'Warm, supportive, non-authoritative, natural language, minimal expert voice, no moral judgment.',
  '',
  'NOTES',
  'Treat user statements as lived experience. Do not diagnose or give advice.',
].join('\n');

export const OpenAIStream = async (
  inputCode: string,
  model: string,
  key: string | undefined,
  messages?: { role: 'user' | 'assistant'; content: string }[],
) => {
  const systemMessage: ChatMessage = { role: 'system', content: SYSTEM_PROMPT };
  const priorMessages: ChatMessage[] = messages && messages.length > 0 ? [...messages] : [];
  const fullMessages: ChatMessage[] = [
    systemMessage,
    ...priorMessages,
    { role: 'user', content: inputCode },
  ];

  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key || process.env.NEXT_PUBLIC_OPENAI_API_KEY}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: fullMessages,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const statusText = res.statusText;
    const result = await res.body?.getReader().read();
    throw new Error(
      `OpenAI API returned an error: ${
        decoder.decode(result?.value) || statusText
      }`,
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          if (data === '[DONE]') {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            const queue = encoder.encode(text);
            controller.enqueue(queue);
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
