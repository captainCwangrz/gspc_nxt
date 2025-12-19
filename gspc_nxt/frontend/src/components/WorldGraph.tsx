import ForceGraph3D from 'react-force-graph-3d';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RELATIONSHIP_COLORS } from '../lib/constants';
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

  const textureLoader = useMemo(() => new THREE.TextureLoader(), []);

  const createLabelCanvas = (label: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return canvas;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.fillRect(0, 12, canvas.width, 40);
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#e2e8f0';
    ctx.textAlign = 'center';
    ctx.fillText(label, canvas.width / 2, 38);
    return canvas;
  };

  const createNodeObject = useMemo(() => {
    return (node: { avatar?: string; name?: string }) => {
      const group = new THREE.Group();
      const avatarTexture = node.avatar
        ? textureLoader.load(node.avatar)
        : null;

      const spriteMaterial = new THREE.SpriteMaterial({
        map: avatarTexture ?? undefined,
        color: avatarTexture ? '#ffffff' : '#93c5fd',
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      sprite.scale.set(6, 6, 1);
      group.add(sprite);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(3.5, 4.2, 32),
        new THREE.MeshBasicMaterial({ color: '#7c3aed', transparent: true, opacity: 0.6 }),
      );
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      const labelSprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(createLabelCanvas(node.name ?? '')),
          transparent: true,
        }),
      );
      labelSprite.position.set(0, -5, 0);
      labelSprite.scale.set(12, 3.2, 1);
      group.add(labelSprite);

      return group;
    };
  }, [textureLoader]);

  return (
    <div className="world-graph">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#05050f"
        nodeLabel={(node) => `${node.name} (@${node.username})`}
        nodeAutoColorBy="username"
        nodeThreeObject={createNodeObject}
        linkColor={(link) =>
          RELATIONSHIP_COLORS[link.type as string] ?? 'rgba(148, 163, 184, 0.4)'
        }
        linkOpacity={0.6}
        linkWidth={(link) => (link.type === 'BEEFING' ? 2.5 : 1.5)}
        linkDirectionalParticles={(link) => (link.type === 'CRUSH' ? 6 : 2)}
        linkDirectionalParticleWidth={2.5}
        linkDirectionalParticleSpeed={0.008}
        onNodeClick={(node) => {
          const nodeId = typeof node.id === 'number' ? node.id : null;
          onSelectNode?.(nodeId);
          if (graphRef.current && node.x && node.y && node.z) {
            const distance = 60;
            const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
            graphRef.current.cameraPosition(
              {
                x: node.x * distRatio,
                y: node.y * distRatio,
                z: node.z * distRatio,
              },
              node,
              1200,
            );
          }
        }}
      />
    </div>
  );
};
