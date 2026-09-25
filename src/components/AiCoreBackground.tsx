'use client';

import { useEffect, useRef } from 'react';
import { coreStats, pointer, useRobot } from '@/store/robot';

/**
 * A 3D AI core behind the page: a geodesic lattice wrapped in three gyroscope
 * rings, with a particle shell drifting around it and data packets crawling
 * the lattice edges. Real perspective projection on a 2D canvas — depth-sorted
 * and depth-faded — so it reads as a solid object without a second WebGL
 * context competing with the robot for the GPU.
 */
type V3 = { x: number; y: number; z: number };
type Edge = { a: number; b: number };
type Packet = { e: number; t: number; speed: number };
type Particle = { spin: number; tilt: number; r: number; size: number; twinkle: number };

const FOCAL = 900;

/** Icosahedron subdivided once and pushed back onto the sphere: 42 verts, 120 edges. */
function icosphere(radius: number) {
  const t = (1 + Math.sqrt(5)) / 2;
  const raw: [number, number, number][] = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ];
  const faces: [number, number, number][] = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];

  const verts: V3[] = raw.map(([x, y, z]) => {
    const l = Math.hypot(x, y, z);
    return { x: (x / l) * radius, y: (y / l) * radius, z: (z / l) * radius };
  });

  const mids = new Map<string, number>();
  const mid = (a: number, b: number) => {
    const key = a < b ? a + '_' + b : b + '_' + a;
    const hit = mids.get(key);
    if (hit !== undefined) return hit;
    const A = verts[a];
    const B = verts[b];
    const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, z: (A.z + B.z) / 2 };
    const l = Math.hypot(m.x, m.y, m.z);
    verts.push({ x: (m.x / l) * radius, y: (m.y / l) * radius, z: (m.z / l) * radius });
    mids.set(key, verts.length - 1);
    return verts.length - 1;
  };

  const seen = new Set<string>();
  const edges: Edge[] = [];
  const addEdge = (a: number, b: number) => {
    const key = a < b ? a + '_' + b : b + '_' + a;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b });
  };
  for (const [a, b, c] of faces) {
    const ab = mid(a, b);
    const bc = mid(b, c);
    const ca = mid(c, a);
    for (const tri of [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]]) {
      addEdge(tri[0], tri[1]);
      addEdge(tri[1], tri[2]);
      addEdge(tri[2], tri[0]);
    }
  }
  return { verts, edges };
}

/** A great circle sampled into a polyline, tilted about X then Z. */
function ring(radius: number, segments: number, tiltX: number, tiltZ: number) {
  const pts: V3[] = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    const y1 = y * Math.cos(tiltX);
    const z1 = y * Math.sin(tiltX);
    pts.push({
      x: x * Math.cos(tiltZ) - y1 * Math.sin(tiltZ),
      y: x * Math.sin(tiltZ) + y1 * Math.cos(tiltZ),
      z: z1,
    });
  }
  return pts;
}

