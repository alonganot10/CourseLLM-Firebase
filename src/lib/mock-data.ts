import type { Course, Student, StudentProgress, EngagementData } from './types';

export const students: Student[] = [
  { id: 'student-1', name: 'Alex Johnson', avatarUrl: 'https://i.pravatar.cc/150?u=student-1' },
  { id: 'student-2', name: 'Maria Garcia', avatarUrl: 'https://i.pravatar.cc/150?u=student-2' },
  { id: 'student-3', name: 'James Smith', avatarUrl: 'https://i.pravatar.cc/150?u=student-3' },
];

export const courses: Course[] = [
  {
    id: 'cs101',
    title: 'Introduction to Python',
    description: 'Learn the fundamentals of Python programming. No prior experience needed.',
    imageId: 'course-1',
    materials: [
      { id: 'mat-1', title: 'Week 1: Introduction', type: 'PDF', content: 'This is the content for the week 1 PDF. It covers basic syntax, variables, and data types in Python. We will learn how to write our first "Hello, World!" program.' },
      { id: 'mat-2', title: 'Week 2: Control Flow', type: 'PPT', content: 'This presentation covers control flow using if-else statements and loops (for and while). Includes examples and exercises on conditional logic.' },
    ],
    learningObjectives: '1. Understand basic Python syntax. 2. Use variables and data types. 3. Implement control flow structures.',
    learningSkills: 'Problem-solving, Algorithmic thinking',
    learningTrajectories: 'Beginner -> Intermediate',
  },
  {
    id: 'cs202',
    title: 'Data Structures & Algorithms',
    description: 'A deep dive into common data structures and algorithms.',
    imageId: 'course-6',
    materials: [
      { id: 'mat-3', title: 'Module 1: Arrays & Strings', type: 'MD', content: 'Markdown content for Arrays and Strings. Covers operations, complexity analysis, and common problems.' },
      { id: 'mat-4', title: 'Module 2: Linked Lists', type: 'DOC', content: 'A document about singly and doubly linked lists. Includes implementation details and traversal techniques.' },
    ],
    learningObjectives: '1. Implement various data structures. 2. Analyze algorithm complexity. 3. Solve problems using appropriate data structures.',
    learningSkills: 'Analytical skills, Efficiency analysis',
    learningTrajectories: 'Intermediate -> Advanced',
  },
  {
    id: 'cs303',
    title: 'Machine Learning Foundations',
    description: 'Explore the core concepts of machine learning and neural networks.',
    imageId: 'course-4',
    materials: [
        { id: 'mat-5', title: 'Concept: Supervised Learning', type: 'PDF', content: 'A PDF explaining supervised learning, including regression and classification models.' },
        { id: 'mat-6', title: 'Concept: Neural Networks', type: 'PPT', content: 'Presentation on the basics of neural networks, neurons, and activation functions.' },
    ],
    learningObjectives: '1. Understand ML concepts. 2. Build simple ML models. 3. Differentiate between supervised and unsupervised learning.',
    learningSkills: 'Statistical analysis, Model building',
    learningTrajectories: 'Intermediate -> Advanced',
  },
];

export const studentProgress: StudentProgress[] = [
    { studentId: 'student-1', courseId: 'cs101', progress: 75, questionsAsked: 12, lastAccessed: '2024-05-20T10:00:00Z' },
    { studentId: 'student-2', courseId: 'cs101', progress: 45, questionsAsked: 5, lastAccessed: '2024-05-19T14:30:00Z' },
    { studentId: 'student-3', courseId: 'cs101', progress: 90, questionsAsked: 25, lastAccessed: '2024-05-21T09:00:00Z' },
    { studentId: 'student-1', courseId: 'cs202', progress: 30, questionsAsked: 8, lastAccessed: '2024-05-18T11:00:00Z' },
];

export const engagementData: EngagementData[] = [
    { date: 'May 1', logins: 150, questions: 45 },
    { date: 'May 2', logins: 160, questions: 50 },
    { date: 'May 3', logins: 155, questions: 48 },
    { date: 'May 4', logins: 170, questions: 60 },
    { date: 'May 5', logins: 180, questions: 65 },
    { date: 'May 6', logins: 175, questions: 58 },
    { date: 'May 7', logins: 190, questions: 70 },
];

export const getCourseById = (id: string) => courses.find(c => c.id === id);
