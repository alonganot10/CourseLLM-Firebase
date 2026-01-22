import { getCourseById } from "@/lib/mock-data"
import { notFound } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Presentation } from "lucide-react"
import { ChattPanel } from "./_components/chat-panel"

export default function CourseDetailPage({ params }: { params: { courseId: string } }) {
  const course = getCourseById(params.courseId)

  if (!course) {
    notFound()
  }

  // This is a compact, text-only view of the course content
  // that the ChatPanel / RAG layer can use as extra context if needed.
  const courseMaterialString = course.materials
    .map(
      (m) =>
        `Title: ${m.title}\nType: ${m.type}\nContent:\n${m.content}`,
    )
    .join("\n\n---\n\n")

  return (
    <div className="space-y-6 h-[calc(100vh-10rem)]">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold font-headline">{course.title}</h1>
        <p className="text-muted-foreground">{course.description}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Course Materials</CardTitle>
            <CardDescription>
              Review the materials for this course.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {course.materials.map((material) => (
                  <div
                    key={material.id}
                    className="p-4 border rounded-lg bg-muted/50"
                  >
                    <h3 className="flex items-center gap-2 font-semibold mb-2">
                      {material.type === "PDF" || material.type === "DOC" ? (
                        <FileText className="h-5 w-5 text-primary" />
                      ) : (
                        <Presentation className="h-5 w-5 text-primary" />
                      )}
                      {material.title}
                      <span className="text-xs font-normal text-muted-foreground ml-auto bg-background px-2 py-1 rounded-full border">
                        {material.type}
                      </span>
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {material.content}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="h-full">
          <ChatPanel
            courseId={course.id}
            courseTitle={course.title}
            courseDescription={course.description}
            courseMaterial={courseMaterialString}
          />
        </div>
      </div>
    </div>
  )
}
