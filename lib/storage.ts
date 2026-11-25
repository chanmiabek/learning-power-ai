import { supabase } from '@/lib/supabase';

export const BUCKET = 'course-materials';

export async function uploadFile(userId: string, courseId: string, file: File) {
  const safe = file.name.replace(/[^\w.\-]+/g, '_');
  const path = `${userId}/${courseId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}
