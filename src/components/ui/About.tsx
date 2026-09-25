import { principles, profile } from '@/data/profile';
import { BayHud, SectionHeader } from './Primitives';

export default function About() {
  return (
    <section id="about" className="section">
      <div className="container split split--bay-left">
        <div className="split__bay" data-robot-bay="about">
          <BayHud label="model_card.md" />
        </div>
        <div className="split__content">
          <SectionHeader index="01" kicker="model_card.md" title={<>I like the hard part.</>}>
            I’m {profile.firstName}, a software engineer who builds complete products, from the database schema to
            the last pixel. I’ve written a physics-based drone simulator with its own learning portal, a four-sided
            marketplace, a subscription-commerce app and a point-of-sale system. I work AI-native, with Claude Code
            as a pair programmer, and I care about correctness I can prove, performance I can measure, and
            interfaces nobody has to think about.
          </SectionHeader>

          <div className="principles">
            {principles.map((p, i) => (
              <article key={p.id} className="principle reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                <span className="principle__n">0{i + 1}</span>
                <h3>{p.title}</h3>
                <p>{p.body}</p>
                <span className="chip chip--mono">{p.tag}</span>
              </article>
            ))}
          </div>

          <dl className="facts reveal">
            <div>
              <dt>Based in</dt>
              <dd>{profile.location}</dd>
            </div>
            <div>
              <dt>Focus</dt>
              <dd>{profile.focus}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <span className="pulse-dot" /> {profile.availability}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
