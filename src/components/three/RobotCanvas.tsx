'use client';

import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { useState } from 'react';
import * as THREE from 'three';
import { Robot } from './Robot';

/**
 * Full-viewport transparent canvas layered above the page with
 * pointer-events disabled: the robot draws over the DOM, the DOM keeps every
 * click. Pointer data reaches the robot through the shared `pointer` object.
 */
export default function RobotCanvas() {
  // Drop resolution on slow GPUs instead of dropping frames. Phones ship 3x
  // panels on modest GPUs, so they get a tighter ceiling than desktops.
  const maxDpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.25 : 1.75);
  const [dpr, setDpr] = useState(maxDpr);
  return (
    <Canvas
      className="robot-canvas"
      dpr={dpr}
      camera={{ position: [0, 0, 14], fov: 30, near: 0.1, far: 60 }}
      gl={{
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.05,
      }}
      style={{ pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 7]} intensity={2.1} color="#ffffff" />
      <directionalLight position={[-6, 2, -4]} intensity={3.2} color="#46e6ff" />
      <directionalLight position={[6, 1, -4]} intensity={2.8} color="#2563eb" />

      {/* Studio reflections generated on the GPU — nothing downloaded */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 2]} rotation-x={Math.PI / 2} scale={[12, 4, 1]} />
        <Lightformer form="rect" intensity={1.8} color="#5ef6ff" position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 2.5, 1]} />
        <Lightformer form="rect" intensity={1.6} color="#60a5fa" position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[8, 2.5, 1]} />
        <Lightformer form="ring" intensity={2.2} position={[-4, 4, 6]} scale={3} />
        <Lightformer form="rect" intensity={0.6} color="#1e293b" position={[0, -5, 0]} rotation-x={-Math.PI / 2} scale={[12, 12, 1]} />
      </Environment>

      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(maxDpr)} />
      <Robot />
    </Canvas>
  );
}
