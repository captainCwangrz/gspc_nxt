import { useState } from 'react';
import api from '../lib/api';

interface ChatProps {
  userId: number;
  toId: number | null;
}

export const Chat = ({ userId, toId }: ChatProps) => {
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (!toId || !message.trim()) {
      return;
    }

    await api.post('/chat/send', {
      fromId: userId,
      toId,
      message,
    });
    setMessage('');
  };

  return (
    <section className="chat">
      <h2>Direct Message</h2>
      <p>Select a node to start chatting.</p>
      <div className="chat-input">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Say something..."
        />
        <button type="button" onClick={sendMessage}>
          Send
        </button>
      </div>
    </section>
  );
};
