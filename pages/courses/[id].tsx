import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/types';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';

export default function CourseDetail() {
  const router = useRouter();
  const id = router.query.id as string | undefined;
  const { session, profile } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const { data } = await supabase.from('courses').select('*, profiles(full_name)').eq('id', id).single();
    setCourse(data as Course | null);
    if (session) {
      const { data: e } = await supabase
        .from('enrollments').select('id').eq('course_id', id).eq('student_id', session.user.id).maybeSingle();
      setEnrolled(!!e);
    }
    setLoaded(true);
  }, [id, session]);

  useEffect(() => { load(); }, [load]);

  const enroll = async () => {
    if (!session) return router.push(`/login?next=/courses/${id}`);
    setBusy(true);
    await supabase.from('enrollments').insert({ course_id: id, student_id: session.user.id });
    setBusy(false);
    router.push(`/learn/${id}`);
  };

  const canManage = profile && course && (profile.role === 'admin' || course.instructor_id === profile.id);

  return (
    <Page title={course?.title ?? 'Course'}>
      {!loaded ? (
        <Loading />
      ) : !course ? (
        <p className="text-muted-foreground">Course not found.</p>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="flex flex-wrap gap-2">
            {course.category && <Badge variant="secondary">{course.category}</Badge>}
            {course.level && <Badge variant="outline">{course.level}</Badge>}
            {!course.is_published && <Badge variant="destructive">Draft</Badge>}
          </div>
          <h1 className="text-4xl font-bold">{course.title}</h1>
          <p className="text-sm text-muted-foreground">By {course.profiles?.full_name || 'Instructor'}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {course.thumbnail_url && <img src={course.thumbnail_url} alt="" className="w-full rounded-lg" />}
          <p className="whitespace-pre-wrap">{course.description}</p>
          <div className="flex gap-2">
            {enrolled || canManage ? (
              <Button asChild><Link href={`/learn/${course.id}`}>{enrolled ? 'Continue learning' : 'Preview course'}</Link></Button>
            ) : (
              <Button onClick={enroll} disabled={busy || !course.is_published}>Enroll for free</Button>
            )}
            {canManage && (
              <Button asChild variant="outline"><Link href={`/dashboard/instructor/${course.id}`}>Edit course</Link></Button>
            )}
          </div>
        </div>
      )}
    </Page>
  );
}
