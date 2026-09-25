import { skillGroups } from '@/data/skills';
import { BayHud, SectionHeader } from './Primitives';

export default function Skills() {
  return (
    <section id="skills" className="section">
      <div className="container split split--bay-left">
        <div className="split__bay" data-robot-bay="skills">
          <BayHud label="weights.inspect()" />
        </div>
        <div className="split__content">
          <SectionHeader index="03" kicker="model.weights" title={<>Skills, with receipts.</>}>
            No self-rated progress bars. Each skill names the project where I actually used it.
          </SectionHeader>
          <div className="skillgrid">
            {skillGroups.map((g, gi) => (
              <article
                key={g.id}
                className={`skillcard reveal${g.id === 'ai' ? ' skillcard--ai' : ''}`}
                style={{ transitionDelay: `${gi * 60}ms` }}
              >
                <header>
                  {g.id === 'ai' && <span className="skillcard__badge">AI-native</span>}
                  <h3>{g.title}</h3>
                  <p>{g.blurb}</p>
                </header>
                <ul>
                  {g.skills.map((s) => (
                    <li key={s.name}>
                      <span className="skill__name">{s.name}</span>
                      <span className="skill__proof">{s.proof.join(' · ')}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
