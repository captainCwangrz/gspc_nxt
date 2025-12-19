import ForceGraph3D from 'react-force-graph-3d';
import { useMemo, useRef } from 'react';
import { useGraphStore } from '../stores/useGraphStore';

interface WorldGraphProps {
  onSelectNode?: (nodeId: number | null) => void;
}

export const WorldGraph = ({ onSelectNode }: WorldGraphProps) => {
  const graphRef = useRef<ForceGraph3D>(null);
  const nodes = useGraphStore((state) => state.nodes);
  const links = useGraphStore((state) => state.links);

  const graphData = useMemo(
    () => ({
      nodes,
      links,
    }),
    [nodes, links],
  );

  return (
    <div className="world-graph">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        nodeLabel={(node) => `${node.name} (@${node.username})`}
        nodeAutoColorBy="username"
        linkDirectionalParticles={(link) => (link.type === 'CRUSH' ? 4 : 0)}
        linkDirectionalParticleWidth={2}
        onNodeClick={(node) => {
          const nodeId = typeof node.id === 'number' ? node.id : null;
          onSelectNode?.(nodeId);
        }}
      />
    </div>
  );
};
