import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { query, courseId, type, topK } = body;

    // TODO: Implement actual search logic here
    const results = [
        {
            id: '1',
            title: 'Example Result 1',
            courseId: 'CS101',
            type: 'lecture',
            url: 'https://example.com/result1',
            snippet: 'This is an example snippet for result 1.',
            score: 0.9
        },
        {
            id: '2',
            title: 'Example Result 2',
            courseId: 'CS102',
            type: 'assignment',
            url: 'https://example.com/result2',
            snippet: 'This is an example snippet for result 2.',
            score: 0.85
        }
    ];

    return NextResponse.json({ results });
}
