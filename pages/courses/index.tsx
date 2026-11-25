import { CourseCard } from '@/components/CourseCard';
import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/types';
import { useEffect, useState } from 'react';

export default function Courses() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase
      .from('courses')
      .select('*, profiles(full_name)')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setCourses((data as Course[]) ?? []));
  }, []);

  const filtered = (courses ?? []).filter((c) =>
    `${c.title} ${c.category} ${c.description}`.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <Page title="Courses">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">All courses</h1>
        <Input className="sm:w-72" placeholder="Search courses..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {!courses ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground">No courses found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </Page>
  );
}
