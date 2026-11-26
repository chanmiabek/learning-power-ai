import { Button } from '@/components/ui/button';
import { dashboardPath, useAuth } from '@/lib/auth';
import { GraduationCap, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState } from 'react';

export function Navbar() {
  const { profile, session, signOut, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
      <div className="container flex min-h-14 flex-wrap items-center justify-between gap-y-2 py-2">
        <Link href="/" className="flex min-w-0 items-center gap-2 font-bold">
          <GraduationCap className="h-5 w-5 text-primary" />
          <span className="truncate">Learning &amp; Power AI</span>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="site-navigation"
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        <nav
          id="site-navigation"
          className={`${mobileMenuOpen ? 'flex' : 'hidden'} w-full flex-col items-stretch gap-1 text-sm md:flex md:w-auto md:flex-row md:items-center`}
        >
          <Button asChild variant="ghost" size="sm" className="justify-start md:justify-center">
            <Link href="/courses" onClick={() => setMobileMenuOpen(false)}>Courses</Link>
          </Button>
          <Button asChild variant="ghost" size="sm" className="justify-start md:justify-center">
            <Link href="/translator" onClick={() => setMobileMenuOpen(false)}>AI Translator</Link>
          </Button>
          {!loading && session ? (
            <>
              <Button asChild variant="ghost" size="sm" className="justify-start md:justify-center">
                <Link href={dashboardPath(profile?.role)} onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="justify-start md:justify-center"
                onClick={async () => {
                  await signOut();
                  setMobileMenuOpen(false);
                  router.push('/');
                }}
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="justify-start md:justify-center">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Sign in</Link>
              </Button>
              <Button asChild size="sm" className="justify-start md:justify-center">
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
