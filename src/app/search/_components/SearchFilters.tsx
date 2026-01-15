'use client';

interface SearchFiltersProps {
    courseId: string;
    setCourseId: (courseId: string) => void;
    type: string;
    setType: (type: string) => void;
    topK: number;
    setTopK: (topK: number) => void;
}

export default function SearchFilters({ courseId, setCourseId, type, setType, topK, setTopK }: SearchFiltersProps) {
    return (
        <div className="flex space-x-4">
            <input
                type="text"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder="Course ID"
                className="p-2 border rounded"
            />
            <select value={type} onChange={(e) => setType(e.target.value)} className="p-2 border rounded">
                <option value="all">All Types</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="text">Text</option>
            </select>
            <input
                type="number"
                value={topK}
                onChange={(e) => setTopK(Number(e.target.value))}
                min="1"
                max="20"
                className="p-2 border rounded"
            />
        </div>
    );
}
