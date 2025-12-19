import { RELATIONSHIP_LABELS } from '../lib/constants';
import { useChatStore } from '../stores/useChatStore';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';

interface HUDProps {
  onOpenChat: (peerId: number) => void;
}

export const HUD = ({ onOpenChat }: HUDProps) => {
  const userId = useUserStore((state) => state.userId);
  const requests = useGraphStore((state) => state.requests);
  const nodes = useGraphStore((state) => state.nodes);
  const acceptRequest = useGraphStore((state) => state.acceptRequest);
  const rejectRequest = useGraphStore((state) => state.rejectRequest);
  const unreadCounts = useChatStore((state) => state.unreadCounts);

  const notifications = Object.entries(unreadCounts)
    .filter(([, count]) => count > 0)
    .map(([peerId, count]) => {
      const numericId = Number(peerId);
      const user = nodes.find((node) => node.id === numericId);
      return {
        id: numericId,
        count,
        label: user ? `${user.name} (@${user.username})` : `User ${peerId}`,
        avatar: user?.avatar,
      };
    });

  if (notifications.length === 0 && requests.length === 0) {
    return null;
  }

  return (
    <aside className="notification-hud">
      {notifications.length > 0 ? (
        <section className="notif-stack">
          <div className="notif-header">📬 Unread Messages</div>
          <div className="notif-list">
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className="notif-card"
                onClick={() => onOpenChat(notification.id)}
              >
                {notification.avatar ? (
                  <img src={notification.avatar} alt="" />
                ) : (
                  <span className="notif-avatar-fallback">💬</span>
                )}
                <div>
                  <strong>{notification.label}</strong>
                  <span>{notification.count} new messages</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {requests.length > 0 ? (
        <section className="notif-stack">
          <div className="notif-header">⚡ Incoming Requests</div>
          <div className="notif-list">
            {requests.map((request) => (
              <div key={request.id} className="notif-card request-card">
                <div>
                  <strong>@{request.username}</strong>
                  <span>{RELATIONSHIP_LABELS[request.type] ?? request.type}</span>
                </div>
                <div className="notif-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() =>
                      userId ? rejectRequest(userId, request.id) : null
                    }
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      userId ? acceptRequest(userId, request.id) : null
                    }
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </aside>
  );
};
