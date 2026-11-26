import {
  createElectricBorderEngine,
  type ElectricBorderEngine,
  type ElectricBorderEngineSettings,
} from '../engines/electricBorderEngine';

export type ElectricBorderWorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; settings: ElectricBorderEngineSettings }
  | { type: 'settings'; settings: ElectricBorderEngineSettings }
  | { type: 'resize'; width: number; height: number; pixelWidth: number; pixelHeight: number }
  | { type: 'pointermove'; x: number; y: number; over: boolean; near: boolean }
  | { type: 'pointerdown'; x: number; y: number; over: boolean }
  | { type: 'pointerleave' }
  | { type: 'visibility'; visible: boolean; pageHidden: boolean }
  | { type: 'destroy' };

let engine: ElectricBorderEngine | null = null;

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<ElectricBorderWorkerMessage>) => void) | null;
  close: () => void;
};

scope.onmessage = (event: MessageEvent<ElectricBorderWorkerMessage>) => {
  const msg = event.data;
  switch (msg.type) {
    case 'init':
      engine?.destroy();
      engine = createElectricBorderEngine(msg.canvas, msg.settings);
      break;
    case 'settings':
      engine?.updateSettings(msg.settings);
      break;
    case 'resize':
      engine?.resize(msg.width, msg.height, msg.pixelWidth, msg.pixelHeight);
      break;
    case 'pointermove':
      engine?.pointerMove(msg.x, msg.y, msg.over, msg.near);
      break;
    case 'pointerdown':
      engine?.pointerDown(msg.x, msg.y, msg.over);
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
