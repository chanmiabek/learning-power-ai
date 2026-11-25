import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Course } from '@/types/types';
import Link from 'next/link';

export function CourseCard({ course, href }: { course: Course; href?: string }) {
  return (
    <Link href={href ?? `/courses/${course.id}`}>
      <Card className="h-full overflow-hidden transition-colors hover:border-primary">
        {course.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={course.thumbnail_url} alt="" className="h-36 w-full object-cover" />
        ) : (
          <div className="flex h-36 items-center justify-center bg-gradient-to-br from-primary/40 to-secondary text-3xl font-bold">
            {course.title.slice(0, 2).toUpperCase()}
          </div>
        )}
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2">{course.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
          <div className="flex flex-wrap gap-1">
            {course.category && <Badge variant="secondary">{course.category}</Badge>}
            {course.level && <Badge variant="outline">{course.level}</Badge>}
            {!course.is_published && <Badge variant="destructive">Draft</Badge>}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
