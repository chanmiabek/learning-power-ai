import { Loading } from '@/components/layout/Loading';
import { dashboardPath, useAuth } from '@/lib/auth';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export default function DashboardRedirect() {
  const { profile, profileError, session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) router.replace('/login');
    else if (profile) router.replace(dashboardPath(profile.role));
  }, [loading, session, profile, router]);

  if (profileError) {
    return <p className="container py-10 text-sm text-red-400">{profileError}</p>;
  }

  return <Loading />;
}
