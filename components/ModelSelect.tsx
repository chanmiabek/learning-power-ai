import { Select } from '@/components/ui/select';
import { AIProvider } from '@/types/types';
import { FC } from 'react';

interface Props {
  provider: AIProvider;
  model: string;
  onChange: (model: string) => void;
}

const MODELS: Record<AIProvider, { id: string; label: string }[]> = {
  gemini: [
    { id: 'gemini-4-hydrogen', label: 'Gemini 4 Hydrogen' },
    { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
  ],
  groq: [
    { id: 'openai/gpt-oss-120b', label: 'GPT OSS 120B' },
    { id: 'openai/gpt-oss-20b', label: 'GPT OSS 20B' },
  ],
};

export const ModelSelect: FC<Props> = ({ provider, model, onChange }) => (
  <Select className="min-w-0 flex-1 sm:w-[160px] sm:flex-none" value={model} onChange={(e) => onChange(e.target.value)}>
    {MODELS[provider].map((option) => (
      <option key={option.id} value={option.id}>
        {option.label}
      </option>
    ))}
  </Select>
);
