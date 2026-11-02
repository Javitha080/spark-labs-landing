import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(SplitText, useGSAP);

export function revealTitle(root: HTMLElement) {
  const split = SplitText.create(root, { type: 'lines' });
  return gsap.from(split.lines, { yPercent: 100, stagger: 0.08 });
}
