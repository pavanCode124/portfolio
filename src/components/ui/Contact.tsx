'use client';

import { useState } from 'react';
import { profile } from '@/data/profile';
import { BayHud, SectionHeader } from './Primitives';

export default function Contact() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(profile.email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${profile.email}`;
    }
  };

  const links = [
    { href: profile.github, label: 'GitHub' },
    { href: profile.resume, label: 'Résumé' },
  ].filter((l) => l.href);

  return (
    <section id="contact" className="section contact">
      <div className="container split split--bay-right">
        <div className="split__content">
          <SectionHeader index="04" kicker="prompt()" title={<>Let’s build something that thinks.</>}>
            I’m looking for a software engineering role on a team that ships ambitious products: real-time
            graphics, AI-powered products, developer tools, or anything where correctness matters. The fastest way to reach
            me is email.
          </SectionHeader>

          <div className="contact__card reveal">
            <a href={`mailto:${profile.email}`} className="contact__email" data-cursor="Write to me">
              {profile.email}
            </a>
            <div className="contact__actions">
              <a href={`mailto:${profile.email}`} className="btn btn--primary">
                Send an email
              </a>
              <button type="button" className="btn btn--ghost" onClick={copy} aria-live="polite">
                {copied ? 'Copied ✓' : 'Copy address'}
              </button>
            </div>
            <ul className="contact__links">
              {links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} target="_blank" rel="noreferrer" data-cursor={l.label}>
                    {l.label}
                    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
                      <path d="M7 17 17 7M9 7h8v8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="split__bay" data-robot-bay="contact">
          <BayHud label="awaiting prompt" />
        </div>
      </div>

      <footer className="footer">
        <div className="container footer__inner">
          <span>
            © {new Date().getFullYear()} {profile.name}
          </span>
        </div>
      </footer>
    </section>
  );
}
