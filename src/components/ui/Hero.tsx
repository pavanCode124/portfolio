import { heroStats, profile } from '@/data/profile';
import { BayHud, TypeCycle } from './Primitives';

export default function Hero() {
  return (
    <section id="top" className="hero">
      <div className="container hero__grid">
        <div className="hero__copy">
          <p className="eyebrow reveal">
            <span className="pulse-dot" /> {profile.availability}
            <span className="eyebrow__sep" aria-hidden />
            <span className="eyebrow__ai">{profile.role}</span>
          </p>
          <h1 className="hero__title reveal">
            <span className="hero__hello">Hi, I’m</span>
            <span className="hero__name">{profile.name}</span>
          </h1>
          <p className="hero__role reveal">
            <span className="hero__role-title">{profile.role}.</span>
            <span className="hero__role-line">
              I build <TypeCycle words={['AI-accelerated software', 'AI-powered products', 'real-time 3D for the web', 'apps for real businesses']} />
            </span>
          </p>
          <p className="hero__lede reveal">
            I build software that behaves like the real world: a drone simulator where every crash comes out of
            the physics, and production apps that take payments, schedule bookings and run a shop’s billing
            counter. I work AI-native, with Claude Code and LLMs in the loop from spec to review, so I ship across web, Android, iOS and Windows faster.
          </p>
          <div className="hero__cta reveal">
            <a href="#projects" className="btn btn--primary" data-cursor="Open files">
              Open the project files
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path d="M12 5v14m0 0-6-6m6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a href="#contact" className="btn btn--ghost" data-cursor="Say hi">
              Get in touch
            </a>
          </div>
          <dl className="hero__stats reveal">
            {heroStats.map((s) => (
              <div key={s.label} className="stat">
                <dt>{s.label}</dt>
                <dd>{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="hero__bay" data-robot-bay="hero">
          <BayHud label={`AGENT ${profile.robotName} · ONLINE`} note="procedural rig · hinge IK" />
        </div>
      </div>

      <ul className="hero__hints" aria-label="How to interact with the AI agent">
        <li>
          <kbd>Move</kbd> it tracks your cursor
        </li>
        <li>
          <kbd>Hold</kbd> on empty space to summon it
        </li>
        <li>
          <kbd>Click</kbd> the agent
        </li>
        <li>
          <kbd>Folder</kbd> it opens it for you
        </li>
      </ul>

      <a href="#about" className="hero__scroll" aria-label="Scroll to about" data-cursor="Scroll">
        <span />
      </a>
    </section>
  );
}
