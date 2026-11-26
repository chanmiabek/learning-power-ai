import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { formatBytes, toEmbedUrl } from '@/lib/utils';
import { Course, Lesson, Material } from '@/types/types';
import { CheckCircle2, Circle, FileText } from 'lucide-react';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

export default function Learn() {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { session, loading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [current, setCurrent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!id || !session) return;
    const [c, l, m, p] = await Promise.all([
      supabase.from('courses').select('*').eq('id', id).single(),
      supabase.from('lessons').select('*').eq('course_id', id).order('position'),
      supabase.from('materials').select('*').eq('course_id', id).order('created_at'),
      supabase.from('lesson_progress').select('lesson_id').eq('course_id', id).eq('student_id', session.user.id),
    ]);
    setCourse(c.data as Course | null);
    const ls = (l.data as Lesson[]) ?? [];
    setLessons(ls);
    setMaterials((m.data as Material[]) ?? []);
    setDone(new Set((p.data ?? []).map((r: any) => r.lesson_id)));
    setCurrent((cur) => cur ?? ls[0]?.id ?? null);
    setReady(true);
  }, [id, session]);

  useEffect(() => {
    if (!loading && !session) router.replace(`/login?next=/learn/${id}`);
    else load();
  }, [loading, session, load, router, id]);

  const lesson = lessons.find((l) => l.id === current);
  const pct = lessons.length ? Math.round((done.size / lessons.length) * 100) : 0;

  const toggle = async (l: Lesson) => {
    if (!session) return;
    if (done.has(l.id)) {
      await supabase.from('lesson_progress').delete().eq('lesson_id', l.id).eq('student_id', session.user.id);
    } else {
      await supabase.from('lesson_progress').insert({ lesson_id: l.id, course_id: l.course_id, student_id: session.user.id });
    }
    load();
  };

  const embed = lesson?.video_url ? toEmbedUrl(lesson.video_url) : null;

  return (
    <Page title={course?.title ?? 'Learn'} wide>
      {!ready ? (
        <Loading />
      ) : !course ? (
        <p className="text-center text-muted-foreground">You do not have access to this course. Enroll first.</p>
      ) : (
        <div className="mx-auto grid max-w-[1200px] gap-6 lg:grid-cols-[320px_1fr]">
          <Card className="h-fit min-w-0 lg:sticky lg:top-20">
            <CardHeader>
              <CardTitle className="break-words">{course.title}</CardTitle>
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">{pct}% complete</p>
            </CardHeader>
            <CardContent className="max-h-[45vh] space-y-1 overflow-y-auto lg:max-h-[calc(100vh-15rem)]">
              {lessons.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setCurrent(l.id)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent ${current === l.id ? 'bg-accent' : ''}`}
                >
                  {done.has(l.id) ? <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" /> : <Circle className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0 break-words">{i + 1}. {l.title}</span>
                </button>
              ))}
              {lessons.length === 0 && <p className="text-sm text-muted-foreground">No lessons yet.</p>}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {lesson && (
              <>
                <h2 className="text-2xl font-bold">{lesson.title}</h2>
                {lesson.video_url &&
                  (embed ? (
                    <iframe src={embed} className="aspect-video w-full rounded-lg" allowFullScreen title={lesson.title} />
                  ) : (
                    <video src={lesson.video_url} controls className="aspect-video w-full rounded-lg bg-black" />
                  ))}
                {lesson.body && <p className="whitespace-pre-wrap">{lesson.body}</p>}
                <Button variant={done.has(lesson.id) ? 'outline' : 'default'} onClick={() => toggle(lesson)}>
                  {done.has(lesson.id) ? 'Mark as not complete' : 'Mark as complete'}
                </Button>
              </>
            )}

            <Card>
              <CardHeader><CardTitle>Learning materials</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {materials.length === 0 && <p className="text-sm text-muted-foreground">No materials uploaded.</p>}
                {materials.map((m) => (
                  <a key={m.id} href={m.file_url} target="_blank" rel="noreferrer"
                     className="flex items-center gap-2 rounded-md border p-3 text-sm hover:bg-accent">
                    <FileText className="h-4 w-4" /> {m.title}
                    <span className="ml-auto text-xs text-muted-foreground">{formatBytes(m.file_size)}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}
