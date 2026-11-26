import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRequireRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { BUCKET, uploadFile } from '@/lib/storage';
import { formatBytes } from '@/lib/utils';
import { Course, Lesson, Material } from '@/types/types';
import { FileText, Trash2, Upload } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function EditCourse() {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { profile, allowed } = useRequireRole(['instructor', 'admin']);
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [lesson, setLesson] = useState({ title: '', video_url: '', body: '' });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [c, l, m] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('lessons').select('*').eq('course_id', id).order('position'),
      supabase.from('materials').select('*').eq('course_id', id).order('created_at'),
    ]);
    setCourse(c.data as Course | null);
    setLessons((l.data as Lesson[]) ?? []);
    setMaterials((m.data as Material[]) ?? []);
  }, [id]);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const saveCourse = async () => {
    if (!course) return;
    const { error } = await supabase.from('courses').update({
      title: course.title, description: course.description, category: course.category,
      level: course.level, thumbnail_url: course.thumbnail_url || null, is_published: course.is_published,
    }).eq('id', course.id);
    setMsg(error ? error.message : 'Saved.');
  };

  const deleteCourse = async () => {
    if (!course || !confirm('Delete this course and all its lessons?')) return;
    await supabase.from('courses').delete().eq('id', course.id);
    router.push('/dashboard/instructor');
  };

  const addLesson = async () => {
    if (!course || !profile || !lesson.title) return;
    setBusy('lesson');
    try {
      let video_url = lesson.video_url || null;
      if (videoFile) video_url = (await uploadFile(profile.id, course.id, videoFile)).url;
      const { error } = await supabase.from('lessons').insert({
        course_id: course.id, title: lesson.title, video_url, body: lesson.body, position: lessons.length,
      });
      if (error) throw error;
      setLesson({ title: '', video_url: '', body: '' });
      setVideoFile(null);
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy('');
  };

  const deleteLesson = async (l: Lesson) => {
    await supabase.from('lessons').delete().eq('id', l.id);
    load();
  };

  const uploadMaterials = async (files: FileList | null) => {
    if (!files || !course || !profile) return;
    setBusy('material');
    try {
      for (const f of Array.from(files)) {
        const { path, url } = await uploadFile(profile.id, course.id, f);
        const { error } = await supabase.from('materials').insert({
          course_id: course.id, title: f.name, file_path: path, file_url: url,
          file_type: f.type || null, file_size: f.size,
        });
        if (error) throw error;
      }
      await load();
    } catch (e: any) {
      setMsg(e.message);
    }
    setBusy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const deleteMaterial = async (m: Material) => {
    await supabase.storage.from(BUCKET).remove([m.file_path]);
    await supabase.from('materials').delete().eq('id', m.id);
    load();
  };

  return (
    <Page title="Edit course">
      {!allowed || !course ? (
        <Loading />
      ) : (
        <div className="grid min-w-0 gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader className="flex-wrap items-center justify-between gap-2 space-y-0">
              <CardTitle className="min-w-0 break-words">Course details</CardTitle>
              <Badge variant={course.is_published ? 'default' : 'secondary'}>{course.is_published ? 'Published' : 'Draft'}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1"><Label>Title</Label>
                <Input value={course.title} onChange={(e) => setCourse({ ...course, title: e.target.value })} /></div>
              <div className="space-y-1"><Label>Description</Label>
                <Textarea rows={5} value={course.description ?? ''} onChange={(e) => setCourse({ ...course, description: e.target.value })} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label>Category</Label>
                  <Input value={course.category ?? ''} onChange={(e) => setCourse({ ...course, category: e.target.value })} /></div>
                <div className="space-y-1"><Label>Level</Label>
                  <Input value={course.level ?? ''} onChange={(e) => setCourse({ ...course, level: e.target.value })} /></div>
              </div>
              <div className="space-y-1"><Label>Thumbnail URL</Label>
                <Input value={course.thumbnail_url ?? ''} onChange={(e) => setCourse({ ...course, thumbnail_url: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={course.is_published} onChange={(e) => setCourse({ ...course, is_published: e.target.checked })} />
                Publish (visible to all students)
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveCourse}>Save</Button>
                <Button asChild variant="outline"><Link href={`/courses/${course.id}`}>View page</Link></Button>
                <Button variant="destructive" onClick={deleteCourse}>Delete</Button>
              </div>
              {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Learning materials</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <input ref={fileRef} type="file" multiple hidden onChange={(e) => uploadMaterials(e.target.files)} />
              <Button className="h-auto min-h-10 max-w-full whitespace-normal py-2 text-left" variant="outline" disabled={busy === 'material'} onClick={() => fileRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" /> {busy === 'material' ? 'Uploading...' : 'Upload PDFs, documents, videos...'}
              </Button>
              {materials.map((m) => (
                <div key={m.id} className="flex min-w-0 items-center gap-2 rounded-md border p-2 text-sm">
                  <FileText className="h-4 w-4 shrink-0" />
                  <a href={m.file_url} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate hover:underline">{m.title}</a>
                  <span className="ml-auto text-xs text-muted-foreground">{formatBytes(m.file_size)}</span>
                  <Button size="icon" variant="ghost" onClick={() => deleteMaterial(m)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader><CardTitle>Lessons ({lessons.length})</CardTitle></CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                {lessons.map((l, i) => (
                  <div key={l.id} className="flex min-w-0 items-center gap-2 rounded-md border p-2 text-sm">
                    <span className="min-w-0 flex-1 break-words">{i + 1}. {l.title}</span>
                    {l.video_url && <Badge variant="secondary">video</Badge>}
                    <Button className="ml-auto" size="icon" variant="ghost" onClick={() => deleteLesson(l)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Lesson title</Label>
                  <Input value={lesson.title} onChange={(e) => setLesson({ ...lesson, title: e.target.value })} /></div>
                <div className="space-y-1"><Label>Video link (YouTube, Vimeo or direct URL)</Label>
                  <Input value={lesson.video_url} onChange={(e) => setLesson({ ...lesson, video_url: e.target.value })} /></div>
                <div className="space-y-1"><Label>...or upload a video file</Label>
                  <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)} /></div>
                <div className="space-y-1"><Label>Lesson text</Label>
                  <Textarea rows={4} value={lesson.body} onChange={(e) => setLesson({ ...lesson, body: e.target.value })} /></div>
                <Button onClick={addLesson} disabled={busy === 'lesson' || !lesson.title}>
                  {busy === 'lesson' ? 'Adding...' : 'Add lesson'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Page>
  );
}
