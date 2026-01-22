import Link from 'next/link';
import Image from 'next/image';
import { courses, studentProgress } from '@/lib/mock-data';
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
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';

export default function StudentDashboard() {
  const userCourses = studentProgress
    .filter((p) => p.studentId === 'student-1')
    .map((p) => ({
      ...courses.find((c) => c.id === p.courseId)!,
      progress: p.progress,
    }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-headline">Student Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, Alex! Here are your current courses.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {userCourses.map((course) => {
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
              <CardFooter className="flex flex-col items-start gap-2 p-4 pt-0">
                <div className="w-full space-y-1">
                  <p className="text-sm text-muted-foreground">Progress</p>
                  <Progress value={course.progress} />
                  <p className="text-xs text-right font-medium">{course.progress}%</p>
                </div>
                <Link href={`/student/courses/${course.id}`} passHref className="w-full">
                  <Button className="w-full">
                    Continue Learning <ArrowRight className="ml-2" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          );
        })}
         {userCourses.length === 0 && (
          <Card className="col-span-full flex flex-col items-center justify-center p-8 text-center">
            <CardTitle>No Courses Enrolled</CardTitle>
            <CardDescription className="mt-2">
              You are not enrolled in any courses yet.
            </CardDescription>
            <Link href="/student/courses" passHref>
              <Button className="mt-4">Explore Courses</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
