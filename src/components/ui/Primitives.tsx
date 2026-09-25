'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { pointer } from '@/store/robot';

export function SectionHeader({ index, kicker, title, children }: { index: string; kicker: string; title: ReactNode; children?: ReactNode }) {
  return (
    <header className="section-head reveal">
      <p className="section-head__kicker">
        <span className="section-head__index">{index}</span>
        <span className="section-head__rule" />
        <span>{kicker}</span>
      </p>
      <h2 className="section-head__title">{title}</h2>
      {children && <p className="section-head__lede">{children}</p>}
    </header>
  );
}

/** Rotating phrase with a typed-out effect. */
export function TypeCycle({ words }: { words: string[] }) {
  const [i, setI] = useState(0);
  const [text, setText] = useState(words[0]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const word = words[i % words.length];
    let delay = deleting ? 28 : 55;
    if (!deleting && text === word) delay = 1800;
    if (deleting && text === '') delay = 250;
    const id = window.setTimeout(() => {
      if (!deleting && text === word) setDeleting(true);
      else if (deleting && text === '') {
        setDeleting(false);
        setI((n) => n + 1);
      } else setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, delay);
    return () => window.clearTimeout(id);
  }, [text, deleting, i, words]);

  return (
    <span className="typecycle">
      <span className="sr-only">{words.join(', ')}</span>
      <span aria-hidden>{text}</span>
      <span className="typecycle__caret" aria-hidden />
    </span>
  );
}

/** Decorative frame around the robot's bay with live tracking telemetry. */
export function BayHud({ label, note }: { label: string; note?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (ref.current) {
        const x = pointer.active ? Math.round(pointer.px) : 0;
        const y = pointer.active ? Math.round(pointer.py) : 0;
        ref.current.textContent = `${pointer.summoning ? 'SUMMON' : pointer.active ? 'TRACK' : 'IDLE'} · x${String(x).padStart(4, '0')} y${String(y).padStart(4, '0')}`;
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="bay-hud" aria-hidden>
      <span className="bay-hud__corner bay-hud__corner--tl" />
      <span className="bay-hud__corner bay-hud__corner--tr" />
      <span className="bay-hud__corner bay-hud__corner--bl" />
      <span className="bay-hud__corner bay-hud__corner--br" />
      <span className="bay-hud__label">{label}</span>
      <span className="bay-hud__telemetry" ref={ref} />
      {note && <span className="bay-hud__note">{note}</span>}
    </div>
  );
}

/** Adds `.is-in` to `.reveal` elements as they scroll into view. */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    );
    const scan = () => document.querySelectorAll('.reveal:not(.is-in)').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
