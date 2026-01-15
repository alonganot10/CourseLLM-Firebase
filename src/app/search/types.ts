export interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  courseId: string;
  type: string;
  url?: string;
  score: number;
}
