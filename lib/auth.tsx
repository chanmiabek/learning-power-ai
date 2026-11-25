import { supabase } from '@/lib/supabase';
import { Profile, Role } from '@/types/types';
import { Session } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  profileError: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  profileError: null,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const profileLoads = useRef(new Map<string, Promise<void>>());

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    const existingLoad = profileLoads.current.get(s.user.id);
    if (existingLoad) {
      await existingLoad;
      return;
    }

    setProfileError(null);
    const task = (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', s.user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile(data as Profile);
        return;
      }

      // Repair accounts created before the profile trigger was installed.
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: s.user.id,
          email: s.user.email ?? null,
          full_name: s.user.user_metadata?.full_name ?? '',
          role: 'student',
        })
        .select('*')
        .single();

      if (!createError) {
        setProfile(created as Profile);
        return;
      }

      // Another auth event may have created this row after the first lookup.
      if (createError.code === '23505') {
        const { data: existing, error: reloadError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', s.user.id)
          .maybeSingle();
        if (!reloadError && existing) {
          setProfile(existing as Profile);
          return;
        }
      }

      throw createError;
    })().catch((error: unknown) => {
      setProfile(null);
      const details =
        error && typeof error === 'object'
          ? (error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown })
          : null;
      const message =
        error instanceof Error
          ? error.message
          : typeof details?.message === 'string'
          ? details.message
          : 'Unknown Supabase error';
      const code = typeof details?.code === 'string' ? ` (${details.code})` : '';
      const hint = typeof details?.hint === 'string' ? ` ${details.hint}` : '';
      const extra = typeof details?.details === 'string' ? ` ${details.details}` : '';
      const repairHint =
        details?.code === '42501'
          ? ' Apply supabase/migrations/20261125_profiles_self_insert.sql in the Supabase SQL Editor, then reload.'
          : details?.code === '42P01' || details?.code === 'PGRST205'
          ? ' Create the database tables by running supabase/schema.sql in the Supabase SQL Editor.'
          : '';
      setProfileError(
        `Could not load your account profile: ${message}${code}${extra}${hint}${repairHint}`,
      );
    });

    profileLoads.current.set(s.user.id, task);
    try {
      await task;
    } finally {
      if (profileLoads.current.get(s.user.id) === task) {
        profileLoads.current.delete(s.user.id);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data, error }) => {
      if (error) throw error;
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session);
    }).catch((error) => {
      if (!mounted) return;
      setProfileError(
        error instanceof Error ? error.message : 'Could not restore your sign-in session.',
      );
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      void loadProfile(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value: AuthState = {
    session,
    profile,
    profileError,
    loading,
    refresh: () => loadProfile(session),
    signOut: async () => {
      await supabase.auth.signOut();
      setProfile(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const dashboardPath = (role?: Role) =>
  role === 'admin'
    ? '/dashboard/admin'
    : role === 'instructor'
    ? '/dashboard/instructor'
    : '/dashboard/student';

/** Redirects to /login unless the signed-in user has one of the roles. */
export function useRequireRole(roles: Role[]) {
  const auth = useAuth();
  const router = useRouter();
  const allowed = !!auth.profile && auth.profile.is_active && roles.includes(auth.profile.role);

  useEffect(() => {
    if (auth.loading) return;
    if (!auth.session) router.replace('/login');
    else if (auth.profile && !allowed) router.replace(dashboardPath(auth.profile.role));
  }, [auth.loading, auth.session, auth.profile, allowed, router]);

  return { ...auth, allowed };
}
