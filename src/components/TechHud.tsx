'use client';

import { useEffect, useRef } from 'react';
import { coreStats, pointer } from '@/store/robot';

/**
 * Instrument rails on both viewport edges. Every number is live: frame rate,
 * geometry in the background core, cursor position, scroll depth.
 */
export default function TechHud() {
  const left = useRef<HTMLSpanElement>(null);
  const right = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let n = 0;
    const pad = (v: number, k = 4) => String(Math.max(0, Math.round(v))).padStart(k, '0');
    const tick = () => {
      if (++n % 8 === 0) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const depth = max > 0 ? (window.scrollY / max) * 100 : 0;
        if (left.current)
          left.current.textContent = `● render live   ·   ${coreStats.fps} fps   ·   ${(1000 / Math.max(coreStats.fps, 1)).toFixed(1)} ms   ·   packets ${pad(coreStats.packets, 2)}   ·   x${pad(pointer.px)} y${pad(pointer.py)}`;
        if (right.current)
          right.current.textContent = `core.render / perspective pass   ·   vertices ${coreStats.vertices}   ·   edges ${coreStats.edges}   ·   particles ${coreStats.particles}   ·   depth ${pad(depth, 3)}%`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="hud" aria-hidden>
      <div className="hud__rail hud__rail--l">
        <span className="hud__vtext" ref={left} />
      </div>
      <div className="hud__rail hud__rail--r">
        <span className="hud__vtext" ref={right} />
      </div>
      <span className="hud__corner hud__corner--tl" />
      <span className="hud__corner hud__corner--tr" />
      <span className="hud__corner hud__corner--bl" />
      <span className="hud__corner hud__corner--br" />
    </div>
  );
}
