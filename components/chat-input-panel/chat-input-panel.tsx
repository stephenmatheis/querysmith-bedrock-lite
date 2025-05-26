'use client';

import { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react';
import classNames from 'classnames';
import { Message } from '@/types/types';
import styles from './chat-input-panel.module.scss';

type ChatInputPanelProps = {
    running: boolean;
    setRunning: Dispatch<SetStateAction<boolean>>;
    messageHistory: Message[];
    setMessageHistory: Dispatch<SetStateAction<Message[]>>;
};

const MAX_ROWS = 12;

async function callAnthropicAPI(messages: { role: string; content: string }[]) {
    const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            messages,
            model: 'claude-opus-4-20250514',
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        throw new Error(`API call failed: ${response.statusText}`);
    }

    const data = await response.json();

    return data.content[0].text;
}

export function ChatInputPanel({ running, setRunning, messageHistory, setMessageHistory }: ChatInputPanelProps) {
    const [prompt, setPrompt] = useState<string>('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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

        return () => textarea.removeEventListener('input', resize);
    }, []);

    async function handleSendMessage() {
        if (running || !prompt.trim()) return;

        const userMessage = prompt.trim();

        setMessageHistory((prev) => [
            ...prev,
            {
                role: 'user',
                content: userMessage,
            },
        ]);

        setRunning(true);
        setPrompt('');

        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.focus();
        }

        try {
            const apiMessages: Message[] = [
                ...messageHistory,
                {
                    role: 'user',
                    content: userMessage,
                },
            ];

            const assistantResponse = await callAnthropicAPI(apiMessages);

            setMessageHistory((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content: assistantResponse,
                },
            ]);
        } catch (error) {
            console.error('Error calling Anthropic API:', error);

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
