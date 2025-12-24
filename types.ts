
export interface AnimationFrame {
  canvas: HTMLCanvasElement;
  delay: number;
}

export interface AnimationData {
  frames: AnimationFrame[];
  width: number;
  height: number;
  fileName: string;
  type: 'gif' | 'apng';
}

export interface PlaybackState {
  isPlaying: boolean;
  currentFrameIndex: number;
  speed: number;
}
