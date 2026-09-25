'use client';

import { useEffect, useRef, useState } from 'react';
import { robotScreen } from '@/store/robot';

/** Targeting reticle for fine pointers. Labels come from `data-cursor` attributes. */
export default function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia('(pointer: fine)').matches;
    setEnabled(fine);
    if (!fine) return;
    document.documentElement.classList.add('has-cursor');

    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;
    let raf = 0;
    let lastLabel = '';
    let hot = false;

    let frame = 0;
    let seen = false;
    const sample = (target: Element | null) => {
      const el = target?.closest<HTMLElement>('[data-cursor], a, button');
      let next = el?.dataset.cursor ?? '';
      hot = !!el;
      if (!el && Math.hypot(x - robotScreen.x, y - robotScreen.y) < robotScreen.r * 0.8) {
        next = 'PX-1 · AI agent';
        hot = true;
      }
      if (next !== lastLabel) {
        lastLabel = next;
        setLabel(next);
      }
    };
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      seen = true;
      sample(e.target as Element | null);
    };
    const tick = () => {
      // Re-sample while the mouse is still: content scrolls, modals open and the robot flies under it
      if (seen && ++frame % 12 === 0) sample(document.elementFromPoint(x, y));
      rx += (x - rx) * 0.22;
      ry += (y - ry) * 0.22;
      if (ring.current) {
        ring.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
        ring.current.dataset.hot = String(hot);
      }
      if (dot.current) dot.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = requestAnimationFrame(tick);
    };
    const press = () => ring.current?.classList.add('is-down');
    const release = () => ring.current?.classList.remove('is-down');

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      document.documentElement.classList.remove('has-cursor');
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden>
        <span className="cursor-ring__tick cursor-ring__tick--t" />
        <span className="cursor-ring__tick cursor-ring__tick--r" />
        <span className="cursor-ring__tick cursor-ring__tick--b" />
        <span className="cursor-ring__tick cursor-ring__tick--l" />
        {label && <span className="cursor-ring__label">{label}</span>}
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden />
    </>
  );
}
