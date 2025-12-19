import { useEffect, useMemo, useState } from 'react';
import { useChatStore } from '../stores/useChatStore';
import { useGraphStore } from '../stores/useGraphStore';

interface ChatProps {
  userId: number;
  toId: number | null;
}

export const Chat = ({ userId, toId }: ChatProps) => {
  const [message, setMessage] = useState('');
  const nodes = useGraphStore((state) => state.nodes);
  const conversations = useChatStore((state) => state.conversations);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const loadConversation = useChatStore((state) => state.loadConversation);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const markRead = useChatStore((state) => state.markRead);

  const selectedPeer = useMemo(
    () => nodes.find((node) => node.id === toId),
    [nodes, toId],
  );

  const messages = toId ? conversations[toId] ?? [] : [];

  useEffect(() => {
    if (!toId || !userId) {
      return;
    }

    loadConversation(userId, toId);
  }, [loadConversation, toId, userId]);

  useEffect(() => {
    if (!toId || !userId || messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage) {
      markRead(userId, toId, lastMessage.id);
    }
  }, [markRead, messages, toId, userId]);

  const handleSend = async () => {
    if (!toId || !message.trim()) {
      return;
    }

    await sendMessage(userId, toId, message.trim());
    setMessage('');
  };

  return (
    <section className="chat">
      <header className="chat-header">
        <div>
          <h2>Direct Message</h2>
          <p>
            {selectedPeer
              ? `Chatting with ${selectedPeer.name} (@${selectedPeer.username})`
              : 'Select a node to start chatting.'}
          </p>
        </div>
        {toId && unreadCounts[toId] ? (
          <span className="chat-unread">{unreadCounts[toId]} new</span>
        ) : null}
      </header>
      <div className="chat-log">
        {toId ? (
          messages.length ? (
            messages.map((entry) => (
              <div
                key={entry.id}
                className={`chat-bubble ${
                  entry.from_id === userId ? 'outgoing' : 'incoming'
                }`}
              >
                <p>{entry.message}</p>
                <span>
                  {new Date(entry.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            ))
          ) : (
            <p className="chat-empty">No messages yet. Say hello ✨</p>
          )
        ) : (
          <p className="chat-empty">Pick someone from the graph to see messages.</p>
        )}
      </div>
      <div className="chat-input">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={toId ? 'Say something...' : 'Select a user first...'}
          disabled={!toId}
        />
        <button type="button" onClick={handleSend} disabled={!toId}>
          Send
        </button>
      </div>
    </section>
  );
};
