import { useEffect, useState } from 'react';

const GLOBAL_COOLDOWN_KEY = 'lp-ai:auth-email-global-until';
const USER_COOLDOWN_PREFIX = 'lp-ai:auth-email-until:';

export function formatEmailCooldown(seconds: number) {
  if (seconds >= 60) return `${Math.ceil(seconds / 60)} min`;
  return `${seconds} sec`;
}

export function describeAuthEmailError(error: unknown) {
  const value = error && typeof error === 'object'
    ? (error as { message?: unknown; code?: unknown })
    : null;
  const message = typeof value?.message === 'string' ? value.message : '';
  const code = typeof value?.code === 'string' ? value.code : '';

  if (code === 'over_email_send_rate_limit' || /email rate limit exceeded/i.test(message)) {
    return {
      message:
        'Supabase has reached its built-in email limit of 2 auth emails per hour. Wait up to an hour, or configure custom SMTP in Supabase to send more emails.',
      cooldownSeconds: 60 * 60,
      projectWide: true,
    };
  }

  if (code === 'email_address_not_authorized') {
    return {
      message:
        'Supabase’s built-in email service only sends to project team addresses. Configure custom SMTP to email students.',
      cooldownSeconds: 0,
      projectWide: false,
    };
  }

  if (/for security purposes, you can only request this after/i.test(message)) {
    return {
      message: 'Please wait 60 seconds before requesting another email code.',
      cooldownSeconds: 60,
      projectWide: false,
    };
  }

  return {
    message: message || 'Could not send the email. Please try again later.',
    cooldownSeconds: 0,
    projectWide: false,
  };
}

export function useAuthEmailCooldown(email: string) {
  const [seconds, setSeconds] = useState(0);
  const userKey = `${USER_COOLDOWN_PREFIX}${email.trim().toLowerCase()}`;

  useEffect(() => {
    if (!email.trim()) {
      setSeconds(0);
      return;
    }

    const refresh = () => {
      const now = Date.now();
      const userUntil = Number(localStorage.getItem(userKey) || 0);
      const globalUntil = Number(localStorage.getItem(GLOBAL_COOLDOWN_KEY) || 0);
      setSeconds(Math.max(0, Math.ceil((Math.max(userUntil, globalUntil) - now) / 1000)));
    };

    refresh();
    const timer = window.setInterval(refresh, 1000);
    return () => window.clearInterval(timer);
  }, [email, userKey]);

  const start = (durationSeconds = 60, projectWide = false) => {
    if (typeof window === 'undefined' || durationSeconds <= 0) return;
    const until = Date.now() + durationSeconds * 1000;
    localStorage.setItem(userKey, String(until));
    if (projectWide) localStorage.setItem(GLOBAL_COOLDOWN_KEY, String(until));
    setSeconds(durationSeconds);
  };

  return { seconds, start };
}
