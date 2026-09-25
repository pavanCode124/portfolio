'use client';

import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { pointer, robotScreen, useRobot } from '@/store/robot';
import { boneQuaternion, hingeQuaternion, screenToWorld, solveTwoBone, worldToLocalQuat } from './ik';
import { getGlowTexture, getNeuralTexture, useRobotGeometry, useRobotMaterials } from './materials';

/* ------------------------------------------------------------------ */
/* Proportions (model units, before root scale)                        */
/* ------------------------------------------------------------------ */
const L1 = 0.46; // shoulder → elbow axle
const L2 = 0.44; // elbow axle → wrist roll
const HAND = 0.3; // wrist roll → index fingertip
const TORSO_Y = 0.12;
const SHOULDER_X = 0.5;
const SHOULDER_Y = 0.8; // within torso
const MODEL_H = 2.5;
const MODEL_CY = 0.74;
const REACH = L1 + L2 + HAND;
const PISTON_UP = new THREE.Vector3(0, -0.13, -0.02); // mount on upper arm (x set per side)
const PISTON_LO = new THREE.Vector3(0, -0.13, -0.02); // mount on forearm
const NEG_Y = new THREE.Vector3(0, -1, 0);
const UP = new THREE.Vector3(0, 1, 0);

const BAY_LINES: Record<string, string> = {
  hero: 'Hi, I’m PX-1, Pavan’s AI agent. I track your cursor. Hold click on empty space to summon me.',
  about: 'Model card loaded. These are Pavan’s operating principles.',
  projects: 'Select a deployment and I’ll open it for you.',
  ai: 'This is how Pavan works with agents like me: fast, and verified.',
  journey: 'Training log. Every date is a real commit.',
  skills: 'Every weight here is backed by a real project.',
  contact: 'Awaiting your prompt. Say hello!',
};

/* Bolt layouts, computed once */
const ring = (n: number, r: number, phase = 0) =>
  Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return [Math.cos(a) * r, Math.sin(a) * r, a] as const;
  });
const RIM_BOLTS = ring(8, 0.066, Math.PI / 8).map(([x, z, a]) => ({
  position: [x, 0, z] as [number, number, number],
  quaternion: new THREE.Quaternion().setFromUnitVectors(UP, new THREE.Vector3(Math.cos(a), 0, Math.sin(a))).toArray() as [number, number, number, number],
}));

/* Visor ellipsoid (head-local): centre and radii, matching the visor mesh below. */
const VISOR_C = new THREE.Vector3(0, 0.3, 0.012);
const VISOR_R = new THREE.Vector3(0.345 * 1.08, 0.345 * 0.9, 0.345 * 0.95);

/** A point on the visor surface, lifted along its normal, plus the rotation that faces outward. */
function onVisor(x: number, y: number, lift: number) {
  const dx = x / VISOR_R.x;
  const dy = (y - VISOR_C.y) / VISOR_R.y;
  const z = VISOR_C.z + VISOR_R.z * Math.sqrt(Math.max(0, 1 - dx * dx - dy * dy));
  const p = new THREE.Vector3(x, y, z);
  const n = new THREE.Vector3(
    x / (VISOR_R.x * VISOR_R.x),
    (y - VISOR_C.y) / (VISOR_R.y * VISOR_R.y),
    (z - VISOR_C.z) / (VISOR_R.z * VISOR_R.z),
  ).normalize();
  p.addScaledVector(n, lift);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  return { position: p.toArray() as [number, number, number], quaternion: q.toArray() as [number, number, number, number] };
}

const EYE_L = onVisor(-0.13, 0.33, 0.012);
const EYE_R = onVisor(0.13, 0.33, 0.012);
const MOUTH = onVisor(0, 0.205, 0.006);

/* Head shell opens at the top for the glass brain dome */
const HEAD_R = 0.34;
const HEAD_S = [1.08, 0.9, 0.95] as const;
const CAP_THETA = 0.78;
const CAP_Y = 0.3 + HEAD_R * Math.cos(CAP_THETA) * HEAD_S[1];
const CAP_R = HEAD_R * Math.sin(CAP_THETA);

type ArmRig = {
  shoulder: THREE.Group | null;
  upper: THREE.Group | null;
  fore: THREE.Group | null;
  roll: THREE.Group | null;
  hand: THREE.Group | null;
  k1: (THREE.Group | null)[];
  k2: (THREE.Group | null)[];
  k3: (THREE.Group | null)[];
  thumb1: THREE.Group | null;
  thumb2: THREE.Group | null;
  pistonA: THREE.Group | null;
  pistonB: THREE.Group | null;
  tip: THREE.Mesh | null;
  halo: THREE.Sprite | null;
  weight: number;
  curls: number[];
  /** Last IK goal, kept so the arm eases back from where it actually was. */
  target: THREE.Vector3;
  mode: 'point' | 'open';
  /** Elbow hinge axis in world space, remembered through straight-arm poses. */
  axis: THREE.Vector3;
  roll0: number;
  rollGoal: number;
  rollNext: number;
};

const makeRig = (): ArmRig => ({
  shoulder: null,
  upper: null,
  fore: null,
  roll: null,
  hand: null,
  k1: [],
  k2: [],
  k3: [],
  thumb1: null,
  thumb2: null,
  pistonA: null,
  pistonB: null,
  tip: null,
  halo: null,
  weight: 0,
  curls: [0.5, 0.5, 0.5, 0.5, 0.4],
  target: new THREE.Vector3(),
  mode: 'open',
  axis: new THREE.Vector3(),
  roll0: 0,
  rollGoal: 0,
  rollNext: 1 + Math.random() * 2,
});

