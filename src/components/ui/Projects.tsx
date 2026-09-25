'use client';

import Image from 'next/image';
import { useRef, type CSSProperties } from 'react';
import { projects, type Project } from '@/data/projects';
import { useRobot } from '@/store/robot';
import { openWithRobot } from './openWithRobot';
import { BayHud, SectionHeader } from './Primitives';

export default function Projects() {
  return (
    <section id="projects" className="section">
      <div className="container split split--bay-right">
        <div className="split__content">
          <SectionHeader index="02" kicker="~/deployments" title={<>Selected work, filed away.</>}>
            Four products, each built end-to-end. Click a folder and PX-1, my AI agent, will fly over, reach out and open it for
            you.
          </SectionHeader>
          <div className="folders">
            {projects.map((p, i) => (
              <Folder key={p.id} project={p} i={i} />
            ))}
          </div>
        </div>
        <div className="split__bay" data-robot-bay="projects">
          <BayHud label="agent · awaiting instruction" note="click any folder" />
        </div>
      </div>
    </section>
  );
}

function Folder({ project: p, i }: { project: Project; i: number }) {
  const ref = useRef<HTMLButtonElement>(null);
  const pressed = useRobot((s) => s.pressedId === p.id);
  const targeted = useRobot((s) => s.task?.projectId === p.id);
  const cover = p.shots[0];

  return (
    <button
      ref={ref}
      type="button"
      className="folder reveal"
      data-state={pressed ? 'open' : targeted ? 'targeted' : 'idle'}
      data-kind={cover.kind}
      data-cursor={`Open ${p.name}`}
      style={{ '--accent': p.accent, '--accent2': p.accent2, transitionDelay: `${i * 80}ms` } as CSSProperties}
      onClick={() => ref.current && openWithRobot(p.id, ref.current)}
      aria-haspopup="dialog"
      aria-label={`Open ${p.name}: ${p.tagline}`}
    >
      <span className="folder__back">
        <span className="folder__tab">
          <span className="folder__tab-index">{p.index}</span>
          <span>{p.id}/</span>
        </span>
      </span>

      <span className="folder__paper">
        <Image src={cover.src} alt="" fill sizes="(max-width: 900px) 90vw, 420px" className="folder__shot" priority={i < 2} />
      </span>

      <span className="folder__front">
        <span className="folder__meta">
          <span>{p.category}</span>
          <span>{p.platform}</span>
        </span>
        <span className="folder__name">{p.name}</span>
        <span className="folder__tagline">{p.tagline}</span>
        <span className="folder__foot">
          <span className="folder__stack">
            {p.stack
              .flatMap((g) => g.items)
              .slice(0, 4)
              .map((s) => (
                <span key={s} className="chip">
                  {s}
                </span>
              ))}
          </span>
          <span className="folder__open">
            Open
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
              <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </span>
      </span>

      <span className="folder__ripple" aria-hidden />
      <span className="folder__lock" aria-hidden>
        PX-1 en route…
      </span>
    </button>
  );
}
