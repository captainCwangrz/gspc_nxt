import ForceGraph3D from 'react-force-graph-3d';
import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3-force';
import * as THREE from 'three';
import { RELATIONSHIP_COLORS, RELATIONSHIP_PARTICLES } from '../lib/constants';
import { useGraphStore } from '../stores/useGraphStore';

interface WorldGraphProps {
  onNodeClick?: (nodeId: number | null) => void;
  focusNodeId?: number | null;
}

const DUST_VERTEX_SHADER = `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute vec3 starColor;
  attribute float size;
  attribute float phase;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vColor = starColor;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    float projSize = size * (1000.0 / -mvPosition.z) * uPixelRatio;
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = clamp(projSize, 0.0, 28.0);

    float t = 0.5 + 0.5 * sin(uTime * 2.8 + phase);
    float eased = t * t * (3.0 - 2.0 * t);
    float sizeFactor = clamp((size - 3.0) / 24.0, 0.0, 1.0);
    float sizeEase = pow(sizeFactor, 1.05);
    float scaledAmplitude = 0.9 * mix(0.55, 1.08, sizeEase);
    vOpacity = (0.78 + scaledAmplitude * eased);
  }
`;

const DUST_FRAGMENT_SHADER = `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vOpacity;

  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float dist = length(xy);
    float core = smoothstep(0.1, 0.0, dist);
    float halo = smoothstep(0.4, 0.0, dist) * 0.4;
    float alpha = (core + halo);
    vec3 boosted = (vColor + vec3(0.12, 0.12, 0.24) * (halo * 2.0)) * (1.12 + halo * 0.12);
    gl_FragColor = vec4(boosted * vOpacity, alpha * vOpacity * uOpacity);
  }
`;

const getNodeId = (value: number | { id: number }) =>
  typeof value === 'number' ? value : value.id;

const getVisibleNetwork = (
  nodes: { id: number }[],
  links: { source: number | { id: number }; target: number | { id: number } }[],
  centerId: number,
) => {
  const visible = new Set<number>();
  const adjacency = new Map<number, Set<number>>();

  nodes.forEach((node) => {
    adjacency.set(node.id, new Set());
  });

  links.forEach((link) => {
    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    if (!adjacency.has(sourceId)) {
      adjacency.set(sourceId, new Set());
    }
    if (!adjacency.has(targetId)) {
      adjacency.set(targetId, new Set());
    }
    adjacency.get(sourceId)?.add(targetId);
    adjacency.get(targetId)?.add(sourceId);
  });

  visible.add(centerId);

  const depthOne = adjacency.get(centerId) ?? new Set<number>();
  depthOne.forEach((id) => visible.add(id));

  depthOne.forEach((id) => {
    const neighbors = adjacency.get(id);
    if (!neighbors) {
      return;
    }
    neighbors.forEach((neighborId) => visible.add(neighborId));
  });

  return visible;
};

