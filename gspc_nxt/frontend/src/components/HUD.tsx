import { RELATIONSHIP_LABELS } from '../lib/constants';
import { useChatStore } from '../stores/useChatStore';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';

export const HUD = () => {
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
      };
    });

  return (
    <aside className="hud">
      <section className="hud-block">
        <h2>Notifications</h2>
        {notifications.length === 0 ? (
          <p className="muted">All caught up.</p>
        ) : (
          <ul>
            {notifications.map((notification) => (
              <li key={notification.id}>
                <span>{notification.label}</span>
                <span className="badge">{notification.count} new</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="hud-block">
        <h2>Pending Requests</h2>
        {requests.length === 0 ? (
          <p className="muted">No pending requests.</p>
        ) : (
          <ul>
            {requests.map((request) => (
              <li key={request.id}>
                <div>
                  <span>@{request.username}</span>
                  <span className="type">
                    {RELATIONSHIP_LABELS[request.type] ?? request.type}
                  </span>
                </div>
                <div className="actions">
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
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
};
