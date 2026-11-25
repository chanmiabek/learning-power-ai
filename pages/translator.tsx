import { Loading } from '@/components/layout/Loading';
import { Page } from '@/components/layout/Page';
import { Translator } from '@/components/Translator';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function TranslatorPage() {
  const { session, loading } = useAuth();
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'translator_enabled')
      .single()
      .then(({ data }) => data && setEnabled(data.value === true));
  }, []);

  return (
    <Page title="AI Translator" wide>
      <div className="mb-6 text-center text-4xl font-bold">L&amp;P AI Translator</div>
      {loading ? (
        <Loading />
      ) : !enabled ? (
        <p className="text-center text-muted-foreground">The translator is currently disabled by the administrator.</p>
      ) : !session ? (
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">Sign in to use the AI Translator.</p>
          <Button asChild>
            <Link href="/login?next=/translator">Sign in</Link>
          </Button>
        </div>
      ) : (
        <Translator />
      )}
    </Page>
  );
}
