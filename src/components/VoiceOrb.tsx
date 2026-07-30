import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { VoiceState } from '../types';
import { cn } from '../lib/utils';

interface VoiceOrbProps {
  audioLevel: { volume: number; frequencies: number[] };
  voiceState: VoiceState;
  className?: string;
}

function AnimatedSphere({ audioLevel, voiceState }: { audioLevel: { volume: number; frequencies: number[] }; voiceState: VoiceState }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const vol = audioLevel?.volume ?? 0;

    // Gentle rotation
    meshRef.current.rotation.x = Math.sin(t * 0.2) * 0.1;
    meshRef.current.rotation.y = t * 0.15;

    // Pulse scale based on volume or voice state
    let scale = 1;
    if (voiceState === 'listening') scale = 1 + vol * 0.3 + Math.sin(t * 4) * 0.02;
    else if (voiceState === 'speaking') scale = 1 + vol * 0.2 + Math.sin(t * 2) * 0.015;
    else if (voiceState === 'thinking') scale = 1 + Math.sin(t * 1.5) * 0.01;
    else scale = 1 + Math.sin(t * 0.5) * 0.005;
    meshRef.current.scale.setScalar(scale);
  });

  const getColor = () => {
    switch (voiceState) {
      case 'listening': return '#7C3AED';
      case 'speaking': return '#8B5CF6';
      case 'thinking': return '#A78BFA';
      default: return '#6D28D9';
    }
  };

  const getSpeed = () => {
    switch (voiceState) {
      case 'listening': return 2;
      case 'speaking': return 1.5;
      case 'thinking': return 1;
      default: return 0.5;
    }
  };

  return (
    <Sphere ref={meshRef} args={[1, 64, 64]}>
      <MeshDistortMaterial
        color={getColor()}
        envMapIntensity={0.4}
        clearcoat={0.8}
        clearcoatRoughness={0.2}
        metalness={0.1}
        roughness={0.2}
        distort={0.15}
        speed={getSpeed()}
      />
    </Sphere>
  );
}

function ParticleRing({ audioLevel, voiceState }: { audioLevel: { volume: number; frequencies: number[] }; voiceState: VoiceState }) {
  const count = 300;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.6 + Math.random() * 0.4;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);
  const pointsRef = useRef<THREE.Points>(null);

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sizes = new Float32Array(count).fill(0.02);
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [positions, count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    const t = clock.getElapsedTime();
    const vol = audioLevel?.volume ?? 0;
    const pulse = voiceState === 'listening' || voiceState === 'speaking' ? 1 + vol * 0.5 : 1;

    pointsRef.current.rotation.y = t * 0.1 * pulse;
    pointsRef.current.rotation.x = Math.sin(t * 0.05) * 0.1;

    const sizes = pointsRef.current.geometry.attributes.size;
    if (sizes) {
      const array = sizes.array as Float32Array;
      for (let i = 0; i < count; i++) {
        array[i] = voiceState === 'idle' ? 0.02 : 0.03 + Math.sin(t * 2 + i) * 0.015 * pulse;
      }
      sizes.needsUpdate = true;
    }
  });

  return (
    <points ref={pointsRef} geometry={particleGeometry}>
      <pointsMaterial
        size={0.025}
        color={voiceState === 'idle' ? '#6D28D9' : '#8B5CF6'}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function RingViz({ audioLevel, voiceState }: { audioLevel: { volume: number; frequencies: number[] }; voiceState: VoiceState }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const vol = audioLevel?.volume ?? 0;

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const t = clock.getElapsedTime();
    const pulse = voiceState === 'listening' || voiceState === 'speaking' ? 1 + vol * 0.8 : 1;
    ringRef.current.scale.setScalar(pulse);
    ringRef.current.rotation.z = t * 0.3;
    ringRef.current.rotation.x = Math.sin(t * 0.2) * 0.2;
  });

  const getOpacity = () => {
    switch (voiceState) {
      case 'listening': return 0.4;
      case 'speaking': return 0.3;
      case 'thinking': return 0.2;
      default: return 0.1;
    }
  };

  return (
    <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[1.3, 1.5, 64]} />
      <meshBasicMaterial color="#7C3AED" transparent opacity={getOpacity()} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

export function VoiceOrb({ audioLevel, voiceState, className }: VoiceOrbProps) {
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      <Canvas camera={{ position: [0, 0, 3.5], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-3, -2, -3]} intensity={0.3} color="#7C3AED" />

        <AnimatedSphere audioLevel={audioLevel} voiceState={voiceState} />
        <ParticleRing audioLevel={audioLevel} voiceState={voiceState} />
        <RingViz audioLevel={audioLevel} voiceState={voiceState} />
      </Canvas>
    </div>
  );
}
