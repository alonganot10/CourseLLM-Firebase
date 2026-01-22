import Link from 'next/link';
import Image from 'next/image';
import { courses } from '@/lib/mock-data';
import { getPlaceholderImage } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart2, Edit, PlusCircle } from 'lucide-react';

export default function TeacherCoursesPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-headline">Manage Courses</h1>
          <p className="text-muted-foreground">
            Edit materials, define objectives, and view student reports.
          </p>
        </div>
        <Button className="w-full sm:w-auto">
          <PlusCircle className="mr-2" />
          Create New Course
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const image = getPlaceholderImage(course.imageId);
          return (
            <Card key={course.id} className="flex flex-col">
              <CardHeader className="p-0">
                {image && (
                  <Image
                    src={image.imageUrl}
                    alt={image.description}
                    data-ai-hint={image.imageHint}
                    width={600}
                    height={400}
                    className="rounded-t-lg object-cover aspect-[3/2]"
                  />
                )}
              </CardHeader>
              <CardContent className="flex-1 p-4">
                <CardTitle className="text-xl mb-2">{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardContent>
              <CardFooter className="grid grid-cols-2 gap-2 p-4 pt-0">
                <Link href={`/teacher/courses/${course.id}`} passHref className="w-full">
                  <Button variant="outline" className="w-full">
                    <Edit className="mr-2" />
                    Manage
                  </Button>
                </Link>
                <Button variant="secondary" className="w-full" disabled>
                  <BarChart2 className="mr-2" />
                  Reports
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