export default function AiCoreBackground() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let radius = 0;
    let lattice = icosphere(1);
    let rings: V3[][] = [];
    let particles: Particle[] = [];
    let packets: Packet[] = [];

    let yaw = 0;
    let pitch = -0.2;
    let leanX = 0;
    let leanY = 0;
    let surge = 0; // flashes the core when the agent presses a folder
    let last = performance.now();
    let fpsAcc = 0;
    let fpsN = 0;

    // deterministic layout per viewport
    let seed = 9;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

    const build = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      seed = 9;
      radius = Math.max(170, Math.min(w, h) * 0.32);
      lattice = icosphere(radius);
      rings = [
        ring(radius * 1.24, 96, 0.28, 0),
        ring(radius * 1.24, 96, Math.PI / 2 - 0.35, 1.1),
        ring(radius * 1.44, 96, Math.PI / 2 + 0.2, -0.9),
      ];

      const count = w > 1400 ? 240 : w > 900 ? 180 : 110;
      particles = Array.from({ length: count }, () => ({
        spin: rnd() * Math.PI * 2,
        tilt: Math.acos(2 * rnd() - 1),
        r: radius * (1.55 + rnd() * 1.6),
        size: 0.5 + rnd() * 1.5,
        twinkle: rnd() * Math.PI * 2,
      }));
      packets = [];

      coreStats.vertices = lattice.verts.length;
      coreStats.edges = lattice.edges.length;
    };

    // the agent pressing a folder sends a surge through the core
    const unsub = useRobot.subscribe((s, prev) => {
      if (s.pressedId && s.pressedId !== prev.pressedId) surge = 1;
    });

    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      fpsAcc += dt;
      fpsN++;
      if (fpsAcc > 0.5) {
        coreStats.fps = Math.round(fpsN / fpsAcc);
        fpsAcc = 0;
        fpsN = 0;
      }

      yaw += dt * 0.085;
      pitch += dt * 0.021;
      surge = Math.max(0, surge - dt * 0.9);

      // the whole core leans a little towards the cursor
      const tx = pointer.active ? ((pointer.px / w) * 2 - 1) * 0.16 : 0;
      const ty = pointer.active ? ((pointer.py / h) * 2 - 1) * 0.12 : 0;
      leanX += (tx - leanX) * Math.min(1, dt * 2.2);
      leanY += (ty - leanY) * Math.min(1, dt * 2.2);

      const cx = w * (w > 1100 ? 0.68 : 0.5);
      const cy = h * 0.44;
      const sy = Math.sin(yaw + leanX);
      const cyw = Math.cos(yaw + leanX);
      const sp = Math.sin(pitch + leanY);
      const cp = Math.cos(pitch + leanY);
      const span = radius * 4;

      /** World → camera → screen. Null when behind the camera. */
      const project = (v: V3) => {
        const x1 = v.x * cyw + v.z * sy;
        const z1 = -v.x * sy + v.z * cyw;
        const y2 = v.y * cp - z1 * sp;
        const z2 = v.y * sp + z1 * cp;
        const d = FOCAL + z2 + radius * 2.4;
        if (d < 40) return null;
        const k = FOCAL / d;
        return { x: cx + x1 * k, y: cy + y2 * k, k, z: z2 };
      };

      ctx.clearRect(0, 0, w, h);
      ctx.lineCap = 'round';

      // --- particle shell -------------------------------------------------
      let shown = 0;
      for (const q of particles) {
        q.spin += dt * 0.12;
        q.twinkle += dt * 1.7;
        const st = Math.sin(q.tilt);
        const P = project({
          x: Math.cos(q.spin) * st * q.r,
          y: Math.cos(q.tilt) * q.r,
          z: Math.sin(q.spin) * st * q.r,
        });
        if (!P) continue;
        shown++;
        const near = Math.max(0, Math.min(1, P.z / span + 0.5));
        const a = (0.07 + 0.24 * near) * (0.6 + 0.4 * Math.sin(q.twinkle));
        ctx.fillStyle = 'rgba(150, 214, 255, ' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(P.x, P.y, Math.max(0.4, q.size * P.k), 0, Math.PI * 2);
        ctx.fill();
      }
      coreStats.particles = shown;

      // --- gyroscope rings ------------------------------------------------
      rings.forEach((pts, ri) => {
        const spin = yaw * (ri === 0 ? -0.55 : ri === 1 ? 0.8 : -1.1);
        const cs = Math.cos(spin);
        const sn = Math.sin(spin);
        ctx.lineWidth = 1.1;
        for (let i = 0; i < pts.length; i++) {
          const A = pts[i];
          const B = pts[(i + 1) % pts.length];
          const PA = project({ x: A.x * cs - A.z * sn, y: A.y, z: A.x * sn + A.z * cs });
          const PB = project({ x: B.x * cs - B.z * sn, y: B.y, z: B.x * sn + B.z * cs });
          if (!PA || !PB) continue;
          const front = (PA.z + PB.z) / 2 > 0;
          ctx.strokeStyle = front
            ? 'rgba(125, 240, 255, ' + (0.22 + surge * 0.3).toFixed(3) + ')'
            : 'rgba(94, 214, 255, ' + (0.06 + surge * 0.1).toFixed(3) + ')';
          ctx.beginPath();
          ctx.moveTo(PA.x, PA.y);
          ctx.lineTo(PB.x, PB.y);
          ctx.stroke();
        }
      });

      // --- lattice, far edges first ---------------------------------------
      const proj = lattice.verts.map(project);
      const order = lattice.edges
        .map((e, i) => ({ i, z: ((proj[e.a]?.z ?? 0) + (proj[e.b]?.z ?? 0)) / 2 }))
        .sort((a, b) => a.z - b.z);

      for (const o of order) {
        const e = lattice.edges[o.i];
        const A = proj[e.a];
        const B = proj[e.b];
        if (!A || !B) continue;
        const near = Math.max(0, Math.min(1, (A.z + B.z) / (2 * span) + 0.5));
        const a = Math.min(1, 0.05 + near * 0.3 + surge * 0.25);
        ctx.strokeStyle = 'rgba(86, 190, 255, ' + a.toFixed(3) + ')';
        ctx.lineWidth = 0.6 + near * 0.9;
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        ctx.stroke();
      }

      for (const P of proj) {
        if (!P) continue;
        const near = Math.max(0, Math.min(1, P.z / span + 0.5));
        const a = Math.min(1, 0.14 + near * 0.55 + surge * 0.3);
        ctx.fillStyle = 'rgba(190, 240, 255, ' + a.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(P.x, P.y, (0.9 + near * 1.6) * P.k, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- data packets crawling the lattice ------------------------------
      const cap = w > 900 ? 34 : 18;
      if (packets.length < cap && Math.random() < dt * 34)
        packets.push({ e: Math.floor(Math.random() * lattice.edges.length), t: 0, speed: 0.5 + Math.random() * 0.7 });
      if (surge > 0.92)
        for (let i = 0; i < 12; i++)
          packets.push({ e: Math.floor(Math.random() * lattice.edges.length), t: 0, speed: 1.2 + Math.random() });

      for (let i = packets.length - 1; i >= 0; i--) {
        const pk = packets[i];
        pk.t += dt * pk.speed;
        if (pk.t >= 1) {
          packets.splice(i, 1);
          continue;
        }
        const e = lattice.edges[pk.e];
        const A = proj[e.a];
        const B = proj[e.b];
        if (!A || !B) continue;
        const t0 = Math.max(0, pk.t - 0.28);
        const x0 = A.x + (B.x - A.x) * t0;
        const y0 = A.y + (B.y - A.y) * t0;
        const x1 = A.x + (B.x - A.x) * pk.t;
        const y1 = A.y + (B.y - A.y) * pk.t;
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, 'rgba(56, 189, 248, 0)');
        g.addColorStop(1, 'rgba(160, 250, 255, 0.75)');
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.fillStyle = 'rgba(220, 253, 255, 0.85)';
        ctx.beginPath();
        ctx.arc(x1, y1, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      coreStats.packets = packets.length;

      // --- inner glow -----------------------------------------------------
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.95);
      glow.addColorStop(0, 'rgba(96, 205, 255, ' + (0.1 + surge * 0.14).toFixed(3) + ')');
      glow.addColorStop(0.55, 'rgba(59, 130, 246, 0.05)');
      glow.addColorStop(1, 'rgba(59, 130, 246, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.95, 0, Math.PI * 2);
      ctx.fill();

      if (!reduced) raf = requestAnimationFrame(draw);
    };

    build();
    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', build);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', build);
      unsub();
    };
  }, []);

  return (
    <div className="bg" aria-hidden>
      <div className="bg__glow bg__glow--a" />
      <div className="bg__glow bg__glow--b" />
      <div className="bg__grid" />
      <canvas ref={ref} className="bg__core" />
      <div className="bg__scan" />
      <div className="bg__vignette" />
    </div>
  );
}
