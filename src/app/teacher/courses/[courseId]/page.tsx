import { getCourseById } from '@/lib/mock-data';
import { notFound } from 'next/navigation';
import { CourseManagementClient } from './_components/course-management-client';

export default function ManageCoursePage({ params }: { params: { courseId: string } }) {
  const course = getCourseById(params.courseId);

  if (!course) {
    notFound();
  }

  return <CourseManagementClient course={course} />;
}
