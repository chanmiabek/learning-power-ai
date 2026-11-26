import { APIKeyInput } from '@/components/APIKeyInput';
import { CodeBlock } from '@/components/CodeBlock';
import {
  humanLanguages,
  LanguageSelect,
  programmingLanguages,
} from '@/components/LanguageSelect';
import { ModelSelect } from '@/components/ModelSelect';
import { TextBlock } from '@/components/TextBlock';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { AIProvider, TranslateBody, TranslateMode } from '@/types/types';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const MODES: { id: TranslateMode; label: string }[] = [
  { id: 'code', label: 'Code' },
  { id: 'language', label: 'Human Languages' },
  { id: 'document', label: 'Documents' },
  { id: 'custom', label: 'Custom Instructions' },
];

const DEFAULTS: Record<TranslateMode, [string, string]> = {
  code: ['JavaScript', 'Python'],
  language: ['English', 'Swahili'],
  document: ['English', 'French'],
  custom: ['Any language', 'English'],
};

const PROVIDERS: { id: AIProvider; label: string }[] = [
  { id: 'gemini', label: 'Google Gemini' },
  { id: 'groq', label: 'Groq' },
];

export function Translator() {
  const { session, profile } = useAuth();
  const [mode, setMode] = useState<TranslateMode>('code');
  const [inputLanguage, setInputLanguage] = useState('JavaScript');
  const [outputLanguage, setOutputLanguage] = useState('Python');
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [instructions, setInstructions] = useState('');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [model, setModel] = useState('gemini-4-hydrogen');
  const [loading, setLoading] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
    gemini: '',
    groq: '',
  });
  const apiKey = apiKeys[provider];
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isCode = mode === 'code';
  const langOptions = isCode ? programmingLanguages : humanLanguages;
  const inputIsText = !isCode || inputLanguage === 'Natural Language';
  const outputIsText = !isCode || outputLanguage === 'Natural Language';

  const switchMode = (m: TranslateMode) => {
    setMode(m);
    setInputLanguage(DEFAULTS[m][0]);
    setOutputLanguage(DEFAULTS[m][1]);
    setInputCode('');
    setOutputCode('');
    setHasTranslated(false);
    setError('');
  };

  const handleTranslate = async () => {
    const maxLength = 24000;
    setError('');

    if (mode !== 'custom' && inputLanguage === outputLanguage) {
      setError('Please select different languages.');
      return;
    }
    if (!inputCode) {
      setError('Please enter some input.');
      return;
    }
    if (mode === 'custom' && !instructions.trim()) {
      setError('Please write your custom instructions.');
      return;
    }
    if (inputCode.length > maxLength) {
      setError(`Input is too long (${inputCode.length}/${maxLength} characters).`);
      return;
    }

    setLoading(true);
    setOutputCode('');

    const body: TranslateBody = {
      mode,
      inputLanguage,
      outputLanguage,
      inputCode,
      instructions,
      provider,
      model,
      apiKey,
    };

    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token ?? ''}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      setLoading(false);
      const payload = await response.json().catch(() => null);
      setError(
        payload?.error ||
          (response.status === 401
            ? 'Please sign in to use the translator.'
            : `Something went wrong. Check your ${provider === 'gemini' ? 'Gemini' : 'Groq'} API key and selected model.`),
      );
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let done = false;
    let result = '';

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;
      const chunk = decoder.decode(value);
      result += chunk;
      setOutputCode((prev) => prev + chunk);
    }

    setLoading(false);
    setHasTranslated(true);
    navigator.clipboard?.writeText(result).catch(() => {});

    if (profile) {
      await supabase.from('translations').insert({
        user_id: profile.id,
        mode,
        source: inputLanguage,
        target: outputLanguage,
        input: inputCode,
        output: result,
      });
    }
  };

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError('File is too large (max 2 MB). Supported: text-based files (.txt, .md, .html, .csv, .json, .srt, code).');
      return;
    }
    setInputCode(await file.text());
    setHasTranslated(false);
  };

  useEffect(() => {
    if (hasTranslated) handleTranslate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputLanguage]);

  useEffect(() => {
    localStorage.removeItem('apiKey');
    setApiKeys({
      gemini: localStorage.getItem('geminiApiKey') || '',
      groq: localStorage.getItem('groqApiKey') || '',
    });
  }, []);

  const changeProvider = (nextProvider: AIProvider) => {
    setProvider(nextProvider);
    setModel(
      nextProvider === 'gemini' ? 'gemini-4-hydrogen' : 'openai/gpt-oss-120b',
    );
  };

  return (
    <div className="flex flex-col items-center">
      <div className="flex flex-wrap justify-center gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => switchMode(m.id)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm transition-colors',
              mode === m.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'hover:bg-accent',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="mt-6 text-center text-sm">
        <APIKeyInput
          apiKey={apiKey}
          providerName={provider === 'gemini' ? 'Gemini' : 'Groq'}
          onChange={(v) => {
            setApiKeys((keys) => ({ ...keys, [provider]: v }));
            localStorage.setItem(provider === 'gemini' ? 'geminiApiKey' : 'groqApiKey', v);
          }}
        />
      </div>

      <div className="mt-2 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
        <Select
          className="min-w-0 flex-1 sm:w-[160px] sm:flex-none"
          value={provider}
          onChange={(e) => {
            const value = e.target.value;
            if (value === 'gemini' || value === 'groq') changeProvider(value);
          }}
        >
          {PROVIDERS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
        <ModelSelect provider={provider} model={model} onChange={setModel} />
        <Button className="w-full font-bold sm:w-[140px]" onClick={handleTranslate} disabled={loading}>
          {loading ? 'Translating...' : 'Translate'}
        </Button>
      </div>

      {(mode === 'custom' || mode === 'document' || mode === 'language') && (
        <div className="mt-4 w-full max-w-[1200px]">
          <Textarea
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={
              mode === 'custom'
                ? 'Custom instructions, e.g. "Translate to formal Swahili, keep technical terms in English, and add a short glossary."'
                : 'Optional extra instructions, e.g. "Use a friendly tone."'
            }
          />
        </div>
      )}

      <div className="mt-2 text-center text-xs">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : loading ? (
          'Translating...'
        ) : hasTranslated ? (
          'Output copied to clipboard!'
        ) : (
          'Enter some input and click "Translate"'
        )}
      </div>

      <div className="mt-6 flex w-full max-w-[1200px] flex-col gap-6 lg:flex-row">
        <div className="flex min-w-0 flex-col justify-center space-y-2 lg:w-1/2">
          <div className="flex items-center justify-center gap-2 text-xl font-bold">
            Input
            {mode === 'document' && (
              <>
                <input
                  ref={fileRef}
                  type="file"
                  hidden
                  accept=".txt,.md,.html,.csv,.json,.srt,.xml,.tex,text/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-1 h-4 w-4" /> Upload file
                </Button>
              </>
            )}
          </div>

          {mode !== 'custom' ? (
            <LanguageSelect
              language={inputLanguage}
              options={langOptions}
              onChange={(v) => {
                setInputLanguage(v);
                setHasTranslated(false);
                setInputCode('');
                setOutputCode('');
              }}
            />
          ) : null}

          {inputIsText ? (
            <TextBlock
              text={inputCode}
              editable={!loading}
              onChange={(v) => {
                setInputCode(v);
                setHasTranslated(false);
              }}
            />
          ) : (
            <CodeBlock
              code={inputCode}
              editable={!loading}
              onChange={(v) => {
                setInputCode(v);
                setHasTranslated(false);
              }}
            />
          )}
        </div>

        <div className="flex min-w-0 flex-col justify-center space-y-2 lg:w-1/2">
          <div className="text-center text-xl font-bold">Output</div>

          {mode !== 'custom' ? (
            <LanguageSelect
              language={outputLanguage}
              options={langOptions}
              onChange={(v) => {
                setOutputLanguage(v);
                setOutputCode('');
              }}
            />
          ) : null}

          {outputIsText ? <TextBlock text={outputCode} /> : <CodeBlock code={outputCode} />}
        </div>
      </div>
    </div>
  );
}
