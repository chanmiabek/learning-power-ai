import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { describeAuthEmailError, formatEmailCooldown, useAuthEmailCooldown } from '@/lib/auth-email';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { FormEvent, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState<'password' | 'otp'>('password');
  const [loading, setLoading] = useState(false);
  const { seconds: resendIn, start: startEmailCooldown } = useAuthEmailCooldown(email);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      if (!data.user) throw new Error('Supabase did not return a signed-in user.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,is_active')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        await supabase.auth.signOut();
        throw new Error(`Could not check your account role: ${profileError.message}`);
      }
      if (!profile) {
        await supabase.auth.signOut();
        throw new Error('Your account profile is missing. Contact an administrator.');
      }
      if (!profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('This account is inactive. Contact an administrator.');
      }

      if (profile.role === 'admin') {
        if (resendIn > 0) {
          await supabase.auth.signOut();
          throw new Error(`Please wait ${formatEmailCooldown(resendIn)} before requesting another verification email.`);
        }

        // Clear the password-authenticated session before starting OTP sign-in.
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw signOutError;

        const adminEmail = data.user.email ?? email;
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: adminEmail,
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;

        setEmail(adminEmail);
        startEmailCooldown();
        setStep('otp');
        setNotice('A verification code was sent to your email.');
        return;
      }

      await router.push((router.query.next as string) || '/dashboard');
    } catch (error) {
      const details = describeAuthEmailError(error);
      setError(details.message);
      if (details.cooldownSeconds) startEmailCooldown(details.cooldownSeconds, details.projectWide);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'email',
      });
      if (verifyError) throw verifyError;
      if (!data.user) throw new Error('The code was accepted but no user session was returned.');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role,is_active')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;
      if (profile?.role !== 'admin' || !profile.is_active) {
        await supabase.auth.signOut();
        throw new Error('This account is no longer an active administrator.');
      }

      await router.push((router.query.next as string) || '/dashboard/admin');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The verification code could not be confirmed.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      startEmailCooldown();
      setNotice('A new verification code was sent to your email.');
    } catch (error) {
      const details = describeAuthEmailError(error);
      setError(details.message);
      if (details.cooldownSeconds) startEmailCooldown(details.cooldownSeconds, details.projectWide);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page title="Sign in">
      <Card className="mx-auto mt-10 max-w-md">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>
            {step === 'otp'
              ? 'Enter the email verification code to finish administrator sign-in.'
              : 'Students, instructors and administrators sign in here.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'password' ? <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              No account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
            <p className="text-center text-sm">
              <Link href="/forgot-password" className="text-primary hover:underline">Forgot your password?</Link>
            </p>
          </form>
          : <form onSubmit={verifyCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification code</Label>
              <Input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6,8}"
                minLength={6}
                maxLength={8}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
              <p className="text-xs text-muted-foreground">Code sent to {email}</p>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
            <Button className="w-full" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify and sign in'}
            </Button>
            <div className="flex justify-between text-sm">
              <button type="button" className="text-primary hover:underline disabled:opacity-50" onClick={resendCode} disabled={loading || resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${formatEmailCooldown(resendIn)}` : 'Resend code'}
              </button>
              <button type="button" className="text-muted-foreground hover:underline" onClick={() => { setStep('password'); setOtp(''); setError(''); setNotice(''); }} disabled={loading}>Back to sign in</button>
            </div>
          </form>}
          {step === 'password' && error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {step === 'password' && notice && <p className="mt-3 text-sm text-muted-foreground">{notice}</p>}
        </CardContent>
      </Card>
    </Page>
  );
}
