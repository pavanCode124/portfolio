'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { getProject, projects, type Project } from '@/data/projects';
import { useRobot } from '@/store/robot';

export default function ProjectModal() {
  const openId = useRobot((s) => s.openId);
  const origin = useRobot((s) => s.originRect);
  const close = useRobot((s) => s.closeProject);
  const project = getProject(openId);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!project) return;
    lastFocus.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeBtn.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
      lastFocus.current?.focus({ preventScroll: true });
    };
    // only re-run when a window opens or closes, not when switching project inside it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!project, close]);

  if (!project) return null;

  const idx = projects.findIndex((p) => p.id === project.id);
  const prev = projects[(idx - 1 + projects.length) % projects.length];
  const next = projects[(idx + 1) % projects.length];
  const fx = origin ? origin.x - window.innerWidth / 2 : 0;
  const fy = origin ? origin.y - window.innerHeight / 2 : 0;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal__backdrop" onClick={close} />
      <article
        key={project.id}
        className="modal__window"
        style={{ '--accent': project.accent, '--accent2': project.accent2, '--fx': `${fx}px`, '--fy': `${fy}px` } as CSSProperties}
      >
        <header className="modal__bar">
          <span className="modal__dots" aria-hidden>
            <i />
            <i />
            <i />
          </span>
          <span className="modal__path">
            ~/projects/<b>{project.id}</b>
          </span>
          <button ref={closeBtn} type="button" className="modal__close" onClick={close} aria-label="Close project" data-cursor="Close">
            <kbd>esc</kbd>
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className="modal__scroll">
          <div className="modal__hero">
            <p className="modal__kicker">
              <span>{project.index}</span> {project.category}
            </p>
            <h2 id="modal-title" className="modal__title">
              {project.name}
            </h2>
            <p className="modal__tagline">{project.tagline}</p>
            <ul className="modal__meta">
              <li>
                <small>Timeline</small>
                {project.period}
              </li>
              <li>
                <small>Platform</small>
                {project.platform}
              </li>
              <li>
                <small>Role</small>Solo, end-to-end
              </li>
            </ul>
          </div>

          <Gallery project={project} />

          <div className="modal__cols">
            <div>
              <h3 className="modal__h">Overview</h3>
              <p className="modal__p">{project.summary}</p>
              <h3 className="modal__h">What I built</h3>
              <p className="modal__p">{project.role}</p>
              <h3 className="modal__h">Engineering highlights</h3>
              <ul className="highlights">
                {project.highlights.map((h) => (
                  <li key={h.title}>
                    <h4>{h.title}</h4>
                    <p>{h.body}</p>
                  </li>
                ))}
              </ul>
            </div>
            <aside>
              <h3 className="modal__h">{project.pipeline.title}</h3>
              <ol className="pipeline">
                {project.pipeline.steps.map((s, i) => (
                  <li key={s} style={{ animationDelay: `${i * 90}ms` }}>
                    <span className="pipeline__n">{String(i + 1).padStart(2, '0')}</span>
                    {s}
                  </li>
                ))}
              </ol>
              <h3 className="modal__h">Stack</h3>
              <div className="stackgroups">
                {project.stack.map((g) => (
                  <div key={g.group}>
                    <small>{g.group}</small>
                    <div className="chips">
                      {g.items.map((it) => (
                        <span key={it} className="chip">
                          {it}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>

          <nav className="modal__nav" aria-label="Other projects">
            <SwitchButton project={prev} dir="prev" />
            <SwitchButton project={next} dir="next" />
          </nav>
        </div>
      </article>
    </div>
  );
}

function SwitchButton({ project, dir }: { project: Project; dir: 'prev' | 'next' }) {
  return (
    <button
      type="button"
      className={`modal__switch modal__switch--${dir}`}
      style={{ '--accent': project.accent } as CSSProperties}
      onClick={() => useRobot.getState().openProject(project.id, null)}
      data-cursor={dir === 'prev' ? 'Previous' : 'Next'}
    >
      <small>{dir === 'prev' ? '← Previous' : 'Next →'}</small>
      <span>{project.name}</span>
    </button>
  );
}

function Gallery({ project }: { project: Project }) {
  const [i, setI] = useState(0);
  const strip = useRef<HTMLDivElement>(null);
  const shots = project.shots;
  const mobile = shots[0].kind === 'mobile';

  useEffect(() => setI(0), [project.id]);

  const go = useCallback((n: number) => setI((c) => (c + n + shots.length) % shots.length), [shots.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // Scroll the phone strip horizontally only — scrollIntoView would also scroll the window vertically
  useEffect(() => {
    const s = strip.current;
    if (!mobile || !s) return;
    const el = s.children[i] as HTMLElement | undefined;
    if (el) s.scrollTo({ left: el.offsetLeft - (s.clientWidth - el.offsetWidth) / 2, behavior: 'smooth' });
  }, [i, mobile]);

  if (mobile) {
    return (
      <div className="gallery gallery--mobile">
        <div className="phones" ref={strip}>
          {shots.map((s, n) => (
            <figure key={s.src} className="phone" data-active={n === i} onClick={() => setI(n)}>
              <div className="phone__frame">
                <span className="phone__notch" />
                <Image src={s.src} alt={s.caption} fill sizes="240px" className="phone__img" />
              </div>
              <figcaption>{s.caption}</figcaption>
            </figure>
          ))}
        </div>
        <GalleryControls i={i} n={shots.length} go={go} />
      </div>
    );
  }

  const shot = shots[i];
  return (
    <div className="gallery">
      <figure className="browser">
        <div className="browser__bar" aria-hidden>
          <i />
          <i />
          <i />
          <span>{project.id}.app</span>
        </div>
        <div className="browser__view">
          {shots.map((s, n) => (
            <Image
              key={s.src}
              src={s.src}
              alt={s.caption}
              fill
              sizes="(max-width: 1100px) 94vw, 1000px"
              className="browser__img"
              data-active={n === i}
              priority={n === 0}
            />
          ))}
        </div>
        <figcaption>{shot.caption}</figcaption>
      </figure>
      <div className="gallery__row">
        <div className="thumbs" role="tablist" aria-label="Screenshots">
          {shots.map((s, n) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={n === i}
              className="thumb"
              onClick={() => setI(n)}
              aria-label={s.caption}
            >
              <Image src={s.src} alt="" fill sizes="120px" />
            </button>
          ))}
        </div>
        <GalleryControls i={i} n={shots.length} go={go} />
      </div>
    </div>
  );
}

function GalleryControls({ i, n, go }: { i: number; n: number; go: (d: number) => void }) {
  return (
    <div className="gallery__controls">
      <button type="button" onClick={() => go(-1)} aria-label="Previous screenshot" data-cursor="Prev">
        ←
      </button>
      <span>
        {String(i + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}
      </span>
      <button type="button" onClick={() => go(1)} aria-label="Next screenshot" data-cursor="Next">
        →
      </button>
    </div>
  );
}
