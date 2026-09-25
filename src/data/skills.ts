/**
 * Every skill lists the projects it was used in, so each claim on the page
 * points to evidence.
 */
export type Skill = { name: string; proof: string[] };
export type SkillGroup = { id: string; title: string; blurb: string; skills: Skill[] };

export const skillGroups: SkillGroup[] = [
  {
    id: 'ai',
    title: 'AI & LLMs',
    blurb: 'LLMs are part of how I plan, build, test and review: faster, without cutting corners.',
    skills: [
      { name: 'Claude Code', proof: ['DroneLab', 'Billing', 'This site'] },
      { name: 'Claude / Anthropic LLMs', proof: ['Daily workflow'] },
      { name: 'Agentic coding workflows', proof: ['This site'] },
      { name: 'Prompt engineering', proof: ['Daily workflow'] },
      { name: 'Context engineering (CLAUDE.md)', proof: ['Billing'] },
      { name: 'AI-assisted review & testing', proof: ['DroneLab', 'Billing'] },
    ],
  },
  {
    id: 'web3d',
    title: 'Web & Real-time 3D',
    blurb: 'Interactive, GPU-rendered interfaces with simulation behind them.',
    skills: [
      { name: 'React', proof: ['DroneLab', 'This site'] },
      { name: 'Next.js', proof: ['DroneLab portal', 'This site'] },
      { name: 'three.js / WebGL', proof: ['DroneLab', 'This site'] },
      { name: 'React Three Fiber', proof: ['This site'] },
      { name: 'Web Audio API', proof: ['DroneLab'] },
      { name: 'Vite', proof: ['DroneLab'] },
    ],
  },
  {
    id: 'mobile',
    title: 'Mobile & Desktop',
    blurb: 'One Dart codebase, shipped to phones and to a shop-counter PC.',
    skills: [
      { name: 'Flutter', proof: ['GroomTap', 'Green Sortie', 'Billing'] },
      { name: 'Dart', proof: ['GroomTap', 'Green Sortie', 'Billing'] },
      { name: 'GetX', proof: ['GroomTap', 'Green Sortie'] },
      { name: 'Provider', proof: ['GroomTap', 'Billing'] },
      { name: 'Windows desktop', proof: ['Billing'] },
      { name: 'Local notifications', proof: ['GroomTap'] },
    ],
  },
  {
    id: 'backend',
    title: 'Backend & Data',
    blurb: 'APIs, schemas and rules written so bad states can’t happen.',
    skills: [
      { name: 'Node.js / Express', proof: ['DroneLab'] },
      { name: 'Supabase / Postgres', proof: ['DroneLab'] },
      { name: 'Cloud Firestore', proof: ['GroomTap', 'Green Sortie', 'Billing'] },
      { name: 'Firebase Auth', proof: ['GroomTap', 'Green Sortie', 'Billing'] },
      { name: 'Security rules', proof: ['Billing'] },
      { name: 'Transactions', proof: ['Billing'] },
    ],
  },
  {
    id: 'integrations',
    title: 'Integrations',
    blurb: 'The third-party APIs a real business needs.',
    skills: [
      { name: 'Razorpay', proof: ['GroomTap', 'Green Sortie'] },
      { name: 'Google Maps / OSM', proof: ['GroomTap', 'Green Sortie'] },
      { name: 'Google Calendar API', proof: ['GroomTap'] },
      { name: 'OAuth / Google Sign-In', proof: ['DroneLab', 'GroomTap', 'Green Sortie'] },
      { name: 'PDF & thermal print', proof: ['Billing'] },
      { name: 'EAN-13 barcodes', proof: ['Billing'] },
    ],
  },
  {
    id: 'systems',
    title: 'Engineering Craft',
    blurb: 'What sits under the features.',
    skills: [
      { name: 'Physics simulation', proof: ['DroneLab'] },
      { name: 'PID & control mixing', proof: ['DroneLab'] },
      { name: 'Draw-call optimization', proof: ['DroneLab'] },
      { name: 'Inverse kinematics', proof: ['This site'] },
      { name: 'Automated testing', proof: ['DroneLab', 'Billing'] },
      { name: 'WCAG AA contrast', proof: ['DroneLab'] },
    ],
  },
  {
    id: 'ops',
    title: 'Delivery',
    blurb: 'From commit to running in production.',
    skills: [
      { name: 'Docker', proof: ['DroneLab'] },
      { name: 'Nginx', proof: ['DroneLab'] },
      { name: 'Dokploy', proof: ['DroneLab'] },
      { name: 'Git', proof: ['Every project'] },
      { name: 'TypeScript', proof: ['This site'] },
      { name: 'SQL', proof: ['DroneLab'] },
    ],
  },
];
