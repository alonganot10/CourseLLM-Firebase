'use client';

interface SearchBarProps {
    query: string;
    setQuery: (query: string) => void;
    onSearch: () => void;
}

export default function SearchBar({ query, setQuery, onSearch }: SearchBarProps) {
    return (
        <div className="flex space-x-2">
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="flex-grow p-2 border rounded"
                list="courses-list"
            />
            <button onClick={onSearch} className="p-2 bg-blue-500 text-white rounded">
                Search
            </button>
        </div>
    );
}
