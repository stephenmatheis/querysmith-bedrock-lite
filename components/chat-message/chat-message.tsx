import { Message } from '@/types/types';
import styles from './chat-message.module.scss';

interface ChatMessageProps {
    message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
    return (
        <div className={`${styles.chatMessage} ${message.role === 'user' ? styles.user : styles.assistant}`}>
            <div className={styles.messageBubble}>{message.content.trim()}</div>
        </div>
    );
}
