/**
 * Personal details. Empty strings hide the corresponding link.
 */
export const profile = {
  name: 'Pavan Sai',
  firstName: 'Pavan',
  role: 'Software Engineer',
  focus: 'Real-time 3D · Simulation · Full-stack',
  location: 'India',
  availability: 'Open to Software Engineering roles',
  email: 'pavancode124@gmail.com',
  github: 'https://github.com/pavanCode124',
  resume: '', // e.g. '/resume.pdf' after dropping the file into /public
  robotName: 'PX-1',
} as const;

export const heroStats = [
  { value: '4', label: 'Products built end-to-end' },
  { value: '60k+', label: 'Lines of code written' },
  { value: '4', label: 'Platforms: web, mobile & desktop' },
  { value: 'AI', label: 'Native workflow with Claude Code & LLMs' },
] as const;

export const principles = [
  {
    id: 'simulate',
    title: 'Simulate, don’t script',
    body:
      'DroneLab never plays a canned crash. Thrust, torque and the motor mixer run every frame, so a backwards prop flips the aircraft because the physics says so.',
    tag: 'DroneLab',
  },
  {
    id: 'correct',
    title: 'Correct by construction',
    body:
      'Billing totals are getters on the model, rounded to paise at each step, and invoice numbers come from Firestore transactions — two tills can never mint the same one.',
    tag: 'Billing',
  },
  {
    id: 'measure',
    title: 'Measure, then claim',
    body:
      'The synthesized rotor tone radiates 316 Hz against a predicted 317. Material caching cut the forest scene from 780 materials to 33. Numbers, not adjectives.',
    tag: 'DroneLab',
  },
  {
    id: 'ai',
    title: 'Pair with AI, own the outcome',
    body:
      'Claude Code explores, drafts and tests alongside me, so iterations take minutes instead of days. I set the architecture, review every diff and answer for every line that ships.',
    tag: 'Claude Code',
  },
] as const;
