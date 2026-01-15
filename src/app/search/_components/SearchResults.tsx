import { SearchResult } from '../types';

interface SearchResultsProps {
    results: SearchResult[];
}

export default function SearchResults({ results }: SearchResultsProps) {
    if (results.length === 0) {
        return <div>No results found.</div>;
    }

    return (
        <div className="space-y-4">
            {results.map((result) => (
                <div key={result.id} className="p-4 border rounded shadow-sm">
                    <h3 className="text-xl font-bold">
                        <a href={result.url || '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {result.title}
                        </a>
                    </h3>
                    <p className="text-gray-600">Course ID: {result.courseId}</p>
                    <p className="text-sm text-gray-500">Type: {result.type}</p>
                    <p className="mt-2">{result.snippet}</p>
                    <p className="text-sm text-gray-500 mt-2">Score: {result.score.toFixed(2)}</p>
                </div>
            ))}
        </div>
    );
}
