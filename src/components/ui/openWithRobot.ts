import { robotScreen, useRobot } from '@/store/robot';

/**
 * Asks the robot to fly over and press `el`, which then opens the project.
 * Falls back to opening immediately if the robot can't: reduced motion, no
 * WebGL, or it gets stuck.
 */
export function openWithRobot(projectId: string, el: HTMLElement) {
  const s = useRobot.getState();
  if (s.task || s.openId) return;

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !robotScreen.visible) {
    s.openProject(projectId, el);
    return;
  }

  s.startTask(projectId, el);
  const id = useRobot.getState().task?.id;
  window.setTimeout(() => {
    const now = useRobot.getState();
    if (now.task && now.task.id === id) now.finishTask();
  }, 4500);
}
