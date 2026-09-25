import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/**
 * Materials are created once and shared by every mesh. One material per role
 * keeps the robot at a handful of shader programs, whatever the mesh count.
 */
let cache: ReturnType<typeof build> | null = null;

function build() {
  const additive = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false } as const;
  return {
    shell: new THREE.MeshPhysicalMaterial({
      color: '#eef3f9',
      roughness: 0.24,
      metalness: 0.06,
      clearcoat: 1,
      clearcoatRoughness: 0.07,
      sheen: 0.25,
      sheenColor: new THREE.Color('#bcdcff'),
    }),
    dark: new THREE.MeshStandardMaterial({ color: '#141a24', roughness: 0.34, metalness: 0.85 }),
    steel: new THREE.MeshStandardMaterial({ color: '#a9b5c4', roughness: 0.28, metalness: 1 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#dfe7f0', roughness: 0.08, metalness: 1 }),
    bolt: new THREE.MeshStandardMaterial({ color: '#7f8b9b', roughness: 0.36, metalness: 1 }),
    rubber: new THREE.MeshStandardMaterial({ color: '#0b0f16', roughness: 0.85, metalness: 0.05 }),
    visor: new THREE.MeshPhysicalMaterial({
      color: '#03060c',
      roughness: 0.04,
      metalness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
    }),
    glass: new THREE.MeshPhysicalMaterial({
      color: '#6cc4ff',
      roughness: 0.04,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
    eye: new THREE.MeshBasicMaterial({ color: new THREE.Color('#8ffbff').multiplyScalar(1.6), toneMapped: false }),
    glow: new THREE.MeshBasicMaterial({ color: new THREE.Color('#5ef6ff').multiplyScalar(1.4), toneMapped: false }),
    glowSoft: new THREE.MeshBasicMaterial({ color: '#4fd8ff', transparent: true, opacity: 0.75, toneMapped: false }),
    accent: new THREE.MeshBasicMaterial({ color: new THREE.Color('#3b82f6').multiplyScalar(1.5), toneMapped: false }),
    padRing: new THREE.MeshBasicMaterial({ color: '#5ef6ff', opacity: 0.7, side: THREE.DoubleSide, ...additive }),
    padDash: new THREE.MeshBasicMaterial({ color: '#3b82f6', opacity: 0.6, side: THREE.DoubleSide, ...additive }),
  };
}

export function useRobotMaterials() {
  if (!cache) cache = build();
  return cache;
}

/* ------------------------------------------------------------------ */
/* Shared geometry — every bolt, pin and finger segment reuses these   */
/* ------------------------------------------------------------------ */
let geo: ReturnType<typeof buildGeo> | null = null;

const cyl = (rt: number, rb: number, h: number, seg = 24) => new THREE.CylinderGeometry(rt, rb, h, seg);
/** Cylinder that starts at the origin and extends down -Y (for pistons). */
const hangingCyl = (r: number, h: number) => cyl(r, r, h, 16).translate(0, -h / 2, 0);

function buildGeo() {
  return {
    hex: cyl(0.0105, 0.0105, 0.009, 6),
    hexBig: cyl(0.024, 0.024, 0.014, 6),
    pin: cyl(0.0085, 0.0085, 0.034, 10),
    knob: new THREE.SphereGeometry(0.02, 14, 10),
    shoulderBall: new THREE.SphereGeometry(0.1, 28, 20),
    pauldron: new THREE.SphereGeometry(0.165, 40, 28, 0, Math.PI * 2, 0, Math.PI * 0.6),
    servo: cyl(0.085, 0.085, 0.07, 32),
    servoCap: cyl(0.052, 0.052, 0.012, 32),
    servoRing: new THREE.TorusGeometry(0.079, 0.005, 8, 48),
    yoke: cyl(0.056, 0.056, 0.09, 24),
    upperShell: cyl(0.074, 0.066, 0.26, 32),
    band: cyl(0.077, 0.077, 0.012, 32),
    strip: new THREE.BoxGeometry(0.012, 0.16, 0.006),
    clevis: new RoundedBoxGeometry(0.018, 0.15, 0.12, 2, 0.006),
    axle: cyl(0.03, 0.03, 0.17, 20),
    hub: cyl(0.057, 0.057, 0.12, 28),
    foreShell: cyl(0.07, 0.086, 0.24, 32),
    foreBand: cyl(0.074, 0.074, 0.014, 32),
    wristCollar: cyl(0.088, 0.07, 0.05, 32),
    rollDisc: cyl(0.066, 0.066, 0.035, 36),
    rollMark: new THREE.BoxGeometry(0.008, 0.024, 0.014),
    wristAxle: cyl(0.027, 0.027, 0.11, 18),
    pistonHousing: hangingCyl(0.019, 0.24),
    pistonRod: hangingCyl(0.0085, 0.27),
    palm: new RoundedBoxGeometry(0.14, 0.12, 0.052, 3, 0.016),
    backPlate: new RoundedBoxGeometry(0.118, 0.088, 0.016, 2, 0.007),
    palmPad: new RoundedBoxGeometry(0.108, 0.078, 0.01, 2, 0.004),
    knuckleBar: cyl(0.014, 0.014, 0.136, 16),
    seg1: new RoundedBoxGeometry(0.026, 0.05, 0.027, 2, 0.007),
    seg2: new RoundedBoxGeometry(0.024, 0.04, 0.025, 2, 0.007),
    seg3: new RoundedBoxGeometry(0.022, 0.032, 0.023, 2, 0.007),
    tip: new THREE.SphereGeometry(0.009, 10, 8),
    neckRing: cyl(0.1, 0.1, 0.028, 28),
    neckCore: cyl(0.06, 0.06, 0.16, 20),
  };
}

export function useRobotGeometry() {
  if (!geo) geo = buildGeo();
  return geo;
}

let glowTex: THREE.Texture | null = null;

/** Soft radial falloff used for every halo, generated instead of shipped as a file. */
export function getGlowTexture() {
  if (glowTex) return glowTex;
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.65)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  glowTex = new THREE.CanvasTexture(c);
  glowTex.colorSpace = THREE.SRGBColorSpace;
  return glowTex;
}

let neuralTex: THREE.Texture | null = null;

/** A small feed-forward network drawn for the chest core. */
export function getNeuralTexture() {
  if (neuralTex) return neuralTex;
  const S = 256;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const layers = [3, 5, 5, 2];
  const pts = layers.map((n, li) =>
    Array.from({ length: n }, (_, i) => [S * (0.2 + (0.6 * li) / (layers.length - 1)), S * (0.5 + (i - (n - 1) / 2) * 0.15)]),
  );
  g.lineWidth = 2;
  for (let l = 0; l < pts.length - 1; l++)
    for (const a of pts[l])
      for (const b of pts[l + 1]) {
        g.strokeStyle = 'rgba(94,246,255,0.35)';
        g.beginPath();
        g.moveTo(a[0], a[1]);
        g.lineTo(b[0], b[1]);
        g.stroke();
      }
  for (const layer of pts)
    for (const [x, y] of layer) {
      const grad = g.createRadialGradient(x, y, 0, x, y, 16);
      grad.addColorStop(0, 'rgba(210,252,255,1)');
      grad.addColorStop(0.35, 'rgba(94,246,255,0.8)');
      grad.addColorStop(1, 'rgba(59,130,246,0)');
      g.fillStyle = grad;
      g.beginPath();
      g.arc(x, y, 16, 0, Math.PI * 2);
      g.fill();
    }
  neuralTex = new THREE.CanvasTexture(c);
  neuralTex.colorSpace = THREE.SRGBColorSpace;
  return neuralTex;
}
