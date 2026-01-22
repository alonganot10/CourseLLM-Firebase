'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type CourseOption = {
  id: string;   // UUID from Data Connect / search-service
  code: string; // human-friendly
  title: string;
};

type Props = {
  courseId: string; // UUID ("" means: search across *my* courses)
  setCourseId: (value: string) => void;

  type: string;
  setType: (value: string) => void;

  topK: number;
  setTopK: (value: number) => void;

  courses: CourseOption[];
  coursesLoading: boolean;
  coursesError?: string | null;
};

export default function SearchFilters({
  courseId,
  setCourseId,
  type,
  setType,
  topK,
  setTopK,
  courses,
  coursesLoading,
  coursesError,
}: Props) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid gap-2">
        <Label htmlFor="course">Course</Label>

        <select
          id="course"
          className="h-10 w-full rounded-md border px-3 text-sm"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          disabled={coursesLoading}
        >
          <option value="">
            {coursesLoading ? 'Loading courses…' : 'My courses (all)'}
          </option>

          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title}
            </option>
          ))}
        </select>

        {coursesError ? (
          <p className="text-sm text-red-600">{coursesError}</p>
        ) : null}

        {!coursesLoading && !coursesError && courses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No courses returned from Data Connect.
          </p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="type">Type</Label>
        <select
          id="type"
          className="h-10 w-full rounded-md border px-3 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All</option>
          <option value="text">Text</option>
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="topK">Top K</Label>
        <Input
          id="topK"
          type="number"
          min={1}
          max={20}
          value={topK}
          onChange={(e) => setTopK(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
