import { TranslateMode } from '@/types/types';
import endent from 'endent';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

interface PromptArgs {
  mode: TranslateMode;
  inputLanguage: string;
  outputLanguage: string;
  inputCode: string;
  instructions?: string;
}

export class OpenAIRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'OpenAIRequestError';
  }
}

export const createPrompt = ({
  mode,
  inputLanguage,
  outputLanguage,
  inputCode,
  instructions,
}: PromptArgs) => {
  const extra = instructions?.trim()
    ? `\n\nAdditional instructions from the user (follow them carefully):\n${instructions.trim()}`
    : '';

  if (mode === 'language') {
    return endent`
      You are a professional human translator. Translate the text from ${inputLanguage} to ${outputLanguage}.
      Preserve meaning, tone, formatting and line breaks. Return only the translation.${extra}

      Text:
      ${inputCode}

      ${outputLanguage} translation:
    `;
  }

  if (mode === 'document') {
    return endent`
      You are a professional document translator. Translate the document from ${inputLanguage} to ${outputLanguage}.
      Keep the structure exactly: headings, lists, tables, Markdown/HTML tags, numbers and proper nouns.
      Return only the translated document.${extra}

      Document:
      ${inputCode}

      Translated document:
    `;
  }

  if (mode === 'custom') {
    return endent`
      You are an expert translator and writer. Follow the user's custom instructions exactly and apply them to the input.
      Source language: ${inputLanguage}. Target language: ${outputLanguage}. Return only the result.${extra}

      Input:
      ${inputCode}

      Result:
    `;
  }

  // mode === 'code'
  if (inputLanguage === 'Natural Language') {
    return endent`
      You are an expert programmer in all programming languages. Translate the natural language to "${outputLanguage}" code. Do not include \`\`\`.${extra}

      Example translating from natural language to JavaScript:

      Natural language:
      Print the numbers 0 to 9.

      JavaScript code:
      for (let i = 0; i < 10; i++) {
        console.log(i);
      }

      Natural language:
      ${inputCode}

      ${outputLanguage} code (no \`\`\`):
    `;
  }

  if (outputLanguage === 'Natural Language') {
    return endent`
      You are an expert programmer in all programming languages. Translate the "${inputLanguage}" code to natural language in plain English that the average adult could understand. Respond as bullet points starting with -.${extra}

      Example translating from JavaScript to natural language:

      JavaScript code:
      for (let i = 0; i < 10; i++) {
        console.log(i);
      }

      Natural language:
      - Print the numbers 0 to 9.

      ${inputLanguage} code:
      ${inputCode}

      Natural language:
    `;
  }

  return endent`
    You are an expert programmer in all programming languages. Translate the "${inputLanguage}" code to "${outputLanguage}" code. Do not include \`\`\`.${extra}

    Example translating from JavaScript to Python:

    JavaScript code:
    for (let i = 0; i < 10; i++) {
      console.log(i);
    }

    Python code:
    for i in range(10):
      print(i)

    ${inputLanguage} code:
    ${inputCode}

    ${outputLanguage} code (no \`\`\`):
  `;
};

export const OpenAIStream = async (args: PromptArgs, model: string, key: string) => {
  const prompt = createPrompt(args);
  const system = { role: 'system', content: prompt };
  const apiKey = key || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new OpenAIRequestError('No OpenAI API key is configured.', 503, 'missing_api_key');
  }

  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    method: 'POST',
    body: JSON.stringify({
      model,
      messages: [system],
      temperature: 0,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const payload = await res.json().catch(() => null);
    const error = payload?.error;
    throw new OpenAIRequestError(
      typeof error?.message === 'string' ? error.message : res.statusText,
      res.status,
      typeof error?.code === 'string' ? error.code : undefined,
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
            const text = json.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
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
