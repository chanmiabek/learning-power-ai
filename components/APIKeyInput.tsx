import { Input } from '@/components/ui/input';

interface Props {
  apiKey: string;
  providerName: string;
  onChange: (apiKey: string) => void;
}

export const APIKeyInput: React.FC<Props> = ({ apiKey, providerName, onChange }) => (
  <Input
    className="w-full max-w-[280px]"
    type="password"
    placeholder={`${providerName} API key (optional if set on server)`}
    value={apiKey}
    onChange={(e) => onChange(e.target.value)}
  />
);
