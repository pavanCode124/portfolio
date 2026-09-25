'use client';

import { useEffect, useState } from 'react';
import { useRobot } from '@/store/robot';

const LINES = [
  'loading model weights',
  'initializing attention heads',
  'compiling shaders',
  'calibrating joint servos',
  'agent PX-1 online',
];

/** Short boot sequence; stays until the robot has rendered a frame. */
export default function BootLoader() {
  const ready = useRobot((s) => s.ready);
  const [step, setStep] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => setStep((s) => Math.min(s + 1, LINES.length - 1)), 260);
    // never trap the visitor behind the loader, even if WebGL stalls
    const failsafe = window.setTimeout(() => useRobot.getState().setReady(), 6000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(failsafe);
    };
  }, []);

  const done = ready && step >= LINES.length - 1;
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(id);
  }, [done]);

  if (gone) return null;
  const pct = Math.round(((step + (ready ? 1 : 0)) / LINES.length) * 100);

  return (
    <div className="boot" data-done={done} aria-hidden={done}>
      <div className="boot__panel">
        <div className="boot__brand">
          <span className="boot__logo">PS</span>
          <span>system boot</span>
        </div>
        <ul className="boot__lines">
          {LINES.slice(0, step + 1).map((l, i) => (
            <li key={l}>
              <span className="boot__ok">{i < step || done ? '✓' : '›'}</span> {l}
            </li>
          ))}
        </ul>
        <div className="boot__bar">
          <span style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
