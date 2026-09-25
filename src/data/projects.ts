export type Shot = {
  src: string;
  caption: string;
  kind: 'desktop' | 'mobile';
  width: number;
  height: number;
};

/** Where the finished product actually lives, shown inside the project window. */
export type ProjectLink = {
  href: string;
  label: string;
};

export type Project = {
  id: string;
  index: string;
  name: string;
  tagline: string;
  category: string;
  period: string;
  platform: string;
  accent: string;
  accent2: string;
  link?: ProjectLink;
  summary: string;
  role: string;
  highlights: { title: string; body: string }[];
  pipeline: { title: string; steps: string[] };
  stack: { group: string; items: string[] }[];
  shots: Shot[];
};

const desk = (src: string, caption: string): Shot => ({ src, caption, kind: 'desktop', width: 1917, height: 865 });
const phone = (src: string, caption: string): Shot => ({ src, caption, kind: 'mobile', width: 720, height: 1600 });

export const projects: Project[] = [
  {
    id: 'dronelab',
    index: '01',
    name: 'DroneLab',
    tagline: 'Build a quad, hex or octocopter — then fly it on real physics',
    category: 'Real-time 3D · Physics · Full-stack',
    period: 'Jul – Sep 2026',
    platform: 'Web',
    accent: '#38bdf8',
    accent2: '#2563eb',
    link: { href: 'https://drone.rajuddan.in/login', label: 'Open the live app' },
    summary:
      'A classroom simulator that teaches how a drone is built and why it flies — or doesn’t. Students assemble a quadcopter, hexacopter or octocopter part by part, wire the loom pin to pin, pass pre-flight checks, then fly it through two fields — forest and city — with mission gates, live telemetry and crash reports that make it play like a game. Nothing is scripted: every failure falls out of a real control loop. A Next.js portal on top gives students, schools and administrators their own dashboards.',
    role:
      'Sole engineer — simulation, rendering, audio synthesis, the Express API, the Next.js portal, the Supabase schema and the Docker/Nginx deployment.',
    highlights: [
      {
        title: 'Three airframes off one mixer',
        body:
          'Quadcopter, hexacopter and octocopter are not presets. Each airframe builds its own arm geometry and mixing matrix, so rotor count changes the control authority, the yaw balance and which failures are survivable.',
      },
      {
        title: 'Failures emerge from the control loop',
        body:
          'Sticks → attitude PID → motor mixer → ESC → RPM → thrust and reaction torque → rigid body, stepped at 240 Hz. Kill one motor on a quad and the survivors genuinely cannot cancel yaw; a rank analysis of the mixer says the same thing, and it matches the course notes on all eight cases.',
      },
      {
        title: 'Assembly and wiring that can actually be wrong',
        body:
          'Students seat every component and wire the loom pin to pin. A reversed prop or a mis-pinned ESC signal wire passes assembly and then shows up in the air, exactly as it would on a real build.',
      },
      {
        title: 'Two flight fields, played like a game',
        body:
          'Forest and city fields with mission gates, HUD telemetry, per-motor thrust bars and a proximity alarm. Every sortie ends in a crash report that names the primary cause and the decision trees that faulted.',
      },
      {
        title: 'Decision trees you can watch think',
        body:
          'The 13 flowcharts from the syllabus are encoded as data. They are drawn as diagrams and also walked at runtime against live simulator state, lighting the exact branch the aircraft is on, per motor.',
      },
      {
        title: 'Audio and rendering built to a budget',
        body:
          'Blade-pass tones ride live per-motor RPM through the Web Audio API, so four slightly detuned motors beat against each other. Caching materials by value took the forest from 780 materials to 33 and paid for instancing 1,800+ objects at 86–198 draw calls a frame.',
      },
    ],
    pipeline: {
      title: 'Flight control loop · every physics step',
      steps: ['RC sticks', 'Attitude PID', 'Motor mixer', 'ESC', 'Motor RPM', 'Thrust + torque', 'Rigid body'],
    },
    stack: [
      { group: 'Simulator', items: ['React 18', 'three.js', 'Vite', 'Web Audio API'] },
      { group: 'Portal', items: ['Next.js 14', 'Supabase SSR', 'Google OAuth'] },
      { group: 'API & data', items: ['Node.js', 'Express', 'Supabase / Postgres', 'Nodemailer'] },
      { group: 'Ops', items: ['Docker', 'Nginx', 'Dokploy', '10 verify suites'] },
    ],
    shots: [
      desk('/projects/dronelab/ss-1.png', 'Assembly bay — Module 2 complete, live mixer and component verdicts'),
      desk('/projects/dronelab/ss-2.png', 'City flight field — HUD telemetry, per-motor thrust, mission gates'),
      desk('/projects/dronelab/ss-3.png', 'Forest field — hexacopter in manual flight'),
      desk('/projects/dronelab/ss-4.png', 'Octocopter on the pad — light theme, 8-rotor mixer diagram'),
      desk('/projects/dronelab/ss-5.png', 'Crash report — primary cause and faulting decision trees'),
      desk('/projects/dronelab/ss-7.png', 'Student dashboard in the Next.js portal'),
      desk('/projects/dronelab/ss-9.png', 'Progress across all three airframes'),
      desk('/projects/dronelab/ss-8.png', 'Administration — school approvals and join codes'),
      desk('/projects/dronelab/ss-6.png', 'Role-based sign in: student, school, administrator'),
    ],
  },
  {
    id: 'groomtap',
    index: '02',
    name: 'GroomTap',
    tagline: 'An on-demand home-salon marketplace',
    category: 'Mobile marketplace · Payments · Maps',
    period: 'Oct 2025 – Jul 2026',
    platform: 'Android · iOS',
    accent: '#60a5fa',
    accent2: '#22d3ee',
    link: { href: 'https://play.google.com/store/search?q=groomtap&c=apps', label: 'Get it on Google Play' },
    summary:
      'A four-sided marketplace that brings salon services to the customer’s door. Customers discover salons and freelance artists near them, build a cart across service categories, pick a slot and pay in-app. Partners onboard through a verification flow that an admin approves before they go live.',
    role:
      'Built the full Flutter app and its Firebase backend — auth and roles, booking, payments, maps, calendar sync and scheduled reminders.',
    highlights: [
      {
        title: 'Four roles, one codebase',
        body:
          'Customer, salon partner, freelance artist and admin each resolve to their own home, profile and permission set at sign-in. Partners stay behind a verification gate until an admin approves them from the in-app dashboard.',
      },
      {
        title: 'Booking → calendar → reminder',
        body:
          'A confirmed booking writes through to the customer’s Google Calendar, with idempotent handling so a retry never duplicates the event, and schedules a timezone-correct local notification before the slot.',
      },
      {
        title: 'Discovery bounded by service radius',
        body:
          'Geolocator and geocoding resolve the customer’s address and Google Maps renders it, but each partner advertises a radius, so the list only contains people who can actually reach the door.',
      },
      {
        title: 'Payments and identity',
        body:
          'Razorpay checkout with first-booking pricing, Google Sign-In alongside verified email, and sessions persisted across launches so a returning customer lands straight on their bookings.',
      },
    ],
    pipeline: {
      title: 'Booking lifecycle',
      steps: ['Discover nearby', 'Mix & match cart', 'Pick a slot', 'Razorpay', 'Calendar sync', 'Reminder'],
    },
    stack: [
      { group: 'App', items: ['Flutter', 'Dart', 'GetX', 'Provider'] },
      { group: 'Backend', items: ['Firebase Auth', 'Cloud Firestore', 'Firebase Storage'] },
      { group: 'Integrations', items: ['Google Maps', 'Geolocator', 'Razorpay', 'Google Calendar API', 'Google Sign-In'] },
      { group: 'Platform', items: ['Local notifications', 'Timezone scheduling', 'Native splash'] },
    ],
    shots: [
      phone('/projects/groomtap/ss-1.jpeg', 'Home — salon services at your doorstep'),
      phone('/projects/groomtap/ss-2.jpeg', 'Featured salons with filters and service radius'),
      phone('/projects/groomtap/ss-8.jpeg', 'Booking — mix & match cart, date and time'),
      phone('/projects/groomtap/ss-6.jpeg', 'Role-based sign in'),
      phone('/projects/groomtap/ss-3.jpeg', 'About — brand story'),
      phone('/projects/groomtap/ss-4.jpeg', 'FAQ with expandable answers'),
      phone('/projects/groomtap/ss-5.jpeg', 'Support entry point'),
    ],
  },
  {
    id: 'greensortie',
    index: '03',
    name: 'Green Sortie',
    tagline: 'A healthy-meal subscription app',
    category: 'Mobile commerce · Subscriptions',
    period: 'Jun 2026',
    platform: 'Android · iOS',
    accent: '#22d3ee',
    accent2: '#3b82f6',
    summary:
      'A meal-subscription app for a healthy-food kitchen. Customers browse plans, configure a subscription — trial or main, 30/60/90 days, veg or non-veg, lunch, dinner or both, with allergies noted — pin their delivery address on a map and pay. Pricing lives in Firestore, so the kitchen can change it without an app release.',
    role:
      'Designed and built the app end-to-end in about two weeks, from first commit to a finished app, on Firebase with GetX.',
    highlights: [
      {
        title: 'Pricing the kitchen owns',
        body:
          'Plan type × duration × diet × timing resolves against a grid held in Firestore, so the price on the checkout screen is whatever the kitchen set that morning — no app release in the loop.',
      },
      {
        title: 'Two-step checkout with a pinned address',
        body:
          'A stepper collects the plan first, then the address. flutter_map over OpenStreetMap with geolocator puts a draggable pin on the exact gate, which is what the delivery rider actually needs.',
      },
      {
        title: 'Payment listeners that clean up',
        body:
          'Razorpay success, failure and external-wallet callbacks are bound to the controller lifecycle and cleared on close, so no listener from a previous checkout can fire into the next one.',
      },
      {
        title: 'Every screen has a third state',
        body:
          'Connectivity-aware loading, cached network images, and explicit empty and error states, so a dropped connection degrades instead of showing a blank list.',
      },
    ],
    pipeline: {
      title: 'Subscription checkout',
      steps: ['Pick plan', 'Duration · diet · timing', 'Allergies', 'Pin address', 'Razorpay', 'Active plan'],
    },
    stack: [
      { group: 'App', items: ['Flutter', 'Dart', 'GetX', 'Material 3'] },
      { group: 'Backend', items: ['Firebase Auth', 'Cloud Firestore', 'Google Sign-In'] },
      { group: 'Integrations', items: ['Razorpay', 'flutter_map / OSM', 'Geolocator', 'Geocoding'] },
      { group: 'Resilience', items: ['connectivity_plus', 'cached_network_image'] },
    ],
    shots: [
      phone('/projects/greensortie/ss-1.jpeg', 'Home — hero carousel and primary CTA'),
      phone('/projects/greensortie/ss-3.jpg', 'Plan card with meal breakdown'),
      phone('/projects/greensortie/ss-4.jpg', 'Plan detail — what’s included'),
      phone('/projects/greensortie/ss-5.jpg', 'Checkout step 1 — configure the plan'),
      phone('/projects/greensortie/ss-2.jpg', 'Menu categories'),
      phone('/projects/greensortie/ss-6.jpg', 'Brand promise and ingredients'),
    ],
  },
  {
    id: 'billing',
    index: '04',
    name: 'MBFS Billing',
    tagline: 'A Windows point-of-sale that shares one catalogue with the mobile store',
    category: 'Desktop · Retail systems',
    period: 'Jul – Aug 2026',
    platform: 'Windows',
    accent: '#7dd3fc',
    accent2: '#1d4ed8',
    summary:
      'A counter billing system for a baby-products retailer. It reads and writes the same Firestore catalogue as the store’s mobile app, so what is sold at the counter is what the storefront shows. Scan a barcode, apply per-item or whole-bill discounts, and print A4 tax invoices or 80/58 mm thermal receipts. It also covers stock, reports and CSV export.',
    role:
      'Architected and built the desktop app — data model, billing math, barcode system, PDF and print pipeline, reports and security rules.',
    highlights: [
      {
        title: 'Money math that cannot drift',
        body:
          'Discount, taxable value, GST, round-off and total are getters on the Bill model, each rounded to paise as it is derived. The screen, the Firestore record and the printed invoice read the same numbers because they read the same code — 21 tests hold it.',
      },
      {
        title: 'Numbering that survives two tills',
        body:
          'Invoice numbers and in-store barcode sequences are minted inside Firestore transactions. A gap is auditable; a duplicate is impossible, even with two counters billing at once.',
      },
      {
        title: 'Barcodes, scanned and minted',
        body:
          'USB scanners come in as HID keyboards through a focus-aware capture layer. Products without a code are issued a valid EAN-13 in the GS1 20–29 in-store range, which cannot collide with a manufacturer’s code.',
      },
      {
        title: 'A shared catalogue it never clobbers',
        body:
          'The counter writes only the fields the counter owns, with merge semantics, so storefront-only fields the mobile app maintains — ratings, tags, imagery — survive every edit made at the till.',
      },
    ],
    pipeline: {
      title: 'Checkout path',
      steps: ['HID scan', 'Barcode index', 'Bill model math', 'Txn invoice #', 'PDF render', 'Thermal / A4'],
    },
    stack: [
      { group: 'App', items: ['Flutter (Windows)', 'Dart', 'Provider'] },
      { group: 'Data', items: ['Cloud Firestore', 'Firebase Auth', 'Security rules', 'Transactions'] },
      { group: 'Output', items: ['pdf', 'printing', 'EAN-13 / Code 128', 'CSV export'] },
      { group: 'Quality', items: ['flutter_test', 'flutter analyze clean', 'Responsive desktop layout'] },
    ],
    shots: [
      desk('/projects/billing/ss-1.png', 'Billing — ready to scan, with split payments and hold'),
      desk('/projects/billing/ss-2.png', 'Dashboard — takings, stock value, barcode gaps and alerts'),
      desk('/projects/billing/ss-4.png', 'Products — 428-item shared catalogue with EAN-13 codes'),
      desk('/projects/billing/ss-3.png', 'Reports — revenue, discounts, GST and CSV export'),
      desk('/projects/billing/ss-6.png', 'New product — generate an in-store EAN-13'),
      desk('/projects/billing/ss-5.png', 'Admin-gated sign in'),
    ],
  },
];

export const getProject = (id: string | null) => projects.find((p) => p.id === id) ?? null;
