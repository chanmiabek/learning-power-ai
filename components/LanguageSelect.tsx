import { Select } from '@/components/ui/select';
import type { FC } from 'react';

interface Props {
  language: string;
  onChange: (language: string) => void;
  options?: string[];
}

export const LanguageSelect: FC<Props> = ({
  language,
  onChange,
  options = programmingLanguages,
}) => (
  <Select value={language} onChange={(e) => onChange(e.target.value)}>
    {[...options]
      .sort((a, b) => a.localeCompare(b))
      .map((l) => (
        <option key={l} value={l}>
          {l}
        </option>
      ))}
  </Select>
);

export const programmingLanguages = [
  'Pascal', 'JavaScript', 'TypeScript', 'Python', 'TSX', 'JSX', 'Vue', 'Go',
  'C', 'C++', 'Java', 'C#', 'Visual Basic .NET', 'SQL', 'Assembly Language',
  'PHP', 'Ruby', 'Swift', 'SwiftUI', 'Kotlin', 'R', 'Objective-C', 'Perl',
  'SAS', 'Scala', 'Dart', 'Rust', 'Haskell', 'Lua', 'Groovy', 'Elixir',
  'Clojure', 'Lisp', 'Julia', 'Matlab', 'Fortran', 'COBOL', 'Bash',
  'Powershell', 'PL/SQL', 'CSS', 'Racket', 'HTML', 'NoSQL', 'CoffeeScript',
  'Natural Language',
];

export const humanLanguages = [
  'English', 'Swahili', 'French', 'Spanish', 'Portuguese', 'German', 'Italian',
  'Dutch', 'Arabic', 'Hebrew', 'Turkish', 'Russian', 'Ukrainian', 'Polish',
  'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean',
  'Hindi', 'Bengali', 'Urdu', 'Indonesian', 'Vietnamese', 'Thai', 'Amharic',
  'Somali', 'Yoruba', 'Zulu', 'Hausa', 'Greek', 'Swedish', 'Norwegian',
  'Danish', 'Finnish', 'Czech', 'Romanian', 'Hungarian', 'Persian', 'Tamil',
];
