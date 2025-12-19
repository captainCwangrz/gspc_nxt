import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../components/Chat';
import { HUD } from '../components/HUD';
import { WorldGraph } from '../components/WorldGraph';
import { getSocket } from '../lib/socket';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';

export const DashboardPage = () => {
  const userId = useUserStore((state) => state.userId);
  const refreshGraph = useGraphStore((state) => state.refreshGraph);
  const applyGraphUpdate = useGraphStore((state) => state.applyGraphUpdate);
  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    refreshGraph(userId);
    const socket = getSocket();
    socket.on('graph_update', applyGraphUpdate);

    return () => {
      socket.off('graph_update', applyGraphUpdate);
    };
  }, [applyGraphUpdate, navigate, refreshGraph, userId]);

  return (
    <div className="dashboard">
      <header>
        <h1>Gossip Sphere</h1>
      </header>
      <main>
        <WorldGraph onSelectNode={setSelectedPeerId} />
        <HUD />
        <Chat userId={userId ?? 0} toId={selectedPeerId} />
      </main>
    </div>
  );
};
