import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../components/Chat';
import { HUD } from '../components/HUD';
import { InspectorPanel } from '../components/InspectorPanel';
import { WorldGraph } from '../components/WorldGraph';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../stores/useChatStore';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';

export const DashboardPage = () => {
  const userId = useUserStore((state) => state.userId);
  const refreshGraph = useGraphStore((state) => state.refreshGraph);
  const applyGraphUpdate = useGraphStore((state) => state.applyGraphUpdate);
  const syncReadReceipts = useChatStore((state) => state.syncReadReceipts);
  const setActivePeer = useChatStore((state) => state.setActivePeer);
  const handleIncomingMessage = useChatStore((state) => state.handleIncomingMessage);
  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
  const [inspectorNodeId, setInspectorNodeId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId) {
      navigate('/');
      return;
    }

    refreshGraph(userId);
    syncReadReceipts(userId);
    const socket = getSocket();
    socket.on('graph_update', applyGraphUpdate);
    socket.on('new_msg', (payload: { toId: number; fromId: number }) => {
      if (payload.toId !== userId && payload.fromId !== userId) {
        return;
      }
      const peerId = payload.fromId === userId ? payload.toId : payload.fromId;
      handleIncomingMessage(userId, peerId);
    });

    return () => {
      socket.off('graph_update', applyGraphUpdate);
      socket.off('new_msg');
    };
  }, [applyGraphUpdate, handleIncomingMessage, navigate, refreshGraph, syncReadReceipts, userId]);

  useEffect(() => {
    setActivePeer(isChatOpen ? selectedPeerId : null);
  }, [isChatOpen, selectedPeerId, setActivePeer]);

  const handleOpenChat = (peerId: number) => {
    setSelectedPeerId(peerId);
    setInspectorNodeId(peerId);
    setIsChatOpen(true);
  };

  const handleSelectNode = (nodeId: number | null) => {
    setInspectorNodeId(nodeId);
  };

  const handleCloseInspector = () => {
    setInspectorNodeId(null);
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="dashboard">
      <header>
        <div>
          <h1>Gossip Sphere</h1>
          <p>Track the latest whispers across your social constellation.</p>
        </div>
      </header>
      <main className="dashboard-main">
        <WorldGraph onSelectNode={handleSelectNode} />
        <HUD onOpenChat={handleOpenChat} />
        <InspectorPanel
          selectedNodeId={inspectorNodeId}
          onClose={handleCloseInspector}
          onOpenChat={handleOpenChat}
        />
        <Chat
          userId={userId ?? 0}
          toId={selectedPeerId}
          isOpen={isChatOpen}
          onClose={handleCloseChat}
        />
      </main>
    </div>
  );
};