/* ------------------------------------------------------------------ */
/* Arm — shoulder servo, hinge elbow, hydraulic piston, wrist roll      */
/* ------------------------------------------------------------------ */
function Arm({ side, rig }: { side: 1 | -1; rig: ArmRig }) {
  const m = useRobotMaterials();
  const G = useRobotGeometry();
  const glow = getGlowTexture();
  const fingerX = [0.048, 0.016, -0.016, -0.048].map((x) => x * -side);
  const px = side * 0.1;
  const Z90: [number, number, number] = [0, 0, Math.PI / 2];

  return (
    <group ref={(g) => void (rig.shoulder = g)} position={[SHOULDER_X * side, SHOULDER_Y, 0]}>
      {/* pauldron + shoulder servo (fixed to torso) */}
      <mesh geometry={G.pauldron} material={m.shell} position={[0.03 * side, 0.04, 0]} scale={[1, 0.8, 1.05]} />
      <mesh geometry={G.shoulderBall} material={m.dark} />
      <mesh geometry={G.servo} material={m.dark} position={[0.1 * side, -0.01, 0]} rotation={Z90} />
      <mesh geometry={G.servoCap} material={m.steel} position={[0.139 * side, -0.01, 0]} rotation={Z90} />
      <mesh geometry={G.servoRing} material={m.glow} position={[0.136 * side, -0.01, 0]} rotation={[0, Math.PI / 2, 0]} />
      {ring(6, 0.066).map(([a, b], i) => (
        <mesh key={i} geometry={G.hex} material={m.bolt} position={[0.146 * side, -0.01 + a, b]} rotation={Z90} />
      ))}

      <group ref={(g) => void (rig.upper = g)}>
        <mesh geometry={G.yoke} material={m.steel} position={[0, -0.07, 0]} />
        <mesh geometry={G.upperShell} material={m.shell} position={[0, -L1 * 0.52, 0]} />
        <mesh geometry={G.band} material={m.dark} position={[0, -0.13, 0]} />
        <mesh geometry={G.strip} material={m.glowSoft} position={[0, -L1 * 0.54, 0.071]} />

        {/* elbow clevis: two steel plates and a through-axle with hex nuts */}
        {[-1, 1].map((k) => (
          <mesh key={k} geometry={G.clevis} material={m.steel} position={[k * 0.072, -L1 + 0.018, 0]} />
        ))}
        <mesh geometry={G.axle} material={m.steel} position={[0, -L1, 0]} rotation={Z90} />
        {[-1, 1].map((k) => (
          <mesh key={k} geometry={G.hexBig} material={m.bolt} position={[k * 0.088, -L1, 0]} rotation={Z90} />
        ))}

        {/* hydraulic actuator — posed every frame between its two mounts */}
        <mesh geometry={G.knob} material={m.steel} position={[px, PISTON_UP.y, PISTON_UP.z]} />
        <group ref={(g) => void (rig.pistonA = g)}>
          <mesh geometry={G.pistonHousing} material={m.dark} />
        </group>
        <group ref={(g) => void (rig.pistonB = g)}>
          <mesh geometry={G.pistonRod} material={m.chrome} />
        </group>

        <group position={[0, -L1, 0]}>
          <group ref={(g) => void (rig.fore = g)}>
            <mesh geometry={G.hub} material={m.dark} rotation={Z90} />
            <mesh geometry={G.foreShell} material={m.shell} position={[0, -L2 * 0.5, 0]} />
            <mesh geometry={G.foreBand} material={m.dark} position={[0, -0.1, 0]} />
            <mesh geometry={G.strip} material={m.glowSoft} position={[0, -L2 * 0.52, 0.081]} rotation={[0.07, 0, 0]} />
            <mesh geometry={G.knob} material={m.steel} position={[px, PISTON_LO.y, PISTON_LO.z]} />
            <mesh geometry={G.wristCollar} material={m.dark} position={[0, -L2 + 0.05, 0]} />

            {/* wrist roll motor: a bolted disc that turns the whole hand */}
            <group position={[0, -L2, 0]}>
              <group ref={(g) => void (rig.roll = g)}>
                <mesh geometry={G.rollDisc} material={m.steel} />
                {RIM_BOLTS.map((b, i) => (
                  <mesh key={i} geometry={G.hex} material={m.bolt} position={b.position} quaternion={b.quaternion} />
                ))}
                <mesh geometry={G.rollMark} material={m.glow} position={[0, 0, 0.068]} />

                {/* wrist pitch hinge */}
                <mesh geometry={G.wristAxle} material={m.dark} position={[0, -0.036, 0]} rotation={Z90} />
                {[-1, 1].map((k) => (
                  <mesh key={k} geometry={G.hex} material={m.bolt} position={[k * 0.058, -0.036, 0]} rotation={Z90} />
                ))}

                <group ref={(g) => void (rig.hand = g)} position={[0, -0.036, 0]}>
                  <mesh geometry={G.palm} material={m.dark} position={[0, -0.075, 0]} />
                  <mesh geometry={G.backPlate} material={m.shell} position={[0, -0.072, -0.031]} />
                  {[
                    [0.046, -0.04],
                    [-0.046, -0.04],
                    [0.046, -0.106],
                    [-0.046, -0.106],
                  ].map(([x, y], i) => (
                    <mesh key={i} geometry={G.hex} material={m.bolt} position={[x, y, -0.041]} rotation={[Math.PI / 2, 0, 0]} />
                  ))}
                  <mesh geometry={G.palmPad} material={m.rubber} position={[0, -0.075, 0.027]} />
                  <mesh geometry={G.knuckleBar} material={m.steel} position={[0, -0.14, 0]} rotation={Z90} />

                  {fingerX.map((x, i) => {
                    const L = i === 1 ? 1.1 : i === 3 ? 0.84 : 1;
                    return (
                      <group key={i} ref={(g) => void (rig.k1[i] = g)} position={[x, -0.14, 0]}>
                        <mesh geometry={G.seg1} material={m.steel} position={[0, -0.027 * L, 0]} scale={[1, L, 1]} />
                        <group ref={(g) => void (rig.k2[i] = g)} position={[0, -0.056 * L, 0]}>
                          <mesh geometry={G.pin} material={m.bolt} rotation={Z90} />
                          <mesh geometry={G.seg2} material={m.shell} position={[0, -0.022 * L, 0]} scale={[1, L, 1]} />
                          <group ref={(g) => void (rig.k3[i] = g)} position={[0, -0.045 * L, 0]}>
                            <mesh geometry={G.pin} material={m.bolt} rotation={Z90} />
                            <mesh geometry={G.seg3} material={m.dark} position={[0, -0.018 * L, 0]} scale={[1, L, 1]} />
                            {i === 0 && (
                              <mesh ref={(g) => void (rig.tip = g)} geometry={G.tip} position={[0, -0.036 * L, 0]}>
                                <meshBasicMaterial color="#7df9ff" transparent opacity={0.2} toneMapped={false} />
                              </mesh>
                            )}
                          </group>
                        </group>
                      </group>
                    );
                  })}

                  {/* opposable thumb on two pinned joints */}
                  <group position={[0.07 * -side, -0.05, 0.02]} rotation={[0, 0, 0.75 * -side]}>
                    <group ref={(g) => void (rig.thumb1 = g)}>
                      <mesh geometry={G.pin} material={m.bolt} rotation={Z90} />
                      <mesh geometry={G.seg1} material={m.steel} position={[0, -0.027, 0]} />
                      <group ref={(g) => void (rig.thumb2 = g)} position={[0, -0.056, 0]}>
                        <mesh geometry={G.pin} material={m.bolt} rotation={Z90} />
                        <mesh geometry={G.seg2} material={m.shell} position={[0, -0.022, 0]} />
                      </group>
                    </group>
                  </group>

                  <sprite ref={(g) => void (rig.halo = g)} position={[0, -0.27, 0]} scale={[0.14, 0.14, 1]}>
                    <spriteMaterial map={glow} color="#7df9ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
                  </sprite>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Neural brain — a small graph that fires inside the glass dome        */
/* ------------------------------------------------------------------ */
function makeBrain() {
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const N = 30;
  const cy = CAP_Y;
  const rx = CAP_R * HEAD_S[0] * 0.82;
  const ry = 0.15;
  const rz = CAP_R * HEAD_S[2] * 0.8;
  const pts: THREE.Vector3[] = [];
  while (pts.length < N) {
    const p = new THREE.Vector3((rnd() * 2 - 1) * rx, cy + 0.015 + rnd() * ry, (rnd() * 2 - 1) * rz);
    const d = (p.x / rx) ** 2 + ((p.y - cy) / (ry + 0.02)) ** 2 + (p.z / rz) ** 2;
    if (d < 0.9 && pts.every((q) => q.distanceTo(p) > 0.045)) pts.push(p);
  }
  const edges: [number, number][] = [];
  const adj: number[][] = pts.map(() => []);
  pts.forEach((p, i) => {
    pts
      .map((q, j) => [j, p.distanceTo(q)] as const)
      .filter(([j]) => j !== i)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 2)
      .forEach(([j]) => {
        if (!adj[i].includes(j)) {
          adj[i].push(j);
          adj[j].push(i);
          edges.push([i, j]);
        }
      });
  });

  const pointGeo = new THREE.BufferGeometry();
  pointGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => p.toArray()), 3));
  pointGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(edges.flatMap(([a, b]) => [...pts[a].toArray(), ...pts[b].toArray()]), 3));
  lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(edges.length * 6), 3));

  return {
    N,
    edges,
    adj,
    pointGeo,
    lineGeo,
    act: new Float32Array(N),
    edgeGlow: new Float32Array(edges.length),
    pulses: [] as { e: number; to: number; t: number }[],
    edgeOf: (a: number, b: number) => edges.findIndex(([x, y]) => (x === a && y === b) || (x === b && y === a)),
  };
}

