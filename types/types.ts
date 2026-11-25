export type Role = 'student' | 'instructor' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  wants_instructor: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  instructor_id: string;
  title: string;
  description: string | null;
  category: string | null;
  level: string | null;
  thumbnail_url: string | null;
  is_published: boolean;
  created_at: string;
  profiles?: { full_name: string | null } | null;
}

export interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url: string | null;
  body: string | null;
  position: number;
}

export interface Material {
  id: string;
  course_id: string;
  lesson_id: string | null;
  title: string;
  file_path: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
}

export type OpenAIModel = string;

export type TranslateMode = 'code' | 'language' | 'document' | 'custom';

export interface TranslateBody {
  mode: TranslateMode;
  inputLanguage: string;
  outputLanguage: string;
  inputCode: string;
  instructions?: string;
  model: OpenAIModel;
  apiKey: string;
}
