import { TranslateBody } from '@/types/types';
import { OpenAIRequestError, OpenAIStream } from '@/utils';

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

    const { mode, inputLanguage, outputLanguage, inputCode, instructions, model, apiKey } =
      (await req.json()) as TranslateBody;

    const stream = await OpenAIStream(
      { mode, inputLanguage, outputLanguage, inputCode, instructions },
      model,
      apiKey,
    );

    return new Response(stream);
  } catch (error) {
    if (error instanceof OpenAIRequestError) {
      if (error.code === 'insufficient_quota' || error.code === 'credit_balance_exhausted') {
        return Response.json(
          {
            error:
              'The OpenAI API key being used has no credits remaining. Add API billing/credits to that OpenAI account, or enter a funded API key above.',
          },
          { status: 402 },
        );
      }

      if (error.code === 'missing_api_key') {
        return Response.json({ error: error.message }, { status: 503 });
      }

      console.error(`OpenAI request failed (${error.status}): ${error.message}`);
      return Response.json(
        { error: 'The OpenAI request failed. Check the API key and selected model.' },
        { status: error.status === 401 ? 401 : 502 },
      );
    }

    console.error(error);
    return Response.json({ error: 'Translation failed. Please try again.' }, { status: 500 });
  }
};

export default handler;
