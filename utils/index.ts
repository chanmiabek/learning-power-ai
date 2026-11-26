import { AIProvider, TranslateMode } from '@/types/types';
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

export class AIRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AIRequestError';
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

const PROVIDER_CONFIG: Record<AIProvider, { baseUrl: string; label: string }> = {
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    label: 'Gemini',
  },
  groq: {
    baseUrl: 'https://api.groq.com/openai/v1',
    label: 'Groq',
  },
};

export const AIStream = async (
  args: PromptArgs,
  provider: AIProvider,
  model: string,
  key: string,
) => {
  const prompt = createPrompt(args);
  const config = PROVIDER_CONFIG[provider];
  const serverKey = provider === 'gemini' ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
  const apiKey = key || serverKey;

  if (!apiKey) {
    throw new AIRequestError(`No ${config.label} API key is configured.`, 503, 'missing_api_key');
  }

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/chat/completions`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      method: 'POST',
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        stream: true,
      }),
    });
  } catch {
    throw new AIRequestError(
      `Could not connect to ${config.label}. Check that the server can reach the provider over HTTPS, then try again.`,
      503,
      'provider_unreachable',
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const payload = await res.json().catch(() => null);
    const error = payload?.error;
    throw new AIRequestError(
      typeof error?.message === 'string' ? error.message : res.statusText,
      res.status,
      typeof error?.code === 'string' ? error.code : undefined,
    );
  }

  const responseBody = res.body;
  if (!responseBody) {
    throw new AIRequestError('The AI provider returned an empty response.', 502);
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
      const reader = responseBody.getReader();

      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          parser.feed(decoder.decode(value, { stream: true }));
        }
      } finally {
        reader.releaseLock();
      }
    },
  });

  return stream;
};
