import { Select } from '@/components/ui/select';
import { OpenAIModel } from '@/types/types';
import { FC } from 'react';

interface Props {
  model: OpenAIModel;
  onChange: (model: OpenAIModel) => void;
}

export const ModelSelect: FC<Props> = ({ model, onChange }) => (
  <Select className="w-[160px]" value={model} onChange={(e) => onChange(e.target.value)}>
    <option value="gpt-4o-mini">GPT-4o mini</option>
    <option value="gpt-4o">GPT-4o</option>
    <option value="gpt-4-turbo">GPT-4 Turbo</option>
    <option value="gpt-3.5-turbo">GPT-3.5</option>
  </Select>
);
