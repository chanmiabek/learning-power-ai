import { TranslateBody } from '@/types/types';
import { AIRequestError, AIStream } from '@/utils';

export const config = {
  runtime: 'edge',
};

/** Verifies the Supabase access token so only signed-in users can translate. */
async function isAuthenticated(req: Request) {
  const token = req.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!token || !supabaseUrl || !supabaseKey) return false;

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseKey,
    },
  });
  return res.ok;
}

const handler = async (req: Request): Promise<Response> => {
  try {
    if (!(await isAuthenticated(req))) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { mode, inputLanguage, outputLanguage, inputCode, instructions, provider, model, apiKey } =
      (await req.json()) as TranslateBody;

    if (provider !== 'gemini' && provider !== 'groq') {
      return Response.json({ error: 'Select a supported AI provider.' }, { status: 400 });
    }

    const stream = await AIStream(
      { mode, inputLanguage, outputLanguage, inputCode, instructions },
      provider,
      model,
      apiKey,
    );

    return new Response(stream);
  } catch (error) {
    if (error instanceof AIRequestError) {
      if (error.code === 'insufficient_quota' || error.code === 'credit_balance_exhausted') {
        return Response.json(
          {
            error:
              'The selected provider API key has no credits remaining. Add billing/credits to that provider account, or enter a funded API key above.',
          },
          { status: 402 },
        );
      }

      if (error.code === 'missing_api_key') {
        return Response.json({ error: error.message }, { status: 503 });
      }

      if (error.code === 'provider_unreachable') {
        console.error(`${error.message} (${error.status})`);
        return Response.json({ error: error.message }, { status: 503 });
      }

      console.error(`AI provider request failed (${error.status}): ${error.message}`);
      return Response.json(
        {
          error:
            error.status === 503
              ? 'The AI provider is temporarily unavailable. Please try again shortly.'
              : 'The AI provider request failed. Check the API key and selected model.',
        },
        { status: error.status === 401 ? 401 : error.status === 503 ? 503 : 502 },
      );
    }

    console.error(error);
    return Response.json({ error: 'Translation failed. Please try again.' }, { status: 500 });
  }
};

export default handler;
