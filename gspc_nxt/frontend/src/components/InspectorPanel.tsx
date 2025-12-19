import { useEffect, useMemo, useState } from 'react';
import { RELATIONSHIP_COLORS, RELATIONSHIP_LABELS } from '../lib/constants';
import { useGraphStore } from '../stores/useGraphStore';
import { useUserStore } from '../stores/useUserStore';

const DIRECTED_RELATIONSHIPS = new Set(['CRUSH']);

const getEndpointId = (value: number | { id: number }) =>
  typeof value === 'number' ? value : value.id;

interface InspectorPanelProps {
  selectedNodeId: number | null;
  onClose: () => void;
  onOpenChat: (peerId: number) => void;
}

export const InspectorPanel = ({
  selectedNodeId,
  onClose,
  onOpenChat,
}: InspectorPanelProps) => {
  const userId = useUserStore((state) => state.userId);
  const nodes = useGraphStore((state) => state.nodes);
  const links = useGraphStore((state) => state.links);
  const requestRelationship = useGraphStore((state) => state.requestRelationship);
  const updateRelationship = useGraphStore((state) => state.updateRelationship);
  const removeRelationship = useGraphStore((state) => state.removeRelationship);
  const [selectedType, setSelectedType] = useState<string>('CRUSH');

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId),
    [nodes, selectedNodeId],
  );

  const { outgoing, incoming, undirected } = useMemo(() => {
    if (!selectedNodeId || !userId) {
      return { outgoing: null, incoming: null, undirected: null };
    }
    const outgoingLink = links.find((link) => {
      const source = getEndpointId(link.source);
      const target = getEndpointId(link.target);
      return (
        source === userId &&
        target === selectedNodeId &&
        DIRECTED_RELATIONSHIPS.has(link.type)
      );
    });
    const incomingLink = links.find((link) => {
      const source = getEndpointId(link.source);
      const target = getEndpointId(link.target);
      return (
        source === selectedNodeId &&
        target === userId &&
        DIRECTED_RELATIONSHIPS.has(link.type)
      );
    });
    const undirectedLink = links.find((link) => {
      const source = getEndpointId(link.source);
      const target = getEndpointId(link.target);
      return (
        !DIRECTED_RELATIONSHIPS.has(link.type) &&
        ((source === userId && target === selectedNodeId) ||
          (source === selectedNodeId && target === userId))
      );
    });
    return {
      outgoing: outgoingLink ?? null,
      incoming: incomingLink ?? null,
      undirected: undirectedLink ?? null,
    };
  }, [links, selectedNodeId, userId]);

  const relationshipsCount = useMemo(() => {
    if (!selectedNodeId) {
      return 0;
    }
    return links.filter((link) => {
      const source = getEndpointId(link.source);
      const target = getEndpointId(link.target);
      return source === selectedNodeId || target === selectedNodeId;
    }).length;
  }, [links, selectedNodeId]);

  useEffect(() => {
    if (undirected?.type) {
      setSelectedType(undirected.type);
    } else if (outgoing?.type) {
      setSelectedType(outgoing.type);
    } else if (incoming?.type) {
      setSelectedType(incoming.type);
    }
  }, [incoming?.type, outgoing?.type, undirected?.type]);

  if (!selectedNode || !selectedNodeId) {
    return null;
  }

  const isSelf = selectedNode.id === userId;
  const mutualCrush =
    outgoing?.type === 'CRUSH' && incoming?.type === 'CRUSH';
  const hasRelationship = Boolean(outgoing || incoming || undirected);
  const canMessage = hasRelationship || selectedNode.last_msg_id > 0;
  const statusBadges = [
    outgoing && {
      label: RELATIONSHIP_LABELS[outgoing.type] ?? outgoing.type,
      sublabel: 'Sent ↗',
      color: RELATIONSHIP_COLORS[outgoing.type] ?? '#a5b4fc',
    },
    incoming && {
      label: RELATIONSHIP_LABELS[incoming.type] ?? incoming.type,
      sublabel: 'Received ↙',
      color: RELATIONSHIP_COLORS[incoming.type] ?? '#a5b4fc',
    },
    !outgoing &&
      !incoming &&
      undirected && {
        label: RELATIONSHIP_LABELS[undirected.type] ?? undirected.type,
        sublabel: 'Connected',
        color: RELATIONSHIP_COLORS[undirected.type] ?? '#a5b4fc',
      },
  ].filter(Boolean) as Array<{ label: string; sublabel: string; color: string }>;

  const handleRelationshipAction = async () => {
    if (!userId) {
      return;
    }
    if (hasRelationship) {
      await updateRelationship(userId, selectedNodeId, selectedType);
    } else {
      await requestRelationship(userId, selectedNodeId, selectedType);
    }
  };

  const handleRemove = async () => {
    if (!userId) {
      return;
    }
    await removeRelationship(userId, selectedNodeId);
  };

  return (
    <aside className="inspector-panel">
      <header>
        <div>
          <span className="panel-title">Inspector</span>
          <span className="panel-subtitle">Node details</span>
        </div>
        <button type="button" className="icon-close" onClick={onClose}>
          ✕
        </button>
      </header>
      <div className="inspector-body">
        <div className="inspector-profile">
          <img src={selectedNode.avatar} alt="" />
          <div>
            <h3>{selectedNode.name}</h3>
            <p>@{selectedNode.username}</p>
            <span>ID {selectedNode.id}</span>
          </div>
        </div>
        <p className="signature">{selectedNode.signature}</p>
        <div className="inspector-stats">
          <div>
            <span>Connections</span>
            <strong>{relationshipsCount}</strong>
          </div>
          <div>
            <span>Unread history</span>
            <strong>{selectedNode.last_msg_id > 0 ? 'Yes' : '—'}</strong>
          </div>
        </div>
        {mutualCrush ? (
          <div className="mutual-crush">💞 Mutual Crush</div>
        ) : (
          <div className="status-badges">
            {statusBadges.map((badge) => (
              <div key={badge.label + badge.sublabel} className="status-badge">
                <span style={{ color: badge.color }}>{badge.label}</span>
                <span>{badge.sublabel}</span>
              </div>
            ))}
          </div>
        )}
        {!isSelf ? (
          <div className="inspector-actions">
            {canMessage ? (
              <button type="button" onClick={() => onOpenChat(selectedNode.id)}>
                💬 Message
              </button>
            ) : null}
            {hasRelationship ? (
              <button type="button" className="danger" onClick={handleRemove}>
                💔 Remove
              </button>
            ) : null}
          </div>
        ) : null}
        {!isSelf ? (
          <div className="inspector-form">
            <label htmlFor="relationship-type">Relationship</label>
            <div className="form-row">
              <select
                id="relationship-type"
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
              >
                {Object.keys(RELATIONSHIP_LABELS).map((type) => (
                  <option key={type} value={type}>
                    {RELATIONSHIP_LABELS[type] ?? type}
                  </option>
                ))}
              </select>
              <button type="button" onClick={handleRelationshipAction}>
                {hasRelationship ? 'Update' : 'Request'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
