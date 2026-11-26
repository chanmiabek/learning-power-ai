import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useRequireRole } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { Course, Profile, Role } from '@/types/types';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

type Tab = 'overview' | 'users' | 'courses' | 'settings';
type Settings = Record<string, any>;

const SETTING_LABELS: Record<string, string> = {
  allow_registration: 'Allow new registrations',
  allow_instructor_requests: 'Allow instructor access requests',
  translator_enabled: 'Enable the AI Translator',
};

export default function AdminDashboard() {
  const { allowed, profile: me, profileError } = useRequireRole(['admin']);
  const [tab, setTab] = useState<Tab>('overview');
  const [users, setUsers] = useState<Profile[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState(0);
  const [settings, setSettings] = useState<Settings>({});
  const [q, setQ] = useState('');
  const [ready, setReady] = useState(false);
  const [dataError, setDataError] = useState('');

  const load = useCallback(async () => {
    setReady(false);
    setDataError('');
    try {
      const [u, c, e, s] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('courses').select('*, profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('enrollments').select('id', { count: 'exact', head: true }),
        supabase.from('platform_settings').select('*'),
      ]);
      const failed = [u, c, e, s].find((result) => result.error);
      if (failed?.error) throw failed.error;

      setUsers((u.data as Profile[]) ?? []);
      setCourses((c.data as Course[]) ?? []);
      setEnrollments(e.count ?? 0);
      setSettings(Object.fromEntries((s.data ?? []).map((r: any) => [r.key, r.value])));
    } catch (error) {
      setDataError(error instanceof Error ? error.message : 'Could not load dashboard data.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => { if (allowed) load(); }, [allowed, load]);

  const updateUser = async (id: string, patch: Partial<Profile>) => {
    await supabase.from('profiles').update(patch).eq('id', id);
    load();
  };
  const updateCourse = async (id: string, patch: Partial<Course>) => {
    await supabase.from('courses').update(patch).eq('id', id);
    load();
  };
  const deleteCourse = async (id: string) => {
    if (!confirm('Delete this course?')) return;
    await supabase.from('courses').delete().eq('id', id);
    load();
  };
  const setSetting = async (key: string, value: any) => {
    await supabase.from('platform_settings').upsert({ key, value });
    setSettings((s) => ({ ...s, [key]: value }));
  };

  const pending = users.filter((u) => u.wants_instructor && u.role === 'student');
  const shown = users.filter((u) => `${u.full_name} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const stats = [
    { label: 'Users', value: users.length },
    { label: 'Instructors', value: users.filter((u) => u.role === 'instructor').length },
    { label: 'Courses', value: courses.length },
    { label: 'Enrollments', value: enrollments },
  ];

  return (
    <Page title="Super admin">
      {profileError ? (
        <p className="text-sm text-red-400">{profileError}</p>
      ) : !allowed || !ready ? (
        <Loading />
      ) : dataError ? (
        <div className="space-y-3 text-sm text-red-400">
          <p>Could not load the dashboard: {dataError}</p>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      ) : (
        <>
          <h1 className="mb-4 text-2xl font-bold sm:text-3xl">Super Admin Dashboard</h1>
          <div className="mb-6 flex flex-wrap gap-2">
            {(['overview', 'users', 'courses', 'settings'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('rounded-full border px-4 py-1.5 text-sm capitalize', tab === t ? 'border-primary bg-primary' : 'hover:bg-accent')}>
                {t}{t === 'users' && pending.length > 0 ? ` (${pending.length} pending)` : ''}
              </button>
            ))}
          </div>

          {tab === 'overview' && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stats.map((s) => (
                <Card key={s.label}>
                  <CardHeader><CardTitle className="text-sm text-muted-foreground">{s.label}</CardTitle></CardHeader>
                  <CardContent className="text-4xl font-bold">{s.value}</CardContent>
                </Card>
              ))}
            </div>
          )}

          {tab === 'users' && (
            <div className="space-y-3">
              <Input className="w-full sm:max-w-sm" placeholder="Search users..." value={q} onChange={(e) => setQ(e.target.value)} />
              {shown.map((u) => (
                <Card key={u.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1 sm:min-w-[200px]">
                      <div className="break-words font-medium">{u.full_name || 'No name'}</div>
                      <div className="break-all text-sm text-muted-foreground">{u.email}</div>
                    </div>
                    {u.wants_instructor && u.role === 'student' && (
                      <>
                        <Badge variant="outline">Instructor request</Badge>
                        <Button size="sm" onClick={() => updateUser(u.id, { role: 'instructor', wants_instructor: false })}>Approve</Button>
                      </>
                    )}
                    <Select className="w-full sm:w-36" value={u.role} disabled={u.id === me?.id}
                      onChange={(e) => updateUser(u.id, { role: e.target.value as Role })}>
                      <option value="student">Student</option>
                      <option value="instructor">Instructor</option>
                      <option value="admin">Admin</option>
                    </Select>
                    <Button size="sm" variant={u.is_active ? 'outline' : 'default'} disabled={u.id === me?.id}
                      onClick={() => updateUser(u.id, { is_active: !u.is_active })}>
                      {u.is_active ? 'Suspend' : 'Reactivate'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {tab === 'courses' && (
            <div className="space-y-3">
              <div className="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
                <p className="text-sm text-muted-foreground">Manage courses across the platform.</p>
                <Button asChild>
                  <Link href="/dashboard/instructor#new-course">Create course</Link>
                </Button>
              </div>
              {courses.map((c) => (
                <Card key={c.id}>
                  <CardContent className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1 sm:min-w-[200px]">
                      <Link href={`/dashboard/instructor/${c.id}`} className="break-words font-medium hover:underline">{c.title}</Link>
                      <div className="text-sm text-muted-foreground">by {c.profiles?.full_name || 'Admin'} · {c.category}</div>
                    </div>
                    <Badge variant={c.is_published ? 'default' : 'secondary'}>{c.is_published ? 'Published' : 'Draft'}</Badge>
                    <Button size="sm" variant="outline" onClick={() => updateCourse(c.id, { is_published: !c.is_published })}>
                      {c.is_published ? 'Unpublish' : 'Publish'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteCourse(c.id)}>Delete</Button>
                  </CardContent>
                </Card>
              ))}
              {courses.length === 0 && <p className="text-muted-foreground">No courses yet.</p>}
            </div>
          )}

          {tab === 'settings' && (
            <Card className="max-w-xl">
              <CardHeader><CardTitle>Platform settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(SETTING_LABELS).map(([key, label]) => (
                  <label key={key} className="flex items-start justify-between gap-4 text-sm">
                    {label}
                    <input type="checkbox" checked={settings[key] === true} onChange={(e) => setSetting(key, e.target.checked)} />
                  </label>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Page>
  );
}
