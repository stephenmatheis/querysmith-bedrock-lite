'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ChatMessage } from '@/components/chat-message';
import { ChatInputPanel } from '@/components/chat-input-panel';
import { Message } from '@/types/types';
import styles from './chat.module.scss';

export function Chat({ sessionId: existingSessionId }: { sessionId?: string; applicationId?: string }) {
    const sessionId = existingSessionId || uuidv4();
    const [running, setRunning] = useState<boolean>(false);
    const [messageHistory, setMessageHistory] = useState<Message[]>([]);

    console.log('Existing Session ID:', existingSessionId);
    console.log('Session ID:', sessionId);

    return (
        <div className={styles.chat}>
            {messageHistory.length == 0 ? (
                <h1 className={styles.greeting}>
                    <span className={styles.dark}>Hello there.</span>{' '}
                    <span className={styles.light}>How can I help you today?</span>
                </h1>
            ) : (
                <div className={styles.messages}>
                    {messageHistory.map((message, idx) => {
                        return <ChatMessage key={idx} message={message} />;
                    })}
                </div>
            )}
            <ChatInputPanel
                sessionId={sessionId}
                running={running}
                setRunning={setRunning}
                messageHistory={messageHistory}
                setMessageHistory={setMessageHistory}
            />
        </div>
    );
}