export const WorldGraph = ({ onNodeClick, focusNodeId }: WorldGraphProps) => {
  const graphRef = useRef<ForceGraph3D>(null);
  const nodes = useGraphStore((state) => state.nodes);
  const links = useGraphStore((state) => state.links);

  const nodeDegrees = useMemo(() => {
    const degreeMap = new Map<number, number>();
    links.forEach((link) => {
      const sourceId = getNodeId(link.source);
      const targetId = getNodeId(link.target);
      degreeMap.set(sourceId, (degreeMap.get(sourceId) ?? 0) + 1);
      degreeMap.set(targetId, (degreeMap.get(targetId) ?? 0) + 1);
    });
    return degreeMap;
  }, [links]);

  const graphData = useMemo(
    () => ({
      nodes,
      links,
    }),
    [nodes, links],
  );

  const visibleNodeIds = useMemo(() => {
    if (!focusNodeId) {
      return null;
    }
    return getVisibleNetwork(nodes, links, focusNodeId);
  }, [focusNodeId, links, nodes]);

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

      const labelTexture = new THREE.CanvasTexture(createLabelCanvas(node.name ?? ''));
      labelTexture.needsUpdate = true;
      const labelPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(11, 2.8),
        new THREE.MeshBasicMaterial({
          map: labelTexture,
          transparent: true,
          depthWrite: false,
        }),
      );
      labelPlane.position.set(0, -6.4, 0);
      labelPlane.renderOrder = 2;
      labelPlane.onBeforeRender = (_renderer, _scene, camera) => {
        labelPlane.quaternion.copy(camera.quaternion);
      };
      group.add(labelPlane);

      return group;
    };
  }, [textureLoader]);

  const dustMaterialsRef = useRef<Set<THREE.ShaderMaterial>>(new Set());

  const createLinkObject = useMemo(() => {
    return (link: { type?: string }) => {
      if (!link.type || !RELATIONSHIP_PARTICLES[link.type]) {
        return null;
      }

      const particleCount = 400;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      const sizes = new Float32Array(particleCount);
      const phases = new Float32Array(particleCount);

      const baseColor = new THREE.Color(
        RELATIONSHIP_COLORS[link.type] ?? '#cbd5f5',
      );

      for (let i = 0; i < particleCount; i += 1) {
        const r = 3 * Math.sqrt(Math.random());
        const theta = Math.random() * Math.PI * 2;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta);
        const z = Math.random() - 0.5;

        const index = i * 3;
        positions[index] = x;
        positions[index + 1] = y;
        positions[index + 2] = z;

        const varied = baseColor.clone();
        const hsl = { h: 0, s: 0, l: 0 };
        varied.getHSL(hsl);
        hsl.s = Math.min(1, hsl.s * (1.05 + Math.random() * 0.35));
        hsl.l = Math.min(1, hsl.l * (0.98 + Math.random() * 0.18));
        const finalColor = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l);
        colors[index] = finalColor.r;
        colors[index + 1] = finalColor.g;
        colors[index + 2] = finalColor.b;

        const rand = Math.random();
        const sizeBias = Math.pow(rand, 1.8);
        sizes[i] = 1 + sizeBias * 3;

        phases[i] = Math.random() * Math.PI * 2;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('starColor', new THREE.BufferAttribute(colors, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      geo.setAttribute('phase', new THREE.BufferAttribute(phases, 1));

      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 1.0 },
          uPixelRatio: { value: window.devicePixelRatio || 1.0 },
        },
        vertexShader: DUST_VERTEX_SHADER,
        fragmentShader: DUST_FRAGMENT_SHADER,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      dustMaterialsRef.current.add(mat);

      const points = new THREE.Points(geo, mat);
      points.name = 'dust-points';
      points.raycast = () => {};

      const container = new THREE.Group();
      container.name = 'dust-container';
      container.add(points);
      return container;
    };
  }, []);

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
    let frameId = 0;
    const animateDust = () => {
      const time = performance.now() * 0.0012;
      dustMaterialsRef.current.forEach((material) => {
        material.uniforms.uTime.value = time;
      });
      frameId = requestAnimationFrame(animateDust);
    };
    animateDust();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    const pressedKeys = new Set<string>();
    let frameId = 0;
    let lastTime = performance.now();

    const animate = (time: number) => {
      if (graphRef.current && pressedKeys.size > 0) {
        const camera = graphRef.current.camera();
        const controls = graphRef.current.controls();
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
        const movement = new THREE.Vector3();
        if (pressedKeys.has('w')) {
          movement.add(forward);
        }
        if (pressedKeys.has('s')) {
          movement.sub(forward);
        }
        if (pressedKeys.has('a')) {
          movement.sub(right);
        }
        if (pressedKeys.has('d')) {
          movement.add(right);
        }

        if (movement.lengthSq() > 0) {
          const delta = (time - lastTime) / 1000;
          const speed = 40;
          movement.normalize().multiplyScalar(speed * delta);
          camera.position.add(movement);
          if (controls) {
            controls.target.add(movement);
            controls.update();
          }
        }
      }
      lastTime = time;
      frameId = requestAnimationFrame(animate);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
        return;
      }
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        pressedKeys.add(key);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if (['w', 'a', 's', 'd'].includes(key)) {
        pressedKeys.delete(key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    frameId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    if (!graphRef.current) {
      return;
    }

    const chargeForce = graphRef.current.d3Force('charge');
    if (chargeForce) {
      chargeForce.strength((node: { id?: number }) => {
        const nodeId = node.id ?? 0;
        const degree = nodeDegrees.get(nodeId) ?? 0;
        return -180 + -60 * degree;
      });
    }

    const linkForce = graphRef.current.d3Force('link');
    if (linkForce) {
      linkForce.distance((link: { type?: string }) => {
        switch (link.type) {
          case 'DATING':
          case 'BEST_FRIEND':
            return 100;
          case 'CRUSH':
          case 'SIBLING':
          case 'BROTHER':
          case 'SISTER':
            return 180;
          case 'BEEFING':
            return 350;
          default:
            return 160;
        }
      });
    }

    graphRef.current.d3Force('collide', d3.forceCollide(15));
  }, [links, nodeDegrees]);

  useEffect(() => {
    if (!graphRef.current || !focusNodeId) {
      return;
    }
    const node = nodes.find((item) => item.id === focusNodeId) as
      | (typeof nodes)[number] & { x?: number; y?: number; z?: number }
      | undefined;
    if (!node || node.x == null || node.y == null || node.z == null) {
      return;
    }
    const distance = 60;
    const distRatio = 1 + distance / Math.hypot(node.x, node.y, node.z);
    graphRef.current.cameraPosition(
      {
        x: node.x * distRatio,
        y: node.y * distRatio,
        z: node.z * distRatio,
      },
      node,
      900,
    );
  }, [focusNodeId, nodes]);

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
        nodeVisibility={(node) =>
          visibleNodeIds ? visibleNodeIds.has(node.id as number) : true
        }
        linkColor={(link) =>
          RELATIONSHIP_COLORS[link.type as string] ?? 'rgba(148, 163, 184, 0.4)'
        }
        linkOpacity={0.18}
        linkWidth={(link) => (link.type === 'BEEFING' ? 1.4 : 0.8)}
        linkVisibility={(link) => {
          if (!visibleNodeIds) {
            return true;
          }
          const sourceId = getNodeId(link.source as number | { id: number });
          const targetId = getNodeId(link.target as number | { id: number });
          return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
        }}
        linkThreeObject={createLinkObject}
        linkThreeObjectExtend
        linkPositionUpdate={(obj, { start, end }) => {
          if (!obj) {
            return true;
          }
          const distance = start.distanceTo(end);
          const midpoint = new THREE.Vector3()
            .addVectors(start, end)
            .multiplyScalar(0.5);
          obj.position.copy(midpoint);
          const direction = new THREE.Vector3().subVectors(end, start).normalize();
          obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
          obj.scale.set(1, 1, distance);

          const dustPoints = obj.children.find((child) => child.name === 'dust-points');
          if (dustPoints && dustPoints instanceof THREE.Points) {
            const count = Math.min(400, Math.floor(distance * 1.2));
            dustPoints.geometry.setDrawRange(0, count);
          }
          return true;
        }}
        onNodeClick={(node) => {
          const nodeId = typeof node.id === 'number' ? node.id : null;
          onNodeClick?.(nodeId);
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
          onNodeClick?.(null);
        }}
      />
    </div>
  );
};
