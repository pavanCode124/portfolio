'use client';

import dynamic from 'next/dynamic';
import { Component, useEffect, useState, type ReactNode } from 'react';
import { pointer, robotScreen, useRobot } from '@/store/robot';

const RobotCanvas = dynamic(() => import('./three/RobotCanvas'), { ssr: false });

/** Elements that should never trigger a summon when pressed. */
const INTERACTIVE = 'a, button, input, textarea, select, label, p, h1, h2, h3, h4, li, img, [role="dialog"], [data-no-summon]';

class GLBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export default function Experience() {
  const [gl, setGl] = useState<boolean | null>(null);

  useEffect(() => {
    const ok = hasWebGL();
    setGl(ok);
    if (!ok) useRobot.getState().setReady();
  }, []);

  // Pointer bridge: DOM events → shared mutable pointer state
  useEffect(() => {
    let holdTimer: number | undefined;
    let downAt = 0;
    let downX = 0;
    let downY = 0;

    const move = (e: PointerEvent) => {
      pointer.px = e.clientX;
      pointer.py = e.clientY;
      pointer.active = true;
      pointer.lastMove = performance.now();
    };
    const leave = () => {
      pointer.active = false;
      pointer.summoning = false;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const target = e.target as Element | null;
      downAt = performance.now();
      downX = e.clientX;
      downY = e.clientY;
      if (target?.closest(INTERACTIVE) || useRobot.getState().openId || useRobot.getState().task) return;
      holdTimer = window.setTimeout(() => {
        pointer.summoning = true;
        document.body.classList.add('is-summoning');
      }, 200);
    };
    const up = (e: PointerEvent) => {
      window.clearTimeout(holdTimer);
      const wasSummoning = pointer.summoning;
      pointer.summoning = false;
      document.body.classList.remove('is-summoning');
      if (wasSummoning || e.pointerType !== 'mouse') return;

      const quick = performance.now() - downAt < 300 && Math.hypot(e.clientX - downX, e.clientY - downY) < 6;
      const onRobot = Math.hypot(e.clientX - robotScreen.x, e.clientY - robotScreen.y) < robotScreen.r;
      const target = e.target as Element | null;
      if (quick && onRobot && !target?.closest('a, button, input, textarea, [role="dialog"]')) {
        useRobot.getState().gestureNow('spin');
      }
    };

    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', leave);
    document.documentElement.addEventListener('pointerleave', leave);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('blur', leave);
      document.documentElement.removeEventListener('pointerleave', leave);
      window.clearTimeout(holdTimer);
    };
  }, []);

  return (
    <>
      {gl && (
        <GLBoundary>
          <RobotCanvas />
        </GLBoundary>
      )}
      <Speech />
    </>
  );
}

function Speech() {
  const speech = useRobot((s) => s.speech);
  const ready = useRobot((s) => s.ready);
  const [visible, setVisible] = useState(false);

  // Greet once the robot is on screen
  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      const s = useRobot.getState();
      s.gestureNow('wave');
      s.say('Hi, I’m PX-1, Pavan’s AI agent. I track your cursor. Hold click on empty space to summon me.');
    }, 1300);
    return () => window.clearTimeout(id);
  }, [ready]);

  useEffect(() => {
    if (!speech) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), Math.max(3200, speech.text.length * 55));
    return () => window.clearTimeout(id);
  }, [speech]);

  return (
    <div id="robot-speech" className="speech" data-visible={visible} aria-live="polite" role="status">
      <div className="speech__bubble">
        <span className="speech__name">PX-1</span>
        <span className="speech__text">{speech?.text}</span>
      </div>
    </div>
  );
}
