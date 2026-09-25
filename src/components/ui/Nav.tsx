'use client';

import { useEffect, useState } from 'react';
import { profile } from '@/data/profile';

const LINKS = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Work' },
  { href: '#skills', label: 'Skills' },
  { href: '#contact', label: 'Contact' },
];

export default function Nav() {
  const [active, setActive] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: '-50% 0px -50% 0px' },
    );
    document.querySelectorAll('section[id]').forEach((s) => io.observe(s));
    return () => {
      window.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, []);

  // The sheet only exists on narrow screens: close it if the layout grows past the breakpoint
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 961px)');
    const close = () => setMenu(false);
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  useEffect(() => {
    if (!menu) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  return (
    <header className="nav" data-scrolled={scrolled} data-menu={menu}>
      <div className="nav__inner">
        <a href="#top" className="nav__brand" data-cursor="Home" onClick={() => setMenu(false)}>
          <span className="nav__logo" aria-hidden>
            PS
          </span>
          <span className="nav__name">{profile.name}</span>
          <span className="nav__role">{profile.role}</span>
        </a>
        <nav aria-label="Sections">
          <ul className="nav__links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} aria-current={active === l.href ? 'true' : undefined}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="nav__right">
          <span className="nav__status" title="The AI agent is running">
            <span className="pulse-dot" /> agent {profile.robotName} online
          </span>
          <a href="#contact" className="btn btn--small btn--primary nav__hire" data-cursor="Let’s talk">
            Hire me
          </a>
          <button
            type="button"
            className="nav__burger"
            aria-expanded={menu}
            aria-controls="nav-sheet"
            aria-label={menu ? 'Close menu' : 'Open menu'}
            data-cursor="Menu"
            onClick={() => setMenu((m) => !m)}
          >
            <span aria-hidden />
            <span aria-hidden />
            <span aria-hidden />
          </button>
        </div>
      </div>

      <div className="nav__scrim" data-open={menu} onClick={() => setMenu(false)} aria-hidden />
      <div id="nav-sheet" className="nav__sheet" data-open={menu} aria-hidden={!menu}>
        <nav aria-label="Sections (mobile)">
          <ul className="nav__sheet-links">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  tabIndex={menu ? undefined : -1}
                  aria-current={active === l.href ? 'true' : undefined}
                  onClick={() => setMenu(false)}
                >
                  {l.label}
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <span className="nav__sheet-status">
          <span className="pulse-dot" /> agent {profile.robotName} online
        </span>
      </div>
    </header>
  );
}
