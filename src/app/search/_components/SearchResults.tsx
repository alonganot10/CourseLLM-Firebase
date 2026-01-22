"use client";

import { SearchResult } from '../types';
import { useAuth } from '@/components/AuthProviderClient';
import { useState } from 'react';

interface SearchResultsProps {
    results: SearchResult[];
    courseLabelById?: (courseId: string) => string;
    courseCodeById?: (courseId: string) => string;
    courseTitleById?: (courseId: string) => string;
    onCourseClick?: (courseId: string) => void;
}

export default function SearchResults({
    results,
    courseLabelById,
    courseCodeById,
    courseTitleById,
    onCourseClick,
}: SearchResultsProps) {
    const { firebaseUser } = useAuth();
    const [openingId, setOpeningId] = useState<string | null>(null);

    const openResult = async (result: SearchResult) => {
        // If the backend already returned a direct URL, just open it.
        if (result.url) {
            window.open(result.url, '_blank', 'noopener,noreferrer');
            return;
        }

        // Otherwise, try to resolve a signed URL from a gs:// or storage:// source.
        if (!result.source) return;

        try {
            setOpeningId(result.id);
            const token = firebaseUser ? await firebaseUser.getIdToken() : null;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;

            const r = await fetch('/api/document-link', {
                method: 'POST',
                headers,
                body: JSON.stringify({ courseId: result.courseId, source: result.source }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok || !data?.url) {
                console.warn('Failed to resolve document link', data);
                return;
            }
            window.open(String(data.url), '_blank', 'noopener,noreferrer');
        } catch (e) {
            console.warn('Failed to open document', e);
        } finally {
            setOpeningId(null);
        }
    };

    if (results.length === 0) {
        return <div>No results found.</div>;
    }

    return (
        <div className="space-y-4">
            {results.map((result) => (
                <div key={result.id} className="p-4 border rounded shadow-sm">
                    <h3 className="text-xl font-bold">
                        {result.url ? (
                            <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                {result.title}
                            </a>
                        ) : result.source ? (
                            <button
                                type="button"
                                onClick={() => void openResult(result)}
                                className="text-blue-600 hover:underline text-left"
                                title="Open source file"
                            >
                                {openingId === result.id ? 'Opening…' : result.title}
                            </button>
                        ) : (
                            <span className="text-foreground">{result.title}</span>
                        )}
                    </h3>

                    <div className="text-gray-600 flex flex-wrap items-center gap-2">
                        <span>Course:</span>

                        {onCourseClick ? (
                            <button
                                type="button"
                                className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium hover:bg-muted transition"
                                onClick={() => onCourseClick(result.courseId)}
                                title={courseTitleById ? courseTitleById(result.courseId) : undefined}
                                aria-label={`Filter search to course ${courseCodeById ? courseCodeById(result.courseId) : result.courseId}`}
                            >
                                {courseCodeById ? courseCodeById(result.courseId) : (courseLabelById ? courseLabelById(result.courseId) : result.courseId)}
                            </button>
                        ) : (
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium">
                                {courseCodeById ? courseCodeById(result.courseId) : (courseLabelById ? courseLabelById(result.courseId) : result.courseId)}
                            </span>
                        )}

                        {courseTitleById ? (
                            <span className="text-xs text-muted-foreground">{courseTitleById(result.courseId)}</span>
                        ) : null}
                    </div>

                    <p className="text-sm text-gray-500">Type: {result.type}</p>
                    <p className="mt-2">{result.snippet}</p>
                    <p className="text-sm text-gray-500 mt-2">Score: {result.score.toFixed(2)}</p>
                </div>
            ))}
        </div>
    );
}
