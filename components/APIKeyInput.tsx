import { Input } from '@/components/ui/input';

interface Props {
  apiKey: string;
  onChange: (apiKey: string) => void;
}

export const APIKeyInput: React.FC<Props> = ({ apiKey, onChange }) => (
  <Input
    className="w-[280px]"
    type="password"
    placeholder="OpenAI API Key (optional if set on server)"
    value={apiKey}
    onChange={(e) => onChange(e.target.value)}
  />
);
