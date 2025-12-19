import ForceGraph3D from 'react-force-graph-3d';
import { useEffect, useMemo, useRef } from 'react';
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
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.Texture(canvas);
    }
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.35, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.35)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const createLabelCanvas = (label: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return canvas;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '600 20px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(56, 189, 248, 0.55)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(label, canvas.width / 2, 34);
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
      labelSprite.position.set(0, -6.2, 0);
      labelSprite.scale.set(10.5, 2.6, 1);
      group.add(labelSprite);

      return group;
    };
  }, [textureLoader]);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const scene = graphRef.current.scene();
    const starGroup = new THREE.Group();
    starGroup.name = 'starfield';

    const createPoints = (count: number, size: number, opacity: number) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const colors = new Float32Array(count * 3);
      const palette = [
        new THREE.Color('#fef9c3'),
        new THREE.Color('#a5f3fc'),
        new THREE.Color('#fbcfe8'),
        new THREE.Color('#c4b5fd'),
        new THREE.Color('#fca5a5'),
      ];

      for (let i = 0; i < count; i += 1) {
        const radius = THREE.MathUtils.randFloat(250, 1200);
        const theta = Math.acos(THREE.MathUtils.randFloatSpread(2));
        const phi = THREE.MathUtils.randFloat(0, Math.PI * 2);
        const index = i * 3;
        positions[index] = radius * Math.sin(theta) * Math.cos(phi);
        positions[index + 1] = radius * Math.sin(theta) * Math.sin(phi);
        positions[index + 2] = radius * Math.cos(theta);

        const color = palette[Math.floor(Math.random() * palette.length)].clone();
        const boost = THREE.MathUtils.randFloat(0.8, 1.35);
        color.multiplyScalar(boost);
        colors[index] = color.r;
        colors[index + 1] = color.g;
        colors[index + 2] = color.b;
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size,
        map: starTexture,
        alphaMap: starTexture,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Points(geometry, material);
    };

    const stars = createPoints(3200, 1.9, 0.9);
    const dust = createPoints(1800, 3.6, 0.3);
    dust.rotation.z = Math.PI / 4;

    starGroup.add(stars);
    starGroup.add(dust);
    scene.add(starGroup);

    let frameId = 0;
    const starMaterial = stars.material as THREE.PointsMaterial;
    const dustMaterial = dust.material as THREE.PointsMaterial;
    const animate = () => {
      const time = performance.now() * 0.0012;
      starMaterial.opacity = 0.75 + Math.sin(time) * 0.15;
      dustMaterial.opacity = 0.2 + Math.cos(time * 0.8) * 0.08;
      starGroup.rotation.y += 0.0003;
      starGroup.rotation.x += 0.0001;
      frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameId);
      scene.remove(starGroup);
      starGroup.traverse((child) => {
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => mat.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!graphRef.current) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }

      const key = event.key.toLowerCase();
      if (!['w', 'a', 's', 'd'].includes(key)) {
        return;
      }

      const camera = graphRef.current.camera();
      const controls = graphRef.current.controls();
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();

      const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
      const speed = 6;
      const movement = new THREE.Vector3();

      if (key === 'w') {
        movement.add(forward);
      }
      if (key === 's') {
        movement.sub(forward);
      }
      if (key === 'a') {
        movement.sub(right);
      }
      if (key === 'd') {
        movement.add(right);
      }

      if (movement.lengthSq() === 0) {
        return;
      }

      movement.normalize().multiplyScalar(speed);
      camera.position.add(movement);
      if (controls) {
        controls.target.add(movement);
        controls.update();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="world-graph">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#05050f"
        enableNodeDrag={false}
        nodeLabel={(node) => `${node.name} (@${node.username})`}
        nodeAutoColorBy="username"
        nodeThreeObject={createNodeObject}
        linkColor={(link) =>
          RELATIONSHIP_COLORS[link.type as string] ?? 'rgba(148, 163, 184, 0.4)'
        }
        linkOpacity={0.18}
        linkWidth={(link) => (link.type === 'BEEFING' ? 1.4 : 0.8)}
        linkDirectionalParticles={(link) => (link.type === 'CRUSH' ? 18 : 10)}
        linkDirectionalParticleWidth={1.8}
        linkDirectionalParticleSpeed={(link) => (link.type === 'CRUSH' ? 0.02 : 0.015)}
        linkDirectionalParticleColor={(link) =>
          RELATIONSHIP_COLORS[link.type as string] ?? '#cbd5f5'
        }
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
        onBackgroundClick={() => {
          onSelectNode?.(null);
        }}
      />
    </div>
  );
};
