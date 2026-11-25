import { Navbar } from '@/components/layout/Navbar';
import Head from 'next/head';
import { ReactNode } from 'react';

export function Page({
  title,
  children,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <>
      <Head>
        <title>{`${title} | L&P AI`}</title>
        <meta name="description" content="Learning & Power AI: courses and an advanced AI translator." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="min-h-screen">
        <Navbar />
        <div className={wide ? 'px-4 py-8 sm:px-10' : 'container py-8'}>{children}</div>
      </div>
    </>
  );
}
