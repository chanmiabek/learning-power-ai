import { CourseCard } from '@/components/CourseCard';
import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { useRequireRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/types';
import Link from 'next/link';
import { useEffect, useState } from 'react';

interface Row { course: Course; total: number; done: number }

export default function StudentDashboard() {
  const { profile, profileError, allowed } = useRequireRole(['student', 'instructor', 'admin']);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      setLoadError('');
      const { data: en, error: enrollmentsError } = await supabase
        .from('enrollments').select('courses(*)').eq('student_id', profile.id);
      if (enrollmentsError) throw enrollmentsError;
      const courses = (en ?? []).map((e: any) => e.courses as Course).filter(Boolean);
      const ids = courses.map((c) => c.id);
      const [l, p] = ids.length
        ? await Promise.all([
            supabase.from('lessons').select('id,course_id').in('course_id', ids),
            supabase.from('lesson_progress').select('lesson_id,course_id').eq('student_id', profile.id),
          ])
        : [{ data: [], error: null }, { data: [], error: null }];
      if (l.error) throw l.error;
      if (p.error) throw p.error;
      setRows(
        courses.map((course) => ({
          course,
          total: (l.data ?? []).filter((x: any) => x.course_id === course.id).length,
          done: (p.data ?? []).filter((x: any) => x.course_id === course.id).length,
        })),
      );
    })().catch((error) => {
      setRows(null);
      setLoadError(error instanceof Error ? error.message : 'Could not load your learning dashboard.');
    });
  }, [profile, reloadCount]);

  return (
    <Page title="My learning">
      {profileError ? (
        <p className="text-sm text-red-400">{profileError}</p>
      ) : !allowed || (!rows && !loadError) ? (
        <Loading />
      ) : loadError ? (
        <div className="space-y-3 text-sm text-red-400">
          <p>Could not load your dashboard: {loadError}</p>
          <Button variant="outline" onClick={() => setReloadCount((count) => count + 1)}>Try again</Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome, {profile?.full_name || 'student'}</h1>
              <p className="text-muted-foreground">
                {rows.length} enrolled course{rows.length === 1 ? '' : 's'}
              </p>
            </div>
            <Button asChild><Link href="/courses">Find courses</Link></Button>
          </div>
          {profile?.wants_instructor && profile.role === 'student' && (
            <p className="mb-4 rounded-md border p-3 text-sm text-muted-foreground">
              Your instructor request is waiting for administrator approval.
            </p>
          )}
          {rows.length === 0 ? (
            <p className="text-muted-foreground">You have not enrolled in any course yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map(({ course, total, done }) => (
                <div key={course.id} className="space-y-2">
                  <CourseCard course={course} href={`/learn/${course.id}`} />
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{done}/{total} lessons completed</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Page>
  );
}
