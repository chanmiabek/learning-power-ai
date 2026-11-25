import { Button } from '@/components/ui/button';
import { dashboardPath, useAuth } from '@/lib/auth';
import { GraduationCap } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export function Navbar() {
  const { profile, session, signOut, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span>Learning &amp; Power AI</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Button asChild variant="ghost" size="sm">
            <Link href="/courses">Courses</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/translator">AI Translator</Link>
          </Button>
          {!loading && session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href={dashboardPath(profile?.role)}>Dashboard</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  router.push('/');
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
