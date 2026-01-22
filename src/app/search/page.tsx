'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProviderClient';
import SearchBar from './_components/SearchBar';
import SearchFilters from './_components/SearchFilters';
import SearchResults from './_components/SearchResults';
import { SearchResult } from './types';

import { COURSE_CATALOG } from '../../lib/courseCatalog';

type CourseOption = { id: string; code: string; title: string };
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true';
const ENABLE_DATACONNECT = process.env.NEXT_PUBLIC_ENABLE_DATACONNECT === 'true';


function buildCourseFallback(registeredCourseIds: string[]): CourseOption[] {
  const allowed = new Set(registeredCourseIds);
  const fromCatalog = COURSE_CATALOG.filter((c) => allowed.has(c.id)).map((c) => ({ ...c }));
  if (fromCatalog.length > 0) return fromCatalog;

  // Last resort: show raw IDs so the user can still pick a scope.
  return registeredCourseIds.map((id) => ({ id, code: id.slice(0, 8), title: 'Course' }));
}


export default function SearchPage() {
  const router = useRouter();
  const { profile, firebaseUser } = useAuth();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [courseId, setCourseId] = useState(searchParams.get('courseId') || ''); // course UUID ("" => all *my* courses)
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [topK, setTopK] = useState(Number(searchParams.get('topK')) || 5);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // RAG (Gemini) summary state
  const [ragEnabled, setRagEnabled] = useState(false);
  const [ragLoading, setRagLoading] = useState(false);
  const [ragError, setRagError] = useState<string | null>(null);
  const [ragAnswer, setRagAnswer] = useState<string>('');
  const [ragSources, setRagSources] = useState<
    Array<{ index: number; id: string; courseId: string; title?: string; score: number; snippet?: string; source?: string; url?: string }>
  >([]);

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const ragAbortRef = useRef<AbortController | null>(null);

  const registeredCourseIds = useMemo(() => {
    const raw = profile?.courses;
    return Array.isArray(raw) ? raw.map((x) => String(x)) : [];
  }, [profile?.courses]);

  // Keep URL params in sync (does NOT trigger search by itself)
  useEffect(() => {
    const newParams = new URLSearchParams();
    if (query) newParams.set('q', query);
    if (courseId) newParams.set('courseId', courseId);
    if (type) newParams.set('type', type);
    if (topK) newParams.set('topK', topK.toString());
    router.push(`/search?${newParams.toString()}`);
  }, [query, courseId, type, topK, router]);

useEffect(() => {
  if (!firebaseUser) return;

  let cancelled = false;

  (async () => {
    setCoursesLoading(true);
    setCoursesError(null);

    // ✅ Emulator mode: DO NOT call Data Connect (emulator tokens get rejected by prod).
    if (USE_EMULATORS || !ENABLE_DATACONNECT) {
      const isTeacher = (profile?.role ?? 'student') === 'teacher';

      let fallback: CourseOption[];
      if (isTeacher && registeredCourseIds.length === 0) {
        // teacher with no selected courses -> show all (matches your prod behavior)
        fallback = COURSE_CATALOG.map((c) => ({ ...c }));
      } else {
        // students (and teachers who picked courses) -> only their courses
        fallback = buildCourseFallback(registeredCourseIds);
      }

      if (!cancelled) setCourses(fallback);
      if (!cancelled) setCoursesLoading(false);
      return;
    }

    try {
      // Prod-only: dynamic import so emulators don't even load Data Connect client code.
      const { listCourses } = await import('@dataconnect/generated');
      const resp: any = await listCourses();

      const rawCourses = resp?.data?.courses ?? resp?.courses ?? [];

      let normalized: CourseOption[] = (rawCourses as any[])
        .map((c) => ({
          id: String(c.id ?? '').trim(),
          code: String(c.code ?? '').trim(),
          title: String(c.title ?? c.code ?? '').trim(),
        }))
        .filter((c) => c.id.length > 0);

      if ((profile?.role ?? 'student') !== 'teacher') {
        const allowed = new Set(registeredCourseIds);
        normalized = normalized.filter((c) => allowed.has(c.id));
      } else if (registeredCourseIds.length > 0) {
        const allowed = new Set(registeredCourseIds);
        normalized = normalized.filter((c) => allowed.has(c.id));
      }

      normalized.sort((a, b) => (a.title || a.code).localeCompare(b.title || b.code));

      if (normalized.length === 0 && registeredCourseIds.length > 0) {
        normalized = buildCourseFallback(registeredCourseIds);
      }

      if (!cancelled) setCourses(normalized);
    } catch (e: any) {
      if (!cancelled) {
        console.warn('listCourses failed, using fallback catalog:', e);
        const isTeacher = (profile?.role ?? 'student') === 'teacher';
        const fallback =
          isTeacher && registeredCourseIds.length === 0
            ? COURSE_CATALOG.map((c) => ({ ...c }))
            : buildCourseFallback(registeredCourseIds);

        setCourses(fallback);
        setCoursesError(null);
      }
    } finally {
      if (!cancelled) setCoursesLoading(false);
    }
  })();

  return () => {
    cancelled = true;
  };
}, [firebaseUser, profile?.role, registeredCourseIds]);

  // If URL had an invalid courseId (not in the registered list), reset to "all my courses".
  useEffect(() => {
    if (!courseId) return;
    if (courses.length === 0) return;
    const ok = courses.some((c) => c.id === courseId);
    if (!ok) setCourseId('');
  }, [courseId, courses]);

  const runSearch = async (opts?: { courseId?: string }) => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      return;
    }

    const effectiveCourseId = opts?.courseId ?? courseId;

    // No registered courses => nothing to search.
    if (!effectiveCourseId && courses.length === 0) {
      setResults([]);
      return;
    }

    // Cancel any in-flight search (helps if SearchBar triggers rapid calls)
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const token = firebaseUser ? await firebaseUser.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const k = Math.min(Math.max(topK, 1), 20);

      const r = await fetch('/api/search', {
        method: 'POST',
        headers,
        signal: abortRef.current?.signal,
        body: JSON.stringify({ q: query, ...(effectiveCourseId ? { courseId: effectiveCourseId } : {}), type, topK: k }),
      });

      const data = await r.json();
      setResults(Array.isArray(data?.results) ? data.results : []);

      // Kick off RAG summary (optional)
      if (ragEnabled) {
        void runRagSummary({ courseId: effectiveCourseId });
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('Search failed:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const runRagSummary = async (opts?: { courseId?: string }) => {
    if (!ragEnabled) return;
    if (!query || query.trim().length < 2) {
      setRagAnswer('');
      setRagSources([]);
      return;
    }

    const effectiveCourseId = opts?.courseId ?? courseId;

    // Cancel any in-flight RAG call
    if (ragAbortRef.current) ragAbortRef.current.abort();
    ragAbortRef.current = new AbortController();

    setRagLoading(true);
    setRagError(null);
    try {
      const token = firebaseUser ? await firebaseUser.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const r = await fetch('/api/rag-summary', {
        method: 'POST',
        headers,
        signal: ragAbortRef.current?.signal,
        body: JSON.stringify({ q: query, ...(effectiveCourseId ? { courseId: effectiveCourseId } : {}), topK: 8 }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setRagAnswer('');
        setRagSources([]);
        setRagError(data?.error || 'Failed to generate AI summary');
        return;
      }

      setRagAnswer(String(data?.answer || ''));
      setRagSources(Array.isArray(data?.sources) ? data.sources : []);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.error('RAG summary failed:', e);
        setRagError('Failed to generate AI summary');
      }
    } finally {
      setRagLoading(false);
    }
  };

  const openRagSource = async (s: { courseId: string; url?: string; source?: string }) => {
    if (s.url) {
      window.open(s.url, '_blank', 'noopener,noreferrer');
      return;
    }
    if (!s.source) return;

    try {
      const token = firebaseUser ? await firebaseUser.getIdToken() : null;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const r = await fetch('/api/document-link', {
        method: 'POST',
        headers,
        body: JSON.stringify({ courseId: s.courseId, source: s.source }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data?.url) return;
      window.open(String(data.url), '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Failed to open source', e);
    }
  };

  const dashboardUrl = profile?.role === 'teacher' ? '/teacher' : '/student';

  const courseLabel = useMemo(() => {
    if (!courseId) return 'My courses';
    const found = courses.find((c) => c.id === courseId);
    return found ? `${found.code} — ${found.title}` : courseId;
  }, [courseId, courses]);

  const courseLabelById = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, `${c.code} — ${c.title}`));
    return (id: string) => map.get(id) ?? id;
  }, [courses]);

  const courseCodeById = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.code));
    return (id: string) => map.get(id) ?? id;
  }, [courses]);

  const courseTitleById = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((c) => map.set(c.id, c.title));
    return (id: string) => map.get(id) ?? '';
  }, [courses]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold">Search</h1>
          <p className="text-sm text-muted-foreground">
            Searching: <span className="font-medium">{courseLabel}</span>
          </p>
        </div>

        <Link href={dashboardUrl}>
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>

      <div className="space-y-4">
        <SearchBar query={query} setQuery={setQuery} onSearch={() => runSearch()} />

        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ragEnabled}
                onChange={(e) => {
                  const on = e.target.checked;
                  setRagEnabled(on);
                  setRagError(null);
                  if (!on) {
                    setRagAnswer('');
                    setRagSources([]);
                  }
                }}
              />
              AI summary (Gemini + RAG)
            </label>

            <Button
              size="sm"
              variant="outline"
              disabled={!ragEnabled || ragLoading || loading || query.trim().length < 2}
              onClick={() => runRagSummary()}
            >
              {ragLoading ? 'Summarizing…' : 'Summarize'}
            </Button>
          </div>

          {ragEnabled ? (
            <div className="mt-3 space-y-3">
              {ragError ? <div className="text-sm text-red-600">{ragError}</div> : null}

              {ragAnswer ? (
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{ragAnswer}</div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Generates a grounded summary using the top retrieved chunks from your selected course scope.
                </div>
              )}

              {ragSources.length > 0 ? (
                <div className="text-sm">
                  <div className="font-medium mb-2">Sources</div>
                  <ol className="list-decimal pl-5 space-y-1">
                    {ragSources.map((s) => (
                      <li key={`${s.id}-${s.index}`} className="text-muted-foreground">
                        {s.url ? (
                          <a
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-foreground hover:underline"
                          >
                            {s.title || s.id}
                          </a>
                        ) : s.source ? (
                          <button
                            type="button"
                            onClick={() => void openRagSource(s)}
                            className="text-foreground hover:underline text-left"
                            title="Open source file"
                          >
                            {s.title || s.id}
                          </button>
                        ) : (
                          <span className="text-foreground">{s.title || s.id}</span>
                        )}{' '}
                        <span>
                          — {courseCodeById(s.courseId)}{courseTitleById(s.courseId) ? `: ${courseTitleById(s.courseId)}` : ''}
                        </span>
                        {s.snippet ? (
                          <div className="text-xs mt-0.5">{s.snippet}</div>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-2 text-sm text-muted-foreground">
              Toggle on to generate an AI summary for your query.
            </div>
          )}
        </div>

        {(profile?.role ?? 'student') !== 'teacher' && registeredCourseIds.length === 0 ? (
          <div className="rounded-lg border p-4 text-sm">
            <div className="font-medium mb-1">No registered courses</div>
            <div className="text-muted-foreground">
              Your profile has no courses yet, so search is limited. Complete onboarding to pick your courses.
            </div>
            <div className="mt-3">
              <Link href="/onboarding">
                <Button size="sm">Go to Onboarding</Button>
              </Link>
            </div>
          </div>
        ) : null}

        <SearchFilters
          courseId={courseId}
          setCourseId={setCourseId}
          type={type}
          setType={setType}
          topK={topK}
          setTopK={setTopK}
          courses={courses}
          coursesLoading={coursesLoading}
          coursesError={coursesError}
        />

        {loading ? (
          <div>Loading...</div>
        ) : (
          <SearchResults
            results={results}
            courseLabelById={courseLabelById}
            courseCodeById={courseCodeById}
            courseTitleById={courseTitleById}
            onCourseClick={(clickedCourseId) => {
              // Clicking the course badge in results instantly scopes the search to that course.
              setCourseId(clickedCourseId);
              void runSearch({ courseId: clickedCourseId });
            }}
          />
        )}
      </div>
    </div>
  );
}
