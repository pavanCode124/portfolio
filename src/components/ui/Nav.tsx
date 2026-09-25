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

  return (
    <header className="nav" data-scrolled={scrolled}>
      <div className="nav__inner">
        <a href="#top" className="nav__brand" data-cursor="Home">
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
          <a href="#contact" className="btn btn--small btn--primary" data-cursor="Let’s talk">
            Hire me
          </a>
        </div>
      </div>
    </header>
  );
}
