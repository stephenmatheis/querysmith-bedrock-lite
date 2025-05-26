export async function POST(request: Request) {
    try {
        const { messages, model = 'claude-opus-4-20250514', max_tokens = 1000 } = await request.json();

        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            return Response.json({ error: 'Anthropic API key not configured' }, { status: 500 });
        }

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens,
                messages,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();

            console.error('Anthropic API error:', errorData);

            return Response.json({ error: 'Failed to get response from Claude' }, { status: response.status });
        }

        const data = await response.json();

        return Response.json(data);
    } catch (error) {
        console.error('API route error:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
