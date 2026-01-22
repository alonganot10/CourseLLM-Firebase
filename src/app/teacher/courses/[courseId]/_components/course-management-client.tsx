"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Course } from "@/lib/types";
import { FileText, Presentation, Upload, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

export function CourseManagementClient({ course: initialCourse }: { course: Course }) {
  const [course, setCourse] = useState(initialCourse);
  const { toast } = useToast();

  const handleSaveChanges = () => {
    // Here you would typically make an API call to save the changes.
    console.log("Saving changes:", course);
    toast({
      title: "Changes Saved",
      description: `Your changes to "${course.title}" have been saved.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">{course.title}</h1>
          <p className="text-muted-foreground">{course.description}</p>
        </div>
        <Button onClick={handleSaveChanges}>Save Changes</Button>
      </div>

      <Tabs defaultValue="materials">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="materials">Course Materials</TabsTrigger>
          <TabsTrigger value="objectives">Learning Objectives</TabsTrigger>
        </TabsList>
        <TabsContent value="materials">
          <Card>
            <CardHeader>
              <CardTitle>Manage Materials</CardTitle>
              <CardDescription>Upload and manage course files.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold">Current Materials</h3>
                <div className="space-y-2">
                  {course.materials.map(material => (
                    <div key={material.id} className="flex items-center gap-4 p-2 border rounded-lg">
                      {material.type === 'PDF' || material.type === 'DOC' ? <FileText className="h-5 w-5 text-primary"/> : <Presentation className="h-5 w-5 text-primary"/>}
                      <span className="flex-1 font-medium">{material.title}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">{material.type}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                   {course.materials.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No materials uploaded yet.</p>}
                </div>
              </div>
              <div className="space-y-4 pt-4 border-t">
                 <h3 className="font-semibold">Upload New Material</h3>
                 <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="material-file">File (PDF, PPT, DOC, MD)</Label>
                    <div className="flex gap-2">
                        <Input id="material-file" type="file" />
                        <Button variant="secondary"><Upload className="mr-2 h-4 w-4"/> Upload</Button>
                    </div>
                 </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="objectives">
          <Card>
            <CardHeader>
              <CardTitle>Learning Path Definition</CardTitle>
              <CardDescription>Define the objectives, skills, and trajectories for this course.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="objectives">Learning Objectives</Label>
                <Textarea
                  id="objectives"
                  placeholder="e.g., 1. Understand basic Python syntax..."
                  value={course.learningObjectives}
                  onChange={(e) => setCourse(prev => ({...prev, learningObjectives: e.target.value}))}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Learning Skills</Label>
                <Input
                  id="skills"
                  placeholder="e.g., Problem-solving, Algorithmic thinking"
                  value={course.learningSkills}
                  onChange={(e) => setCourse(prev => ({...prev, learningSkills: e.target.value}))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trajectories">Learning Trajectories</Label>
                <Input
                  id="trajectories"
                  placeholder="e.g., Beginner -> Intermediate"
                  value={course.learningTrajectories}
                  onChange={(e) => setCourse(prev => ({...prev, learningTrajectories: e.target.value}))}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
