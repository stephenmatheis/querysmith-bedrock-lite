'use client';

import { useState } from 'react';
import { ChatMessage } from '@/components/chat-message';
import { ChatInputPanel } from '@/components/chat-input-panel';
import styles from './chat.module.scss';
import { Message } from '@/types/types';

export function Chat({ sessionId }: { sessionId?: string; applicationId?: string }) {
    console.log('Chat Session ID:', sessionId);

    const [running, setRunning] = useState<boolean>(false);
    const [messageHistory, setMessageHistory] = useState<Message[]>([]);

    return (
        <div className="full-page">
            <div className={styles.chat}>
                {messageHistory.length == 0 ? (
                    <h1 className={styles.greeting}>
                        <div className={styles.dark}>Hello there.</div>
                        <div className={styles.light}>How can I help you today?</div>
                    </h1>
                ) : (
                    <div className={styles.messages}>
                        {messageHistory.map((message, idx) => {
                            return <ChatMessage key={idx} message={message} />;
                        })}
                    </div>
                )}

                <ChatInputPanel
                    running={running}
                    setRunning={setRunning}
                    messageHistory={messageHistory}
                    setMessageHistory={setMessageHistory}
                />
            </div>
        </div>
    );
}
