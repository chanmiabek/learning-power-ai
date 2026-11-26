interface Props {
  text: string;
  editable?: boolean;
  onChange?: (value: string) => void;
}

export const TextBlock: React.FC<Props> = ({ text, editable = false, onChange = () => {} }) => (
  <textarea
    className="min-h-[320px] w-full rounded-md bg-[#1A1B26] p-3 text-sm text-neutral-200 focus:outline-none sm:min-h-[500px] sm:p-4 sm:text-[15px]"
    style={{ resize: 'none' }}
    value={text}
    onChange={(e) => onChange(e.target.value)}
    disabled={!editable}
  />
);
