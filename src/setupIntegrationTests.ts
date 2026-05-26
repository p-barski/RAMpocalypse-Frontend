import { afterEach } from 'vitest';

const noop = () => {};
if (typeof globalThis.ImageData === 'undefined') {
  globalThis.ImageData = class ImageData {
    readonly width: number;
    readonly height: number;
    readonly data: Uint8ClampedArray;

    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  } as unknown as typeof ImageData;
}

if (!globalThis.createImageBitmap) {
  globalThis.createImageBitmap = async (source: ImageBitmapSource): Promise<ImageBitmap> => {
    if (source instanceof ImageData) {
      return {
        width: source.width,
        height: source.height,
        close: noop,
      } as ImageBitmap;
    }
    return {
      width: 32,
      height: 32,
      close: noop,
    } as ImageBitmap;
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = noop;
}

function createStub2dContext(): CanvasRenderingContext2D {
  return {
    clearRect: noop,
    fillRect: noop,
    fillText: noop,
    stroke: noop,
    fill: noop,
    beginPath: noop,
    arc: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    drawImage: noop,
    setTransform: noop,
    scale: noop,
    measureText: () => ({ width: 100 }) as TextMetrics,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    imageSmoothingEnabled: true,
  } as unknown as CanvasRenderingContext2D;
}

const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: unknown) {
  if (contextId === '2d') {
    return createStub2dContext();
  }
  return originalGetContext.call(this, contextId, options);
} as typeof HTMLCanvasElement.prototype.getContext;

class StubAudioContext {
  destination = {};
  createBufferSource() {
    return {
      buffer: null as AudioBuffer | null,
      loop: false,
      connect: noop,
      start: noop,
      stop: noop,
    };
  }
  createGain() {
    return { gain: { value: 1 }, connect: noop };
  }
  async decodeAudioData(): Promise<AudioBuffer> {
    return {
      duration: 0,
      length: 0,
      sampleRate: 44100,
      numberOfChannels: 1,
      getChannelData: () => new Float32Array(0),
    } as unknown as AudioBuffer;
  }
}

globalThis.AudioContext = StubAudioContext as unknown as typeof AudioContext;

const pendingAnimationFrames = new Map<number, ReturnType<typeof setTimeout>>();
let nextAnimationFrameId = 1;

globalThis.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = nextAnimationFrameId++;
  const timeoutId = setTimeout(() => {
    pendingAnimationFrames.delete(id);
    callback(performance.now());
  }, 0);
  pendingAnimationFrames.set(id, timeoutId);
  return id;
};

globalThis.cancelAnimationFrame = (id: number): void => {
  const timeoutId = pendingAnimationFrames.get(id);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    pendingAnimationFrames.delete(id);
  }
};

export function cancelPendingAnimationFrames(): void {
  pendingAnimationFrames.forEach((timeoutId) => clearTimeout(timeoutId));
  pendingAnimationFrames.clear();
}

afterEach(() => {
  cancelPendingAnimationFrames();
});
