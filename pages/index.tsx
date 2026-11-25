import { Page } from '@/components/layout/Page';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Languages, ShieldCheck, Users } from 'lucide-react';
import Link from 'next/link';

const features = [
  { icon: BookOpen, title: 'Unlimited courses', text: 'Instructors publish any course on any topic with videos, PDFs and documents.' },
  { icon: Users, title: 'Student progress', text: 'Enroll, learn at your pace and track completion lesson by lesson.' },
  { icon: Languages, title: 'Advanced AI Translator', text: 'Code, programming languages, human languages, documents and custom instructions.' },
  { icon: ShieldCheck, title: 'Secure roles', text: 'Separate student, instructor and super admin accounts backed by Supabase.' },
];

export default function Home() {
  return (
    <Page title="Learning & Power AI">
      <div className="mx-auto mt-10 max-w-3xl text-center sm:mt-16">
        <h1 className="text-4xl font-bold sm:text-6xl">
          Learning &amp; <span className="text-primary">Power AI</span>
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Learn anything, teach anyone and translate everything, from code to human languages.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/courses">Browse courses</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/translator">Try the AI Translator</Link>
          </Button>
        </div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon className="mb-2 h-6 w-6 text-primary" />
              <CardTitle>{f.title}</CardTitle>
              <CardDescription>{f.text}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </Page>
  );
}
