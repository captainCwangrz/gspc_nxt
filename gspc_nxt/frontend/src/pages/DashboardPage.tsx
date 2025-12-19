import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chat } from '../components/Chat';
import { HUD } from '../components/HUD';
import { InspectorPanel } from '../components/InspectorPanel';
import { ProfilePanel } from '../components/ProfilePanel';
import { SearchBar } from '../components/SearchBar';
import { WorldGraph } from '../components/WorldGraph';
import { getSocket } from '../lib/socket';
import { useChatStore } from '../stores/useChatStore';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';
import { toast } from 'react-hot-toast';

export const DashboardPage = () => {
  const userId = useUserStore((state) => state.userId);
  const refreshGraph = useGraphStore((state) => state.refreshGraph);
  const applyGraphUpdate = useGraphStore((state) => state.applyGraphUpdate);
  const syncReadReceipts = useChatStore((state) => state.syncReadReceipts);
  const setActivePeer = useChatStore((state) => state.setActivePeer);
  const handleIncomingMessage = useChatStore((state) => state.handleIncomingMessage);
  const incrementUnread = useChatStore((state) => state.incrementUnread);
  const [selectedPeerId, setSelectedPeerId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<number | null>(null);
  const [inspectorNodeId, setInspectorNodeId] = useState<number | null>(null);
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
    socket.on('new_msg', (payload: { toId: number; fromId: number; id: number }) => {
      if (payload.toId !== userId && payload.fromId !== userId) {
        return;
      }
      const peerId = payload.fromId === userId ? payload.toId : payload.fromId;
      if (!(isChatOpen && selectedPeerId === peerId)) {
        const lastToastedKey = `last_toasted_msg_${userId}_${peerId}`;
        const lastToastedId = Number(sessionStorage.getItem(lastToastedKey) ?? '0');
        if (payload.id > lastToastedId) {
          toast.info(`New message from ${peerId}`);
          sessionStorage.setItem(lastToastedKey, payload.id.toString());
          incrementUnread(peerId);
        }
      }
      handleIncomingMessage(userId, peerId);
    });

    return () => {
      socket.off('graph_update', applyGraphUpdate);
      socket.off('new_msg');
    };
  }, [
    applyGraphUpdate,
    handleIncomingMessage,
    incrementUnread,
    isChatOpen,
    navigate,
    refreshGraph,
    selectedPeerId,
    syncReadReceipts,
    userId,
  ]);

  useEffect(() => {
    setActivePeer(isChatOpen ? selectedPeerId : null);
  }, [isChatOpen, selectedPeerId, setActivePeer]);

  const handleOpenChat = (peerId: number) => {
    setSelectedPeerId(peerId);
    setIsChatOpen(true);
  };

  const handleNodeClick = (nodeId: number | null) => {
    if (nodeId) {
      setInspectorNodeId(nodeId);
      setFocusNodeId(nodeId);
    } else {
      setInspectorNodeId(null);
      setFocusNodeId(null);
    }
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
  };

  const handleFocusNode = (nodeId: number) => {
    setFocusNodeId(nodeId);
  };

  return (
    <div className="dashboard">
      <main className="dashboard-main">
        <WorldGraph onNodeClick={handleNodeClick} focusNodeId={focusNodeId} />
        <SearchBar onFocusNode={handleFocusNode} />
        <ProfilePanel onZoomSelf={() => (userId ? handleFocusNode(userId) : null)} />
        <HUD onOpenChat={handleOpenChat} />
        <InspectorPanel
          selectedNodeId={inspectorNodeId}
          onClose={() => setInspectorNodeId(null)}
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
