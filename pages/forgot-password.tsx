import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { describeAuthEmailError, formatEmailCooldown, useAuthEmailCooldown } from '@/lib/auth-email';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { FormEvent, useState } from 'react';

type ResetStep = 'email' | 'code' | 'password' | 'done';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<ResetStep>('email');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const { seconds: resendIn, start: startEmailCooldown } = useAuthEmailCooldown(email);

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    const normalizedEmail = email.trim().toLowerCase();
    try {
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(normalizedEmail);
      if (requestError) throw requestError;
      setEmail(normalizedEmail);
      startEmailCooldown();
      setStep('code');
      setNotice('If an account exists for that email, a password reset code has been sent.');
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
        type: 'recovery',
      });
      if (verifyError) throw verifyError;
      setStep('password');
      setNotice('Code verified. Choose a new password.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'The reset code could not be confirmed.');
    } finally {
      setLoading(false);
    }
  };

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      setStep('done');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not update the password.');
    } finally {
      setLoading(false);
    }
  };

  const resendCode = async () => {
    setLoading(true);
    setError('');
    setNotice('');
    try {
      const { error: resendError } = await supabase.auth.resetPasswordForEmail(email);
      if (resendError) throw resendError;
      startEmailCooldown();
      setNotice('If an account exists for that email, a new reset code has been sent.');
    } catch (error) {
      const details = describeAuthEmailError(error);
      setError(details.message);
      if (details.cooldownSeconds) startEmailCooldown(details.cooldownSeconds, details.projectWide);
    } finally {
      setLoading(false);
    }
  };

  const titles: Record<ResetStep, string> = {
    email: 'Reset your password',
    code: 'Verify the reset code',
    password: 'Choose a new password',
    done: 'Password updated',
  };

  return (
    <Page title="Reset password">
      <Card className="mx-auto mt-10 max-w-md">
        <CardHeader>
          <CardTitle>{titles[step]}</CardTitle>
          <CardDescription>
            {step === 'email' && 'We will email you a one-time code to verify your account.'}
            {step === 'code' && `Enter the reset code sent to ${email}.`}
            {step === 'password' && 'Your reset code is verified. Set a new password.'}
            {step === 'done' && 'Your password has been changed. You can sign in now.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'done' ? (
            <Button asChild className="w-full"><Link href="/login">Go to sign in</Link></Button>
          ) : step === 'email' ? (
            <form onSubmit={requestCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button className="w-full" disabled={loading || resendIn > 0}>
                {loading ? 'Sending...' : resendIn > 0 ? `Try again in ${formatEmailCooldown(resendIn)}` : 'Send reset code'}
              </Button>
            </form>
          ) : step === 'code' ? (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-otp">Verification code</Label>
                <Input
                  id="reset-otp"
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
              <Button className="w-full" disabled={loading}>{loading ? 'Verifying...' : 'Verify code'}</Button>
              <button type="button" className="w-full text-sm text-primary hover:underline disabled:opacity-50" onClick={resendCode} disabled={loading || resendIn > 0}>
                {resendIn > 0 ? `Resend code in ${formatEmailCooldown(resendIn)}` : 'Resend code'}
              </button>
            </form>
          ) : (
            <form onSubmit={updatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {notice && <p className="text-sm text-muted-foreground">{notice}</p>}
              <Button className="w-full" disabled={loading}>{loading ? 'Updating...' : 'Update password'}</Button>
            </form>
          )}
          {step === 'email' && <p className="mt-3 text-center text-sm"><Link href="/login" className="text-primary hover:underline">Back to sign in</Link></p>}
        </CardContent>
      </Card>
    </Page>
  );
}
