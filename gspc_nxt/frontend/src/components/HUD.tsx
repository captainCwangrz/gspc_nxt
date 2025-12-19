import { useGraphStore } from '../stores/useGraphStore';

export const HUD = () => {
  const requests = useGraphStore((state) => state.requests);

  return (
    <aside className="hud">
      <h2>Pending Requests</h2>
      {requests.length === 0 ? (
        <p>No pending requests.</p>
      ) : (
        <ul>
          {requests.map((request) => (
            <li key={request.id}>
              <span>@{request.username}</span>
              <span className="type">{request.type}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
};
