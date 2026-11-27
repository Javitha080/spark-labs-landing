import {
  createFaultyTerminalEngine,
  type FaultyTerminalEngine,
  type FaultyTerminalEngineSettings,
} from '../engines/faultyTerminalEngine';

export type FaultyTerminalWorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; settings: FaultyTerminalEngineSettings }
  | { type: 'settings'; settings: FaultyTerminalEngineSettings }
  | { type: 'resize'; cssWidth: number; cssHeight: number; pixelWidth: number; pixelHeight: number }
  | { type: 'pointermove'; x: number; y: number; inside: boolean }
  | { type: 'pointerdown'; x: number; y: number; inside: boolean }
  | { type: 'pointerleave' }
  | { type: 'visibility'; visible: boolean; pageHidden: boolean }
  | { type: 'destroy' };

let engine: FaultyTerminalEngine | null = null;

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<FaultyTerminalWorkerMessage>) => void) | null;
  close: () => void;
};

scope.onmessage = (event: MessageEvent<FaultyTerminalWorkerMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      engine?.destroy();
      engine = createFaultyTerminalEngine(msg.canvas, msg.settings);
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
