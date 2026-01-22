"use client";

import React from "react";
import { AppShell } from '@/components/layout/app-shell';
import { useAuth } from '@/components/AuthProviderClient';
import { LayoutDashboard, BookOpen, GraduationCap, BarChart2, Search } from 'lucide-react';

type Props = { children: React.ReactNode; role?: "student" | "teacher" };

export default function InnerAppShellClient({ children, role = "student" }: Props) {
  const { profile } = useAuth();

  const user = {
    name: profile?.displayName || 'User',
    email: profile?.email || '',
    avatar: profile?.photoURL || `https://i.pravatar.cc/150?u=${profile?.uid || 'anon'}`,
  };

  // Build nav items client-side (icons are React nodes and must be created in client)
  const studentNavItems = [
    { href: '/student', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/search', label: 'Search', icon: <Search /> },
    { href: '/student/courses', label: 'My Courses', icon: <BookOpen /> },
    { href: '/student/assessments', label: 'Assessments', icon: <GraduationCap /> },
  ];

  const teacherNavItems = [
    { href: '/teacher', label: 'Dashboard', icon: <LayoutDashboard /> },
    { href: '/search', label: 'Search', icon: <Search /> },
    { href: '/teacher/courses', label: 'Courses', icon: <BookOpen /> },
  ];

  const navItems = role === 'teacher' ? teacherNavItems : studentNavItems;

  return (
    <AppShell navItems={navItems} user={user}>
      {children}
    </AppShell>
  );
}
