import { create } from 'zustand';

/**
 * Per-frame values live in plain mutable objects. They are written by DOM
 * listeners and read inside useFrame, so they never cause a React render.
 */
export const pointer = {
  /** Viewport pixels */
  px: -9999,
  py: -9999,
  active: false,
  /** Pointer held down on empty space; the robot flies to it. */
  summoning: false,
  lastMove: 0,
};

/** Live stats from the 3D AI core in the background, read by the HUD. */
export const coreStats = { vertices: 0, edges: 0, particles: 0, packets: 0, fps: 60 };

/** Robot's projected screen footprint, written by the robot every frame. */
export const robotScreen = { x: -9999, y: -9999, r: 0, visible: false };

export type TaskPhase = 'approach' | 'reach' | 'press' | 'admire' | 'done';

export type RobotTask = {
  id: number;
  projectId: string;
  /** Returns the element to press; its rect is re-read every frame so scrolling can't break the aim. */
  getEl: () => HTMLElement | null;
  phase: TaskPhase;
};

type Gesture = 'none' | 'wave' | 'spin' | 'nod';

type RobotStore = {
  ready: boolean;
  task: RobotTask | null;
  pressedId: string | null;
  openId: string | null;
  originRect: { x: number; y: number } | null;
  gesture: { kind: Gesture; at: number };
  speech: { text: string; at: number } | null;
  setReady: () => void;
  startTask: (projectId: string, el: HTMLElement) => void;
  setPhase: (phase: TaskPhase) => void;
  press: () => void;
  finishTask: () => void;
  openProject: (projectId: string, el?: HTMLElement | null) => void;
  closeProject: () => void;
  gestureNow: (kind: Gesture) => void;
  say: (text: string) => void;
};

let taskSeq = 0;

const centerOf = (el?: HTMLElement | null) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export const useRobot = create<RobotStore>((set, get) => ({
  ready: false,
  task: null,
  pressedId: null,
  openId: null,
  originRect: null,
  gesture: { kind: 'none', at: 0 },
  speech: null,

  setReady: () => set({ ready: true }),

  startTask: (projectId, el) => {
    if (get().task) return;
    set({
      task: { id: ++taskSeq, projectId, getEl: () => el, phase: 'approach' },
      pressedId: null,
    });
  },

  setPhase: (phase) => {
    const t = get().task;
    if (t) set({ task: { ...t, phase } });
  },

  press: () => {
    const t = get().task;
    if (t) set({ pressedId: t.projectId });
  },

  finishTask: () => {
    const t = get().task;
    if (!t) return;
    set({ task: null });
    get().openProject(t.projectId, t.getEl());
  },

  openProject: (projectId, el) =>
    set({ openId: projectId, pressedId: projectId, originRect: centerOf(el) }),

  closeProject: () => set({ openId: null, pressedId: null }),

  gestureNow: (kind) => set({ gesture: { kind, at: performance.now() } }),

  say: (text) => set({ speech: { text, at: performance.now() } }),
}));
