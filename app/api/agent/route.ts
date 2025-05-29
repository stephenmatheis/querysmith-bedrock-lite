import { BedrockAgentRuntimeClient, InvokeAgentCommand } from '@aws-sdk/client-bedrock-agent-runtime';

async function invokeAgentWithRetry(client: BedrockAgentRuntimeClient, command: InvokeAgentCommand, maxRetries = 3) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[Agent] Attempt ${attempt + 1}...`);

            const response = await client.send(command);

            return response;
        } catch (err: unknown) {
            if ((err as { name?: string }).name === 'ThrottlingException' && attempt < maxRetries) {
                const wait = 500 * Math.pow(2, attempt);

                console.warn(`[Agent] Throttled. Retrying in ${wait}ms...`);

                await new Promise((res) => setTimeout(res, wait));
            } else {
                console.error(`[Agent] Failed on attempt ${attempt + 1}:`, err);

                throw err;
            }
        }
    }

    throw new Error('Agent throttling retries exceeded.');
}

export async function POST(request: Request) {
    try {
        const { messages, sessionId = 'default-session' } = await request.json();

        const agentId = process.env.AGENT_ID;
        const agentAliasId = process.env.AGENT_ALIAS_ID;
        const region = process.env.REGION || 'us-east-1';

        if (!agentId || !agentAliasId) {
            return Response.json(
                {
                    error: 'Bedrock Agent configuration not found. Please set AGENT_ID and AGENT_ALIAS_ID environment variables.',
                },
                { status: 500 }
            );
        }

        // Convert messages to input text
        let inputText: string;

        if (Array.isArray(messages)) {
            const userMessages = messages.filter((msg) => msg.role === 'user');

            inputText =
                userMessages.length > 0
                    ? userMessages[userMessages.length - 1].content
                    : messages.map((msg) => msg.content).join('\n');
        } else if (typeof messages === 'string') {
            inputText = messages;
        } else {
            return Response.json({ error: 'Invalid messages format' }, { status: 400 });
        }

        const client = new BedrockAgentRuntimeClient({ region });
        const command = new InvokeAgentCommand({
            agentId,
            agentAliasId,
            sessionId,
            inputText,
        });

        console.log(`[Agent] Invoking with sessionId: ${sessionId}`);

        const response = await invokeAgentWithRetry(client, command);

        if (!response.completion) {
            return Response.json({ error: 'No completion stream received' }, { status: 500 });
        }

        const stream = new ReadableStream({
            async start(controller) {
                const encoder = new TextEncoder();

                try {
                    for await (const chunk of response.completion!) {
                        if (chunk.chunk?.bytes) {
                            const raw = new TextDecoder().decode(chunk.chunk.bytes).trim();

                            if (raw) {
                                let content = '';

                                try {
                                    const payload = JSON.parse(raw);
                                    content = payload.content || '';
                                } catch {
                                    content = raw;
                                }

                                if (content) {
                                    console.log('Bedrock chunk received:', content.length, 'characters');

                                    const sseData = `data: ${JSON.stringify({
                                        content,
                                        type: 'content',
                                    })}\n\n`;
                                    controller.enqueue(encoder.encode(sseData));
                                }
                            }
                        }
                    }

                    const doneData = `data: ${JSON.stringify({
                        type: 'done',
                        agentId,
                        sessionId,
                    })}\n\n`;
                    controller.enqueue(encoder.encode(doneData));
                } catch (error) {
                    console.error('Streaming error:', error);
                    const errorData = `data: ${JSON.stringify({
                        type: 'error',
                        error: 'Stream processing failed',
                    })}\n\n`;
                    controller.enqueue(encoder.encode(errorData));
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                Connection: 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST',
                'Access-Control-Allow-Headers': 'Content-Type',
                'X-Accel-Buffering': 'no',
                'X-Content-Type-Options': 'nosniff',
            },
        });
    } catch (error) {
        console.error('Bedrock Agent streaming API error:', error);

        if (error instanceof Error) {
            if (error.name === 'ResourceNotFoundException') {
                return Response.json({ error: 'Bedrock Agent not found.' }, { status: 404 });
            }
            if (error.name === 'AccessDeniedException') {
                return Response.json({ error: 'Access denied to Bedrock Agent.' }, { status: 403 });
            }
        }

        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
