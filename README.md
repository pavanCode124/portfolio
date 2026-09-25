# Pavan Sai — 3D Portfolio

A portfolio where a procedurally built robot, **PX-1**, lives on the page. It tracks
your cursor, flies to you when you hold the mouse down, and when you click a
project it flies over, reaches out with its index finger, presses the folder and
opens it.

Built with **Next.js 16 (App Router) · React 19 · three.js · React Three Fiber · drei · zustand**.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:3000.

---

## Before you deploy — fill these in

Everything personal lives in [`src/data/profile.ts`](src/data/profile.ts):

| Field | Now | Replace with |
|---|---|---|
| `email` | `your.email@example.com` | your email |
| `github` | placeholder URL | your GitHub profile |
| `linkedin` | placeholder URL | your LinkedIn profile |
| `resume` | empty (hidden) | e.g. `/resume.pdf` after putting the file in `public/` |
| `location` | `India` | adjust if needed |

Project copy, metrics and screenshot captions are in
[`src/data/projects.ts`](src/data/projects.ts). Skills and the build log are in
[`src/data/skills.ts`](src/data/skills.ts). Every skill lists the project it was
used in.

Screenshots are served from `public/projects/<id>/`. The original folders
(`dronelab-ss`, `groomtap-ss`, …) are untouched.

## Deploy

The page is fully static. On Vercel: import the repo, no configuration needed.
Anywhere else: `npm run build && npm run start`.

---

## How the robot works

**No model files.** PX-1 is built from primitives at runtime: lathe-turned torso
and pelvis, clearcoat physical materials, an ellipsoid visor with eyes placed
exactly on its surface, and a custom GLSL thruster plume. Reflections come from a
studio environment generated on the GPU with drei `Lightformer`s, so nothing is
downloaded.

**One canvas above the page.** The WebGL canvas is fixed over the whole viewport
with `pointer-events: none`. The robot draws over the DOM, and the DOM keeps every
click. Pointer data reaches the robot through a mutable object
([`src/store/robot.ts`](src/store/robot.ts)), so moving the mouse never triggers a
React render.

**Bays.** Each section marks an element with `data-robot-bay`. Every frame the
robot finds the section in view, projects that element's rectangle into world
space and flies there, scaled to fit. Sticky bays keep it beside the content
while you scroll.

**Arms: hinge-constrained two-bone IK.** ([`ik.ts`](src/components/three/ik.ts)) The
shoulder → elbow → wrist chain is solved with the law of cosines and a pole
vector. The upper arm and forearm share one hinge axis, so the elbow turns
about its bolted axle like a real servo joint. A hydraulic piston is re-posed
between its two mounts every frame, and its chrome rod slides in and out as
the elbow bends. The hand's orientation is split into a **wrist-roll** twist
(a bolted motor disc that visibly turns) and a wrist-pitch swing. Fingers are
three pinned phalanges each. The IK pose is slerped against an idle pose, so
reaching fades in and out smoothly.

**Neural core.** The head has a glass dome with a 30-neuron graph inside.
Spikes travel along the synapses and re-fire their neighbours, and activity
rises while the agent is working. The page background is a layered
feed-forward network: signals propagate layer by layer, neurons near the
cursor fire, and pressing a folder sends a burst through the net. The edge
rails show live telemetry (FPS, signals in flight, cursor, scroll depth).

**Opening a project** is a small state machine: `approach → reach → press →
admire`. The target is re-read from the folder's live bounding rect every frame,
so scrolling mid-flight can't break the aim. At the bottom of the press the folder
lid swings open, and the project window then scales out from the folder.
Reduced-motion users and browsers without WebGL skip straight to the window.

## Structure

```
src/
  app/                layout, page, globals.css (design system)
  data/               profile, projects, skills — all content
  store/robot.ts      zustand store + per-frame pointer state
  components/
    three/            Robot, IK solver, materials, canvas
    ui/               sections, folders, project window
    Experience.tsx    pointer bridge, speech bubble, WebGL mount
    NeuralBackground  2D-canvas neural graph behind the page
    Cursor, BootLoader
```
