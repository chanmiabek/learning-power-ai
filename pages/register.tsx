import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { describeAuthEmailError, formatEmailCooldown, useAuthEmailCooldown } from '@/lib/auth-email';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';

type RegistrationStep = 'details' | 'verify' | 'done';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [wantsInstructor, setWantsInstructor] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [step, setStep] = useState<RegistrationStep>('details');
  const [otpResendMode, setOtpResendMode] = useState<'signup' | 'signin'>('signup');
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [instructorsOpen, setInstructorsOpen] = useState(true);
  const { seconds: resendIn, start: startEmailCooldown } = useAuthEmailCooldown(email);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('key,value')
      .in('key', ['allow_registration', 'allow_instructor_requests'])
      .then(({ data }) => {
        data?.forEach((setting) => {
          if (setting.key === 'allow_registration') setOpen(setting.value === true);
          if (setting.key === 'allow_instructor_requests') setInstructorsOpen(setting.value === true);
        });
      });
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: { data: { full_name: fullName, wants_instructor: wantsInstructor } },
      });
      if (signUpError) throw signUpError;

      // If email confirmation is disabled, request a passwordless email code anyway.
      if (data.session) {
        await supabase.auth.signOut();
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: false },
        });
        if (otpError) throw otpError;
        setOtpResendMode('signin');
      } else {
        setOtpResendMode('signup');
      }

      setEmail(normalizedEmail);
      startEmailCooldown();
      setStep('verify');
      setNotice('Enter the verification code sent to your email.');
    } catch (error) {
      const details = describeAuthEmailError(error);
      setError(details.message);
      if (details.cooldownSeconds) startEmailCooldown(details.cooldownSeconds, details.projectWide);
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: otp.trim(),
        type: 'email',
      });
      if (verifyError) throw verifyError;

      await supabase.auth.signOut();
      setStep('done');
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
      const { error: resendError } =
        otpResendMode === 'signup'
          ? await supabase.auth.resend({ type: 'signup', email })
          : await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
      if (resendError) throw resendError;
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
    <Page title="Create account">
      <Card className="mx-auto mt-10 max-w-md">
        <CardHeader>
          <CardTitle>{step === 'verify' ? 'Verify your email' : step === 'done' ? 'Email verified' : 'Create your account'}</CardTitle>
          <CardDescription>
            {step === 'verify'
              ? `Enter the code sent to ${email}.`
              : 'Start learning today. Instructor accounts are approved by an administrator.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!open && step === 'details' ? (
            <p className="text-sm text-muted-foreground">Registration is currently closed.</p>
          ) : step === 'done' ? (
            <div className="space-y-3 text-sm">
              <p>Your email is verified. Sign in to continue.</p>
              <Button asChild className="w-full"><Link href="/login">Go to sign in</Link></Button>
            </div>
          ) : step === 'verify' ? (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-otp">Verification code</Label>
                <Input
                  id="signup-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6,8}"
                  minLength={6}
                  maxLength={8}
                  required
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
              <Button className="w-full" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify email'}
              </Button>
              <button type="button" className="w-full text-sm text-primary hover:underline disabled:opacity-50" onClick={resendCode} disabled={loading || resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${formatEmailCooldown(resendIn)}` : 'Resend code'}
              </button>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" required value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input id="register-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password">Password</Label>
                <Input id="register-password" type="password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {instructorsOpen && (
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={wantsInstructor} onChange={(event) => setWantsInstructor(event.target.checked)} />
                  I want to teach (request instructor access)
                </label>
              )}
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button className="w-full" disabled={loading || resendIn > 0}>
                {loading ? 'Creating...' : resendIn > 0 ? `Try again in ${formatEmailCooldown(resendIn)}` : 'Create account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </Page>
  );
}
