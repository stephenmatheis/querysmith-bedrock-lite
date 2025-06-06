'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Message } from '@/types/types';
import styles from './chat-input-panel.module.scss';

type ChatInputPanelProps = {
    sessionId: string;
    running: boolean;
    setRunning: Dispatch<SetStateAction<boolean>>;
    messageHistory: Message[];
    setMessageHistory: Dispatch<SetStateAction<Message[]>>;
};

const MAX_ROWS = 12;

let lastRequestTime = 0;

export function ChatInputPanel({
    sessionId,
    running,
    setRunning,
    messageHistory,
    setMessageHistory,
}: ChatInputPanelProps) {
    const [prompt, setPrompt] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const animateTextRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const textarea = textareaRef.current;

        if (!textarea) return;

        const lineHeight = 21;
        const maxHeight = lineHeight * MAX_ROWS;

        function resize() {
            if (!textarea) return;

            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`;
        }

        textarea.addEventListener('input', resize);

        resize();

        return () => {
            textarea.removeEventListener('input', resize);

            if (animateTextRef.current) {
                clearTimeout(animateTextRef.current);
            }
        };
    }, []);

    async function handleSendMessage() {
        if (running || !prompt.trim()) return;

        const now = Date.now();

        if (now - lastRequestTime < 2000) {
            console.warn('Too soon! Throttling user input.');
            return;
        }

        lastRequestTime = now;

        setRunning(true);

        const userMessage = prompt.trim();

        setMessageHistory((prev) => [
            ...prev,
            {
                role: 'user',
                content: userMessage,
            },
        ]);

        setPrompt('');

        // Add an empty assistant message that we'll update
        setMessageHistory((prev) => [
            ...prev,
            {
                role: 'assistant',
                content: '',
            },
        ]);

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.focus();
        }

        try {
            // Prepare messages for the API
            const apiMessages = [
                ...messageHistory,
                {
                    role: 'user',
                    content: userMessage,
                },
            ];

            // Call the Bedrock Agent API with streaming
            const response = await fetch('/api/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');

            if (contentType?.includes('text/event-stream')) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();

                let assistantContent = '';
                let buffer = '';

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();

                        if (done) break;

                        const chunk = decoder.decode(value);

                        console.log('Received chunk:', chunk);

                        // Add chunk to buffer to handle partial messages
                        buffer += chunk;

                        // Split by double newline (SSE message separator)
                        const messages = buffer.split('\n\n');

                        // Keep the last part in buffer (might be incomplete)
                        buffer = messages.pop() || '';

                        for (const message of messages) {
                            const lines = message.split('\n');

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    try {
                                        const data = JSON.parse(line.slice(6));

                                        if (data.type === 'content') {
                                            const newContent = data.content;

                                            // Clear any existing animation
                                            if (animateTextRef.current) {
                                                clearTimeout(animateTextRef.current);
                                            }

                                            // If this is the first chunk, animate it
                                            if (assistantContent === '') {
                                                let currentIndex = 0;
                                                const chars = Array.from(newContent); // Handle Unicode properly

                                                const animateText = () => {
                                                    if (currentIndex < chars.length) {
                                                        assistantContent = chars.slice(0, currentIndex + 1).join('');

                                                        setMessageHistory((prev) => {
                                                            const newHistory = [...prev];

                                                            if (
                                                                newHistory.length > 0 &&
                                                                newHistory[newHistory.length - 1].role === 'assistant'
                                                            ) {
                                                                newHistory[newHistory.length - 1].content =
                                                                    assistantContent;
                                                            }

                                                            return newHistory;
                                                        });

                                                        currentIndex++;

                                                        // Variable speed based on character type
                                                        let delay = 30; // default speed
                                                        const prevChar = (
                                                            currentIndex > 0 ? chars[currentIndex - 1] : null
                                                        ) as string | null;
                                                        if (prevChar === ' ') delay = 10; // faster for spaces
                                                        if (prevChar && ['.', '!', '?'].includes(prevChar)) delay = 200; // pause at sentence ends

                                                        animateTextRef.current = setTimeout(animateText, delay);
                                                    }
                                                };

                                                animateText();
                                            } else {
                                                // For subsequent chunks (if any), append with animation
                                                const startLength = assistantContent.length;
                                                const chars = Array.from(newContent);
                                                let currentIndex = 0;

                                                const animateText = () => {
                                                    if (currentIndex < chars.length) {
                                                        assistantContent =
                                                            assistantContent.slice(0, startLength) +
                                                            chars.slice(0, currentIndex + 1).join('');

                                                        setMessageHistory((prev) => {
                                                            const newHistory = [...prev];
                                                            if (
                                                                newHistory.length > 0 &&
                                                                newHistory[newHistory.length - 1].role === 'assistant'
                                                            ) {
                                                                newHistory[newHistory.length - 1].content =
                                                                    assistantContent;
                                                            }
                                                            return newHistory;
                                                        });

                                                        currentIndex++;
                                                        animateTextRef.current = setTimeout(animateText, 30);
                                                    }
                                                };

                                                animateText();
                                            }
                                        }
                                    } catch (e) {
                                        console.error('Error parsing SSE data:', e);
                                    }
                                }
                            }
                        }
                    }

                    if (buffer.trim()) {
                        console.warn('Unprocessed data in buffer:', buffer);
                    }
                }
            } else {
                const data = await response.json();

                setMessageHistory((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content: data.content || 'Sorry, I received an unexpected response format.',
                    },
                ]);
            }
        } catch (error) {
            console.error('Error calling Bedrock Agent API:', error);

            setMessageHistory((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: 'Sorry, I encountered an error while processing your request. Please try again.',
                },
            ]);
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className={styles['chat-input-panel-container']}>
            <div className={styles['chat-input-panel']}>
                {/* Field */}
                <div className={styles['chat-input-field']}>
                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        value={prompt}
                        placeholder={'Ask me anything'}
                        autoFocus={true}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyUp={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                </div>

                {/* Toolbar */}
                <div className={styles['chat-input-actions']}>
                    {/* Left */}
                    <div className={styles.box}>
                        {/* Send message */}
                        <button className={styles.action} onClick={() => alert('Action clicked!')}>
                            <span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5a.5.5 0 0 1 1 0v7a3.5 3.5 0 1 1-7 0z" />
                                </svg>
                            </span>
                        </button>
                    </div>
                    {/* Right */}
                    <div className={styles.box}>
                        {/* Send message */}
                        <button
                            className={classNames(styles['answer-button'], {
                                [styles.ready]: prompt,
                            })}
                            onClick={handleSendMessage}
                        >
                            <span>
                                <svg
                                    className={styles.send}
                                    width="16"
                                    height="16"
                                    fill="currentColor"
                                    viewBox="0 0 16 16"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5"
                                    />
                                </svg>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
