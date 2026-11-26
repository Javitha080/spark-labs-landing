import { createDitherEngine, type DitherEngine, type DitherEngineSettings } from '../engines/ditherEngine';

export type DitherWorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; settings: DitherEngineSettings }
  | { type: 'settings'; settings: DitherEngineSettings }
  | { type: 'resize'; cssWidth: number; cssHeight: number; pixelWidth: number; pixelHeight: number }
  | { type: 'pointermove'; x: number; y: number; inside: boolean }
  | { type: 'pointerdown'; x: number; y: number; inside: boolean }
  | { type: 'pointerleave' }
  | { type: 'visibility'; visible: boolean; pageHidden: boolean }
  | { type: 'destroy' };

let engine: DitherEngine | null = null;

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<DitherWorkerMessage>) => void) | null;
  close: () => void;
};

scope.onmessage = (event: MessageEvent<DitherWorkerMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      engine?.destroy();
      engine = createDitherEngine(msg.canvas, msg.settings);
      break;
    case 'settings':
      engine?.updateSettings(msg.settings);
      break;
    case 'resize':
      engine?.resize(msg.cssWidth, msg.cssHeight, msg.pixelWidth, msg.pixelHeight);
      break;
    case 'pointermove':
      engine?.pointerMove(msg.x, msg.y, msg.inside);
      break;
    case 'pointerdown':
      engine?.pointerDown(msg.x, msg.y, msg.inside);
      break;
    case 'pointerleave':
      engine?.pointerLeave();
      break;
    case 'visibility':
      engine?.setVisibility(msg.visible, msg.pageHidden);
      break;
    case 'destroy':
      engine?.destroy();
      engine = null;
      scope.close();
      break;
  }
};
