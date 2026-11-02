import { Draggable } from 'gsap/Draggable';

// Intentionally leaks: the static auditor's canary for the draggable-cleanup rule.
export function leak(element: HTMLElement) {
  Draggable.create(element, { type: 'x,y' });
}