/* ------------------------------------------------------------------ */
/* Thruster plume shader                                               */
/* ------------------------------------------------------------------ */
const plumeVert = /* glsl */ `
  varying vec3 vPos;
  varying float vFres;
  void main() {
    vPos = position;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vFres = abs(dot(n, normalize(-mv.xyz)));
    gl_Position = projectionMatrix * mv;
  }
`;
const plumeFrag = /* glsl */ `
  uniform float uTime;
  uniform float uPower;
  uniform vec3 uColor;
  uniform vec3 uCore;
  varying vec3 vPos;
  varying float vFres;
  void main() {
    float u = clamp((0.3 - vPos.y) / 0.6, 0.0, 1.0);        // 1 at nozzle, 0 at tip
    float flicker = 0.75 + 0.25 * sin(uTime * 38.0 + vPos.y * 30.0) * sin(uTime * 23.0);
    float a = pow(u, 1.6) * flicker * uPower * smoothstep(0.0, 0.7, vFres);
    vec3 col = mix(uColor, uCore, pow(u, 3.0));
    gl_FragColor = vec4(col * a * 1.6, a);
  }
`;

/* ------------------------------------------------------------------ */
/* Robot                                                               */
/* ------------------------------------------------------------------ */
export function Robot() {
  const m = useRobotMaterials();
  const G = useRobotGeometry();
  const glow = getGlowTexture();
  const neural = getNeuralTexture();
  const { camera, size } = useThree();

  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const torso = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const eyes = useRef<THREE.Group>(null);
  const eyeOpen = useRef<THREE.Group>(null);
  const eyeHappy = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Group>(null);
  const core = useRef<THREE.Sprite>(null);
  const coreRing = useRef<THREE.Mesh>(null);
  const antenna = useRef<THREE.Sprite>(null);
  const pad = useRef<THREE.Group>(null);
  const plumeLight = useRef<THREE.PointLight>(null);
  const brainGlow = useRef<THREE.Sprite>(null);

  const rigs = useMemo(() => ({ [-1]: makeRig(), [1]: makeRig() }) as Record<-1 | 1, ArmRig>, []);
  const brain = useMemo(makeBrain, []);
  const brainPointsMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.05,
        map: glow,
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [glow],
  );
  const brainLineMat = useMemo(
    () =>
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }),
    [],
  );

  const plumeMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: plumeVert,
        fragmentShader: plumeFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uPower: { value: 0.8 },
          uColor: { value: new THREE.Color('#1d4ed8') },
          uCore: { value: new THREE.Color('#b8fbff') },
        },
      }),
    [],
  );

  const torsoGeo = useMemo(() => {
    const pts = [
      [0.001, -0.02], [0.24, 0], [0.29, 0.08], [0.35, 0.24], [0.42, 0.44],
      [0.465, 0.6], [0.46, 0.73], [0.41, 0.84], [0.3, 0.92], [0.15, 0.965], [0.001, 0.975],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const g = new THREE.LatheGeometry(pts, 64);
    g.computeVertexNormals();
    return g;
  }, []);

  const pelvisGeo = useMemo(() => {
    const pts = [[0.001, -0.3], [0.13, -0.29], [0.24, -0.22], [0.29, -0.1], [0.27, 0], [0.001, 0.001]].map(
      ([x, y]) => new THREE.Vector2(x, y),
    );
    return new THREE.LatheGeometry(pts, 56);
  }, []);

  /* Scratch objects, allocated once */
  const s = useMemo(
    () => ({
      pos: new THREE.Vector3(0, -20, 0),
      vel: new THREE.Vector3(),
      prev: new THREE.Vector3(),
      goal: new THREE.Vector3(),
      scale: 1,
      yaw: 0,
      twist: 0,
      headYaw: 0,
      headPitch: 0,
      look: new THREE.Vector3(0, 0, 5),
      tmp: new THREE.Vector3(),
      tmp2: new THREE.Vector3(),
      taskT: new THREE.Vector3(),
      headW: new THREE.Vector3(),
      shoulderW: new THREE.Vector3(),
      elbow: new THREE.Vector3(),
      wrist: new THREE.Vector3(),
      target: new THREE.Vector3(),
      handDir: new THREE.Vector3(),
      palm: new THREE.Vector3(),
      pole: new THREE.Vector3(),
      segA: new THREE.Vector3(),
      segB: new THREE.Vector3(),
      cross: new THREE.Vector3(),
      qA: new THREE.Quaternion(),
      qB: new THREE.Quaternion(),
      qW: new THREE.Quaternion(),
      qU: new THREE.Quaternion(),
      qT: new THREE.Quaternion(),
      euler: new THREE.Euler(),
      color: new THREE.Color(),
      bays: [] as HTMLElement[],
      bayRefresh: 0,
      navH: 68,
      activeBay: '',
      nextBlink: 2,
      blinkUntil: 0,
      happyUntil: 0,
      taskPhaseStart: 0,
      taskSide: -1 as -1 | 1,
      summonSide: -1 as -1 | 1,
      pressed: false,
      lastTaskId: -1,
      initialised: false,
      readyFired: false,
    }),
    [],
  );

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const now = performance.now();
    const R = root.current;
    const B = body.current;
    const T = torso.current;
    const H = head.current;
    if (!R || !B || !T || !H) return;

    const w = size.width;
    const h = size.height;
    const store = useRobot.getState();
    const task = store.task;

    /* ---------- world units per viewport ---------- */
    const cam = camera as THREE.PerspectiveCamera;
    const worldH = 2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * cam.position.z;
    const pxToWorld = worldH / h;

    /* ---------- find the bay of the section in view ---------- */
    if (t > s.bayRefresh) {
      s.bays = Array.from(document.querySelectorAll<HTMLElement>('[data-robot-bay]'));
      s.navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 68;
      s.bayRefresh = t + 1;
    }
    let bayKey = 'fallback';
    let bayRect: DOMRect | null = null;
    for (const bay of s.bays) {
      const sec = (bay.closest('section') as HTMLElement | null) ?? bay;
      const sr = sec.getBoundingClientRect();
      if (sr.top <= h * 0.55 && sr.bottom >= h * 0.45) {
        const br = bay.getBoundingClientRect();
        bayKey = bay.dataset.robotBay ?? 'bay';
        if (br.width > 40 && br.height > 40) bayRect = br;
        break;
      }
    }

    let goalScale: number;
    if (bayRect) {
      const bh = Math.min(bayRect.height, h * 0.9) * pxToWorld;
      const bw = bayRect.width * pxToWorld;
      goalScale = Math.min((bh * 0.78) / MODEL_H, (bw * 0.95) / 1.5);
      const cy = Math.min(Math.max(bayRect.top + bayRect.height / 2, h * 0.25), h * 0.75);
      screenToWorld(bayRect.left + bayRect.width / 2, cy, w, h, camera, 0, s.goal);
      s.goal.y -= MODEL_CY * goalScale;
    } else {
      // No bay on screen (e.g. mobile): park in the bottom-right corner.
      goalScale = (worldH * 0.2) / MODEL_H;
      const robotPx = h * 0.2;
      screenToWorld(w - robotPx * 0.32 - 10, h - robotPx * 0.5 - 14, w, h, camera, 0, s.goal);
      s.goal.y -= MODEL_CY * goalScale;
    }
    let goalYaw = 0;

    if (bayKey !== s.activeBay) {
      s.activeBay = bayKey;
      const line = BAY_LINES[bayKey];
      if (line && s.initialised) store.say(line);
      if (bayKey === 'contact' && s.initialised) store.gestureNow('wave');
    }

    const pointerFresh = pointer.active && now - pointer.lastMove < 4000;

    /* ---------- task: fly to the folder, reach, press, admire ---------- */
    let taskRig: ArmRig | null = null;
    let taskTarget: THREE.Vector3 | null = null;
    let taskPress = 0;

    if (task) {
      if (task.id !== s.lastTaskId) {
        s.lastTaskId = task.id;
        s.taskPhaseStart = t;
        s.pressed = false;
      }
      const el = task.getEl();
      const r = el?.getBoundingClientRect();
      const cx = r ? r.left + r.width * 0.5 : w / 2;
      const cy = r ? r.top + r.height * 0.42 : h / 2;

      const ts = THREE.MathUtils.clamp((worldH * 0.33) / MODEL_H, 0.45, 1.4);
      goalScale = ts;
      const rz = 0.2;
      screenToWorld(cx, cy, w, h, camera, rz + 0.65 * ts, s.target);

      if (task.phase === 'approach' && t - s.taskPhaseStart < 0.02) {
        s.taskSide = s.target.x < s.pos.x ? -1 : 1;
      }
      const side = s.taskSide;
      s.goal.set(s.target.x - side * (SHOULDER_X + 0.5) * ts, s.target.y - (TORSO_Y + SHOULDER_Y - 0.12) * ts, rz);
      goalYaw = side * 0.22;

      const pt = t - s.taskPhaseStart;
      const dist = s.pos.distanceTo(s.goal);
      if (task.phase === 'approach') {
        if ((dist < 0.12 * ts && pt > 0.35) || pt > 1.5) {
          store.setPhase('reach');
          s.taskPhaseStart = t;
        }
      } else if (task.phase === 'reach') {
        if (pt > 0.5) {
          store.setPhase('press');
          s.taskPhaseStart = t;
        }
      } else if (task.phase === 'press') {
        taskPress = Math.sin(Math.min(pt / 0.34, 1) * Math.PI);
        if (!s.pressed && pt > 0.17) {
          s.pressed = true;
          store.press();
          s.happyUntil = t + 1.3;
          fireBrain(brain, 6);
        }
        if (pt > 0.34) {
          store.setPhase('admire');
          s.taskPhaseStart = t;
        }
      } else if (task.phase === 'admire') {
        if (pt > 0.5) store.finishTask();
      }

      if (task.phase !== 'approach' || dist < 1.2 * ts) {
        taskRig = rigs[side];
        const pressZ = rz + (0.65 + 0.35 * taskPress) * ts;
        taskTarget = screenToWorld(cx, cy, w, h, camera, pressZ, s.taskT);
      }
    }

    /* ---------- summon: hold the pointer on empty space ---------- */
    const summoning = !task && pointer.summoning;
    if (summoning) {
      const ss = THREE.MathUtils.clamp((worldH * 0.26) / MODEL_H, 0.45, 1.2);
      goalScale = ss;
      screenToWorld(pointer.px, pointer.py, w, h, camera, 0.2 + 0.7 * ss, s.target);
      if (Math.abs(s.target.x - s.pos.x) > 1.4 * ss) s.summonSide = s.target.x < s.pos.x ? -1 : 1;
      const side = s.summonSide;
      s.goal.set(s.target.x - side * (SHOULDER_X + 0.58) * ss, s.target.y - 0.85 * ss, 0.2);
      goalYaw = side * 0.3;
      s.happyUntil = Math.max(s.happyUntil, t + 0.2);
    }

    /* ---------- gestures ---------- */
    const g = store.gesture;
    const gElapsed = (now - g.at) / 1000;
    const waving = g.kind === 'wave' && gElapsed < 2.4 && !task;
    const spinning = g.kind === 'spin' && gElapsed < 1.1;
    const nodding = g.kind === 'nod' && gElapsed < 0.9;
    if (spinning || waving) s.happyUntil = Math.max(s.happyUntil, t + 0.3);

    /* ---------- move the root ---------- */
    if (!s.initialised) {
      s.pos.copy(s.goal).setY(s.goal.y - 3 * goalScale);
      s.scale = goalScale;
      s.prev.copy(s.pos);
      s.initialised = true;
    }
    const speed = task || summoning ? 4.2 : 2.6;
    s.pos.x = THREE.MathUtils.damp(s.pos.x, s.goal.x, speed, dt);
    s.pos.y = THREE.MathUtils.damp(s.pos.y, s.goal.y, speed, dt);
    s.pos.z = THREE.MathUtils.damp(s.pos.z, s.goal.z, speed, dt);
    s.scale = THREE.MathUtils.damp(s.scale, goalScale, 3, dt);
    s.vel.subVectors(s.pos, s.prev).divideScalar(Math.max(dt, 1e-4));
    s.prev.copy(s.pos);

    let yawGoal = goalYaw;
    if (spinning) yawGoal += Math.PI * 2 * THREE.MathUtils.smoothstep(gElapsed / 1.1, 0, 1);
    s.yaw = spinning ? yawGoal : THREE.MathUtils.damp(s.yaw, yawGoal, 4, dt);

    const sc = s.scale;
    R.position.copy(s.pos);
    R.scale.setScalar(sc);
    R.rotation.y = s.yaw;

    // hover bob + lean into motion
    const vx = s.vel.x / sc;
    const vy = s.vel.y / sc;
    B.position.y = Math.sin(t * 1.7) * 0.045 + Math.sin(t * 0.9) * 0.02;
    B.rotation.z = THREE.MathUtils.damp(B.rotation.z, THREE.MathUtils.clamp(-vx * 0.05, -0.4, 0.4), 5, dt);
    B.rotation.x = THREE.MathUtils.damp(
      B.rotation.x,
      THREE.MathUtils.clamp(Math.abs(vx) * 0.03 - vy * 0.02, -0.25, 0.3) + (task?.phase === 'press' ? 0.08 : 0),
      5,
      dt,
    );

    /* ---------- where to look ---------- */
    if (taskTarget) s.tmp.copy(taskTarget);
    else if (pointerFresh || summoning) screenToWorld(pointer.px, pointer.py, w, h, camera, s.pos.z + 2.4 * sc, s.tmp);
    else s.tmp.set(s.pos.x * 0.4, s.pos.y + 1.2 * sc, 8);
    s.look.lerp(s.tmp, 1 - Math.exp(-10 * dt));

    R.updateMatrixWorld(true);
    H.getWorldPosition(s.headW);
    s.tmp.subVectors(s.look, s.headW);
    const rel = Math.atan2(s.tmp.x, s.tmp.z) - s.yaw - B.rotation.y;
    const relYaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(rel), Math.cos(rel)), -1.2, 1.2);
    const pitch = THREE.MathUtils.clamp(-Math.atan2(s.tmp.y, Math.hypot(s.tmp.x, s.tmp.z)), -0.55, 0.5);
    s.twist = THREE.MathUtils.damp(s.twist, relYaw * 0.28, 6, dt);
    s.headYaw = THREE.MathUtils.damp(s.headYaw, THREE.MathUtils.clamp(relYaw * 0.72, -0.85, 0.85), 8, dt);
    s.headPitch = THREE.MathUtils.damp(s.headPitch, pitch + (nodding ? Math.sin(gElapsed * 16) * 0.22 : 0), 8, dt);
    T.rotation.y = s.twist;
    H.rotation.set(s.headPitch, s.headYaw, -s.headYaw * 0.08);
    R.updateMatrixWorld(true);

    /* ---------- arms ---------- */
    s.palm.set(Math.sin(s.yaw), 0, Math.cos(s.yaw)); // robot forward, reused below
    for (const side of [-1, 1] as const) {
      const rig = rigs[side];
      if (!rig.shoulder || !rig.upper || !rig.fore || !rig.roll || !rig.hand) continue;

      let wantWeight = 0;
      let mode: 'idle' | 'point' | 'open' = 'idle';

      if (taskRig === rig && taskTarget) {
        wantWeight = task?.phase === 'approach' ? 0.55 : 1;
        mode = 'point';
        rig.target.copy(taskTarget);
        rig.mode = 'point';
      } else if (!task && (pointerFresh || summoning)) {
        rig.shoulder.getWorldPosition(s.shoulderW);
        screenToWorld(pointer.px, pointer.py, w, h, camera, s.pos.z + 0.8 * sc, s.target);
        const d = s.target.distanceTo(s.shoulderW);
        const nearer = Math.sign(s.target.x - s.pos.x) === side || Math.abs(s.target.x - s.pos.x) < 0.15 * sc;
        if (nearer && d < REACH * sc * 1.02) {
          wantWeight = 1;
          mode = 'open';
          rig.target.copy(s.target);
          rig.mode = 'open';
        }
      }
      rig.weight = THREE.MathUtils.damp(rig.weight, wantWeight, mode === 'point' ? 7 : 5, dt);

      /* Idle pose: pure hinge rotations, plus a wrist servo that re-seats itself now and then */
      const sway = Math.sin(t * 1.3 + side) * 0.05;
      let ux = 0.06 + sway;
      let uz = side * (0.16 + Math.abs(vx) * 0.02);
      let fx = -0.42 - Math.sin(t * 1.1 + side) * 0.06;
      if (t > rig.rollNext) {
        rig.rollGoal = (Math.random() * 2 - 1) * 0.9;
        rig.rollNext = t + 2.5 + Math.random() * 3;
      }
      rig.roll0 = THREE.MathUtils.damp(rig.roll0, rig.rollGoal, 3.5, dt);
      let roll = rig.roll0;
      let handPitch = -0.1 + Math.sin(t * 0.8 + side * 2) * 0.08;
      if (waving && side === 1) {
        const k = THREE.MathUtils.smoothstep(gElapsed, 0, 0.35) * (1 - THREE.MathUtils.smoothstep(gElapsed, 2.0, 2.4));
        ux = THREE.MathUtils.lerp(ux, -0.1, k);
        uz = THREE.MathUtils.lerp(uz, 2.5, k);
        fx = THREE.MathUtils.lerp(fx, -0.35, k);
        roll = THREE.MathUtils.lerp(roll, -Math.PI / 2 + Math.sin(gElapsed * 10) * 0.2, k);
        handPitch = THREE.MathUtils.lerp(handPitch, Math.sin(gElapsed * 10) * 0.55, k);
      }
      s.euler.set(ux, 0, uz);
      rig.upper.quaternion.setFromEuler(s.euler);
      s.euler.set(fx, 0, 0);
      rig.fore.quaternion.setFromEuler(s.euler);
      s.euler.set(0, roll, 0);
      rig.roll.quaternion.setFromEuler(s.euler);
      s.euler.set(handPitch, 0, 0);
      rig.hand.quaternion.setFromEuler(s.euler);

      if (rig.weight > 0.001) {
        rig.upper.updateMatrixWorld(true);
        rig.shoulder.getWorldPosition(s.shoulderW);
        if (rig.mode === 'point') {
          // index finger aims at the folder and "through the glass" toward the viewer
          s.handDir.subVectors(rig.target, s.shoulderW).normalize();
          s.handDir.z += 0.9;
          s.handDir.normalize();
          s.tmp2.set(0, -1, 0); // palm down
        } else {
          // open palm pressed against the screen, fingers up
          s.handDir.subVectors(rig.target, s.shoulderW).setZ(0);
          s.handDir.y += 0.6 * s.handDir.length() + 0.05;
          s.handDir.normalize();
          s.tmp2.set(0, 0, 1); // palm toward the viewer
        }
        s.wrist.copy(rig.target).addScaledVector(s.handDir, -HAND * sc);
        s.pole.set(side * 0.5, -1, -0.6).applyAxisAngle(UP, s.yaw);
        solveTwoBone(s.shoulderW, s.wrist, L1 * sc, L2 * sc, s.pole, s.elbow, s.wrist);

        // Hinge axis = normal of the arm plane; both bones share it, so the elbow is a true single-axis joint
        s.segA.subVectors(s.elbow, s.shoulderW);
        s.segB.subVectors(s.wrist, s.elbow);
        s.cross.crossVectors(s.segB, s.segA);
        if (s.cross.lengthSq() > 1e-6 * sc * sc) rig.axis.copy(s.cross.normalize());
        else if (rig.axis.lengthSq() === 0) rig.axis.set(1, 0, 0).applyAxisAngle(UP, s.yaw);

        hingeQuaternion(s.segA, rig.axis, s.qU); // upper, world
        hingeQuaternion(s.segB, rig.axis, s.qW); // forearm, world
        // forearm relative to the IK upper arm — a pure rotation about the axle
        s.qB.copy(s.qU).invert().multiply(s.qW);
        worldToLocalQuat(rig.shoulder, s.qU, s.qA);
        rig.upper.quaternion.slerp(s.qA, rig.weight);
        rig.fore.quaternion.slerp(s.qB, rig.weight);
        rig.fore.updateMatrixWorld(true);

        // Hand: split the needed rotation into wrist roll (twist about the forearm) and wrist pitch (swing)
        boneQuaternion(s.handDir, s.tmp2, s.qW);
        worldToLocalQuat(rig.roll.parent!, s.qW, s.qA);
        s.qT.set(0, s.qA.y, 0, s.qA.w);
        if (s.qT.lengthSq() < 1e-8) s.qT.identity();
        else s.qT.normalize();
        s.qB.copy(s.qT).invert().multiply(s.qA);
        rig.roll.quaternion.slerp(s.qT, rig.weight);
        rig.hand.quaternion.slerp(s.qB, rig.weight);
      }

      /* Hydraulic actuator: housing on the upper arm, rod on the forearm, sliding into each other */
      rig.upper.updateMatrixWorld(true);
      if (rig.pistonA && rig.pistonB) {
        const px = side * 0.1;
        const A = s.segA.set(px, PISTON_UP.y, PISTON_UP.z);
        const Bw = rig.fore.localToWorld(s.segB.set(px, PISTON_LO.y, PISTON_LO.z));
        const Bl = rig.upper.worldToLocal(Bw);
        s.cross.subVectors(Bl, A).normalize();
        rig.pistonA.position.copy(A);
        rig.pistonA.quaternion.setFromUnitVectors(NEG_Y, s.cross);
        rig.pistonB.position.copy(Bl);
        rig.pistonB.quaternion.setFromUnitVectors(NEG_Y, s.cross.negate());
      }

      /* Fingers: three pinned phalanges each */
      const isPoint = mode === 'point' && rig.weight > 0.3;
      const isOpen = mode === 'open' && rig.weight > 0.3;
      for (let i = 0; i < 4; i++) {
        let c = 0.5 + Math.max(0, Math.sin(t * 1.6 - i * 0.7 + side)) * 0.12;
        if (isOpen) c = 0.05;
        if (isPoint) c = i === 0 ? 0.03 + taskPress * 0.22 : 1.3;
        if (waving && side === 1) c = 0.06;
        rig.curls[i] = THREE.MathUtils.damp(rig.curls[i], c, 11, dt);
        const cu = rig.curls[i];
        const k1 = rig.k1[i];
        if (k1) {
          k1.rotation.x = -cu * 0.8;
          k1.rotation.z = isOpen ? (i - 1.5) * 0.1 * side : 0;
        }
        if (rig.k2[i]) rig.k2[i]!.rotation.x = -cu * 1.05;
        if (rig.k3[i]) rig.k3[i]!.rotation.x = -cu * 0.85;
      }
      rig.curls[4] = THREE.MathUtils.damp(rig.curls[4], isPoint ? 1.0 : isOpen ? 0.05 : 0.45, 10, dt);
      if (rig.thumb1) rig.thumb1.rotation.x = 0.35 + rig.curls[4] * 0.55;
      if (rig.thumb2) rig.thumb2.rotation.x = -rig.curls[4] * 0.9;

      if (rig.tip) {
        const mat = rig.tip.material as THREE.MeshBasicMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, isPoint ? 0.6 + taskPress * 0.4 : 0.15, 10, dt);
      }
      if (rig.halo) {
        const mat = rig.halo.material as THREE.SpriteMaterial;
        mat.opacity = THREE.MathUtils.damp(mat.opacity, isPoint ? 0.35 + taskPress * 0.9 : isOpen ? 0.3 : 0, 10, dt);
        rig.halo.scale.setScalar(0.12 + taskPress * 0.25);
      }
    }

    /* ---------- neural brain ---------- */
    const busy = !!task || summoning || t < s.happyUntil;
    if (Math.random() < (busy ? 10 : 3.2) * dt) fireBrain(brain, 1);
    stepBrain(brain, dt, s.color);
    brainPointsMat.size = 0.3 * sc;
    if (brainGlow.current) {
      let a = 0;
      for (let i = 0; i < brain.N; i++) a += brain.act[i];
      (brainGlow.current.material as THREE.SpriteMaterial).opacity = 0.25 + Math.min(a / 6, 1) * 0.55;
    }

    /* ---------- face ---------- */
    if (t > s.nextBlink) {
      s.blinkUntil = t + 0.13;
      s.nextBlink = t + 2.2 + Math.random() * 3.5;
    }
    const happy = t < s.happyUntil || task?.phase === 'press' || task?.phase === 'admire';
    if (eyeOpen.current && eyeHappy.current) {
      eyeOpen.current.visible = !happy;
      eyeHappy.current.visible = happy;
      const blink = t < s.blinkUntil ? 0.12 : 1;
      eyeOpen.current.scale.y = THREE.MathUtils.damp(eyeOpen.current.scale.y, blink, 30, dt);
    }
    if (eyes.current) {
      eyes.current.position.x = THREE.MathUtils.damp(eyes.current.position.x, (relYaw - s.headYaw - s.twist) * 0.05, 10, dt);
      eyes.current.position.y = THREE.MathUtils.damp(eyes.current.position.y, -(pitch - s.headPitch) * 0.05, 10, dt);
    }
    const speaking = store.speech && now - store.speech.at < 2600;
    if (mouth.current) {
      mouth.current.visible = !!speaking;
      if (speaking) {
        mouth.current.children.forEach((c, i) => {
          c.scale.y = 0.3 + Math.abs(Math.sin(t * 18 + i * 1.7)) * (1 - Math.abs(i - 2) * 0.2);
        });
      }
    }

    /* ---------- glow & thrusters ---------- */
    const pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
    if (core.current) {
      (core.current.material as THREE.SpriteMaterial).opacity = 0.45 + pulse * 0.3 + (happy ? 0.2 : 0);
      core.current.scale.setScalar(0.34 + pulse * 0.06);
    }
    if (coreRing.current) coreRing.current.rotation.z = t * 0.8;
    if (antenna.current) (antenna.current.material as THREE.SpriteMaterial).opacity = Math.sin(t * 3.2) > 0.2 ? 0.95 : 0.25;
    const power = THREE.MathUtils.clamp(0.75 + (s.vel.length() * 0.08) / sc + Math.max(vy, 0) * 0.1, 0.6, 1.6);
    plumeMat.uniforms.uTime.value = t;
    plumeMat.uniforms.uPower.value = THREE.MathUtils.damp(plumeMat.uniforms.uPower.value, power, 6, dt);
    if (plumeLight.current) plumeLight.current.intensity = 1.2 * power;
    if (pad.current) {
      pad.current.rotation.y = t * 0.5;
      const k = 1 + Math.sin(t * 1.7) * 0.03;
      pad.current.scale.set(k, 1, k);
    }

    /* ---------- speech bubble + hit area in screen space ---------- */
    H.getWorldPosition(s.tmp).y += 0.82 * sc;
    s.tmp.project(camera);
    const bx = (s.tmp.x * 0.5 + 0.5) * w;
    const by = (-s.tmp.y * 0.5 + 0.5) * h;
    const bubble = document.getElementById('robot-speech');
    if (bubble) {
      // keep the bubble on screen; the arrow shifts so it still points at the head
      const half = ((bubble.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0) / 2;
      const cx = THREE.MathUtils.clamp(bx, half + 10, Math.max(half + 10, w - half - 10));
      // the bubble grows upwards from cy, so keep its top clear of the fixed nav
      const cy = Math.max(by, ((bubble.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0) + s.navH + 6);
      bubble.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0) translate(-50%, -100%)`;
      bubble.style.setProperty('--arrow', `${THREE.MathUtils.clamp(bx - cx, -half + 16, half - 16).toFixed(1)}px`);
    }
    s.tmp.set(0, 0.9, 0).applyMatrix4(R.matrixWorld).project(camera);
    robotScreen.x = (s.tmp.x * 0.5 + 0.5) * w;
    robotScreen.y = (-s.tmp.y * 0.5 + 0.5) * h;
    robotScreen.r = (MODEL_H * 0.42 * sc) / pxToWorld;
    robotScreen.visible = true;

    if (!s.readyFired) {
      s.readyFired = true;
      store.setReady();
    }
  });

  const Z90: [number, number, number] = [0, 0, Math.PI / 2];

  return (
    <group ref={root}>
      {/* hover pad — stays level while the body bobs */}
      <group ref={pad} position={[0, -0.72, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.padRing}>
          <ringGeometry args={[0.36, 0.385, 72]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={m.padDash}>
          <ringGeometry args={[0.46, 0.475, 72, 1, 0, Math.PI * 1.5]} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial map={glow} color="#3b82f6" transparent opacity={0.35} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>

      <group ref={body}>
        {/* pelvis + thruster */}
        <mesh geometry={pelvisGeo} material={m.shell} scale={[1, 1, 0.78]} />
        {ring(8, 0.287, Math.PI / 8).map(([x, z], i) => (
          <mesh key={i} geometry={G.hex} material={m.bolt} position={[x, -0.1, z * 0.78]} quaternion={RIM_BOLTS[i].quaternion} />
        ))}
        <mesh material={m.dark} position={[0, -0.3, 0]}>
          <cylinderGeometry args={[0.12, 0.15, 0.08, 32]} />
        </mesh>
        <mesh material={m.glow} position={[0, -0.34, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.105, 0.014, 10, 40]} />
        </mesh>
        <mesh material={plumeMat} position={[0, -0.64, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.12, 0.6, 32, 1, true]} />
        </mesh>
        <sprite position={[0, -0.38, 0]} scale={[0.55, 0.55, 1]}>
          <spriteMaterial map={glow} color="#3b82f6" transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} />
        </sprite>
        <pointLight ref={plumeLight} position={[0, -0.5, 0.2]} color="#3b82f6" intensity={1.2} distance={2.5} decay={2} />

        {/* waist: steel bearing rings around a dark core */}
        <mesh material={m.dark} position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.14, 32]} />
        </mesh>
        {[0.015, 0.105].map((y) => (
          <mesh key={y} material={m.steel} position={[0, y, 0]}>
            <cylinderGeometry args={[0.215, 0.215, 0.018, 40]} />
          </mesh>
        ))}
        <mesh material={m.accent} position={[0, 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.8, 1]}>
          <torusGeometry args={[0.205, 0.008, 8, 48]} />
        </mesh>

        {/* torso */}
        <group ref={torso} position={[0, TORSO_Y, 0]}>
          <group scale={[1, 1, 0.68]}>
            <mesh geometry={torsoGeo} material={m.shell} />
            <mesh material={m.dark} position={[0, 0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.332, 0.012, 8, 64]} />
            </mesh>
            <mesh material={m.dark} position={[0, 0.86, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.39, 0.01, 8, 64]} />
            </mesh>
          </group>

          {/* chest core: a feed-forward network behind glass, in a bolted bezel */}
          <group position={[0, 0.56, 0.3]}>
            <mesh material={m.steel} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.145, 0.145, 0.04, 48]} />
            </mesh>
            <mesh material={m.dark} position={[0, 0, 0.021]}>
              <circleGeometry args={[0.13, 48]} />
            </mesh>
            {ring(8, 0.137, Math.PI / 8).map(([x, y], i) => (
              <mesh key={i} geometry={G.hex} material={m.bolt} position={[x, y, 0.022]} rotation={[Math.PI / 2, 0, 0]} />
            ))}
            <mesh material={m.visor} position={[0, 0, 0.024]}>
              <circleGeometry args={[0.115, 48]} />
            </mesh>
            <mesh position={[0, 0, 0.027]}>
              <circleGeometry args={[0.1, 48]} />
              <meshBasicMaterial map={neural} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
            <mesh ref={coreRing} material={m.glow} position={[0, 0, 0.028]}>
              <ringGeometry args={[0.104, 0.11, 48, 1, 0, Math.PI * 1.6]} />
            </mesh>
            <sprite ref={core} position={[0, 0, 0.06]} scale={[0.36, 0.36, 1]}>
              <spriteMaterial map={glow} color="#38bdf8" transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </group>

          {/* side vents */}
          {[-1, 1].map((sd) => (
            <group key={sd} position={[sd * 0.36, 0.45, 0.14]} rotation={[0, sd * 0.9, 0]}>
              {[0, 1, 2].map((i) => (
                <mesh key={i} material={i === 1 ? m.glowSoft : m.dark} position={[0, i * 0.045, 0]}>
                  <boxGeometry args={[0.1, 0.014, 0.012]} />
                </mesh>
              ))}
            </group>
          ))}

          {/* neck: steel core through stacked servo rings */}
          <mesh geometry={G.neckCore} material={m.steel} position={[0, 1.0, 0]} />
          {[0.95, 0.995, 1.04].map((y, i) => (
            <mesh key={y} geometry={G.neckRing} material={i === 1 ? m.steel : m.dark} position={[0, y, 0]} scale={[1 - i * 0.08, 1, 1 - i * 0.08]} />
          ))}

          {/* head */}
          <group ref={head} position={[0, 1.02, 0]}>
            {/* shell, open at the crown */}
            <mesh material={m.shell} position={[0, 0.3, 0]} scale={HEAD_S}>
              <sphereGeometry args={[HEAD_R, 64, 48, 0, Math.PI * 2, CAP_THETA, Math.PI - CAP_THETA]} />
            </mesh>
            <mesh material={m.visor} position={[0, 0.3, 0.012]} scale={[1.08, 0.9, 0.95]}>
              <sphereGeometry args={[0.345, 64, 32, Math.PI / 2 - 1.0, 2.0, 1.0, 1.15]} />
            </mesh>

            {/* neural brain under a glass dome */}
            <mesh material={m.dark} position={[0, CAP_Y, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[HEAD_S[0], HEAD_S[2], 1]}>
              <circleGeometry args={[CAP_R, 48]} />
            </mesh>
            <mesh material={m.steel} position={[0, CAP_Y, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[HEAD_S[0], HEAD_S[2], 1]}>
              <torusGeometry args={[CAP_R, 0.012, 10, 64]} />
            </mesh>
            {ring(10, CAP_R, 0).map(([x, z], i) => (
              <mesh key={i} geometry={G.hex} material={m.bolt} position={[x * HEAD_S[0], CAP_Y + 0.012, z * HEAD_S[2]]} />
            ))}
            <lineSegments geometry={brain.lineGeo} material={brainLineMat} />
            <points geometry={brain.pointGeo} material={brainPointsMat} />
            <sprite ref={brainGlow} position={[0, CAP_Y + 0.08, 0]} scale={[0.55, 0.35, 1]}>
              <spriteMaterial map={glow} color="#38bdf8" transparent opacity={0.3} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
            <mesh material={m.glass} position={[0, CAP_Y, 0]} scale={[HEAD_S[0], 0.85, HEAD_S[2]]} renderOrder={3}>
              <sphereGeometry args={[CAP_R + 0.004, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>

            {/* eyes */}
            <group ref={eyes}>
              <group ref={eyeOpen} position={[0, 0.33, 0]}>
                {[EYE_L, EYE_R].map((e, i) => (
                  <group key={i} position={[e.position[0], 0, e.position[2]]} quaternion={e.quaternion}>
                    <mesh material={m.eye} scale={[1, 1, 0.3]}>
                      <capsuleGeometry args={[0.034, 0.06, 6, 18]} />
                    </mesh>
                    <sprite position={[0, 0, 0.03]} scale={[0.26, 0.3, 1]} renderOrder={2}>
                      <spriteMaterial map={glow} color="#5ef6ff" transparent opacity={0.5} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
                    </sprite>
                  </group>
                ))}
              </group>
              <group ref={eyeHappy} visible={false}>
                {[EYE_L, EYE_R].map((e, i) => (
                  <group key={i} position={e.position} quaternion={e.quaternion}>
                    <mesh material={m.eye} position={[0, -0.02, 0]} scale={[1, 1, 0.5]}>
                      <torusGeometry args={[0.044, 0.013, 8, 24, Math.PI]} />
                    </mesh>
                    <sprite position={[0, 0, 0.03]} scale={[0.26, 0.26, 1]} renderOrder={2}>
                      <spriteMaterial map={glow} color="#5ef6ff" transparent opacity={0.5} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} />
                    </sprite>
                  </group>
                ))}
              </group>
            </group>

            {/* voice meter */}
            <group ref={mouth} position={MOUTH.position} quaternion={MOUTH.quaternion} visible={false}>
              {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={i} material={m.eye} position={[(i - 2) * 0.022, 0, 0]}>
                  <boxGeometry args={[0.011, 0.05, 0.004]} />
                </mesh>
              ))}
            </group>

            {/* ear servos with bolted caps */}
            {[-1, 1].map((sd) => (
              <group key={sd} position={[sd * 0.365, 0.3, 0]}>
                <mesh material={m.shell} rotation={Z90}>
                  <cylinderGeometry args={[0.11, 0.12, 0.08, 36]} />
                </mesh>
                <mesh material={m.steel} position={[sd * 0.042, 0, 0]} rotation={Z90}>
                  <cylinderGeometry args={[0.078, 0.078, 0.012, 36]} />
                </mesh>
                <mesh material={m.glow} position={[sd * 0.049, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.058, 0.006, 8, 40]} />
                </mesh>
                {ring(6, 0.068).map(([a, b], i) => (
                  <mesh key={i} geometry={G.hex} material={m.bolt} position={[sd * 0.05, a, b]} rotation={Z90} />
                ))}
              </group>
            ))}

            {/* antenna on the left ear servo */}
            <group position={[0.41, 0.36, -0.03]} rotation={[-0.15, 0, -0.4]}>
              <mesh material={m.steel} position={[0, 0.09, 0]}>
                <cylinderGeometry args={[0.007, 0.011, 0.18, 8]} />
              </mesh>
              <mesh material={m.eye} position={[0, 0.19, 0]}>
                <sphereGeometry args={[0.02, 14, 10]} />
              </mesh>
              <sprite ref={antenna} position={[0, 0.19, 0]} scale={[0.15, 0.15, 1]}>
                <spriteMaterial map={glow} color="#60a5fa" transparent opacity={0.9} depthWrite={false} blending={THREE.AdditiveBlending} />
              </sprite>
            </group>
          </group>

          <Arm side={-1} rig={rigs[-1]} />
          <Arm side={1} rig={rigs[1]} />
        </group>
      </group>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Brain simulation: spikes travel along edges and re-fire neighbours   */
/* ------------------------------------------------------------------ */
type Brain = ReturnType<typeof makeBrain>;

function fireBrain(b: Brain, count: number) {
  for (let c = 0; c < count; c++) {
    const n = Math.floor(Math.random() * b.N);
    b.act[n] = 1;
    for (const j of b.adj[n]) if (b.pulses.length < 60) b.pulses.push({ e: b.edgeOf(n, j), to: j, t: 0 });
  }
}

function stepBrain(b: Brain, dt: number, color: THREE.Color) {
  for (let i = b.pulses.length - 1; i >= 0; i--) {
    const p = b.pulses[i];
    p.t += dt / 0.24;
    b.edgeGlow[p.e] = Math.max(b.edgeGlow[p.e], 1 - Math.abs(p.t - 0.5));
    if (p.t >= 1) {
      b.pulses.splice(i, 1);
      if (b.act[p.to] < 0.4) {
        b.act[p.to] = 1;
        for (const j of b.adj[p.to]) if (Math.random() < 0.45 && b.pulses.length < 60) b.pulses.push({ e: b.edgeOf(p.to, j), to: j, t: 0 });
      }
    }
  }
  const pc = b.pointGeo.getAttribute('color') as THREE.BufferAttribute;
  for (let i = 0; i < b.N; i++) {
    b.act[i] = Math.max(0, b.act[i] - dt * 1.8);
    const a = b.act[i];
    color.setRGB(0.08 + a * 0.6, 0.3 + a * 0.6, 0.75 + a * 0.25);
    pc.setXYZ(i, color.r, color.g, color.b);
  }
  pc.needsUpdate = true;
  const lc = b.lineGeo.getAttribute('color') as THREE.BufferAttribute;
  for (let e = 0; e < b.edges.length; e++) {
    b.edgeGlow[e] = Math.max(0, b.edgeGlow[e] - dt * 3);
    const [x, y] = b.edges[e];
    for (const [slot, n] of [
      [0, x],
      [1, y],
    ] as const) {
      const a = Math.max(b.edgeGlow[e], b.act[n] * 0.3);
      lc.setXYZ(e * 2 + slot, 0.01 + a * 0.22, 0.04 + a * 0.5, 0.12 + a * 0.7);
    }
  }
  lc.needsUpdate = true;
}
