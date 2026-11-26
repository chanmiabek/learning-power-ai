import { CourseCard } from '@/components/CourseCard';
import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useRequireRole } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Course } from '@/types/types';
import { useRouter } from 'next/router';
import { FormEvent, useCallback, useEffect, useState } from 'react';

export default function InstructorDashboard() {
  const { profile, profileError, allowed } = useRequireRole(['instructor', 'admin']);
  const router = useRouter();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [form, setForm] = useState({ title: '', description: '', category: '', level: 'Beginner', thumbnail_url: '' });
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    setLoadError('');
    try {
      const { data, error: queryError } = await supabase.from('courses').select('*').eq('instructor_id', profile.id).order('created_at', { ascending: false });
      if (queryError) throw queryError;
      setCourses((data as Course[]) ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load your courses.');
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  const courseList = courses ?? [];

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const { data, error } = await supabase
      .from('courses')
      .insert({ ...form, category: form.category || 'General', thumbnail_url: form.thumbnail_url || null, instructor_id: profile.id })
      .select()
      .single();
    if (error) return setError(error.message);
    router.push(`/dashboard/instructor/${data.id}`);
  };

  return (
    <Page title="Instructor dashboard">
      {profileError ? (
        <p className="text-sm text-red-400">{profileError}</p>
      ) : !allowed || (!courses && !loadError) ? (
        <Loading />
      ) : loadError ? (
        <div className="space-y-3 text-sm text-red-400">
          <p>Could not load your courses: {loadError}</p>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div>
            <h1 className="mb-4 text-3xl font-bold">My courses</h1>
            {courseList.length === 0 ? (
              <p className="text-muted-foreground">No courses yet. Create your first one.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {courseList.map((c) => (
                  <CourseCard key={c.id} course={c} href={`/dashboard/instructor/${c.id}`} />
                ))}
              </div>
            )}
          </div>
          <Card id="new-course" className="h-fit">
            <CardHeader><CardTitle>New course</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={create} className="space-y-3">
                <div className="space-y-1"><Label>Title</Label>
                  <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="space-y-1"><Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div className="space-y-1"><Label>Category (any topic)</Label>
                  <Input placeholder="e.g. Programming, Languages, Business" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div className="space-y-1"><Label>Level</Label>
                  <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
                    <option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>All levels</option>
                  </Select></div>
                <div className="space-y-1"><Label>Thumbnail URL (optional)</Label>
                  <Input value={form.thumbnail_url} onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })} /></div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <Button className="w-full">Create course</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </Page>
  );
}
