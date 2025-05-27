import { Message } from '@/types/types';
import styles from './chat-message.module.scss';

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    const content = message.content.trim();

    return (
        <div className={`${styles.chatMessage} ${message.role === 'user' ? styles.user : styles.assistant}`}>
            <div className={styles.messageBubble}>{content || '...'}</div>
        </div>
    );
}
