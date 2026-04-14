export const ENERGY_THRESHOLD = 0.015;

export interface VadFrame {
  energy: number;
  frameMs: number;
  timestamp: number;
}

export interface VadState {
  speechFrames: number;
  silenceFrames: number;
  isSpeaking: boolean;
  speechStartTime?: number;
  speechEndTime?: number;
}

export const calculateEnergy = (audio: Buffer): number => {
  if (audio.length === 0) {
    return 0;
  }

  let total = 0;
  for (const byte of audio) {
    total += Math.abs(byte - 128);
  }

  return Math.min(1, total / (audio.length * 128));
};

export const isSpeechFrame = (energy: number, threshold = ENERGY_THRESHOLD): boolean => {
  return energy >= threshold;
};

export const createVadState = (): VadState => ({
  speechFrames: 0,
  silenceFrames: 0,
  isSpeaking: false
});

export const updateVadState = (state: VadState, frame: VadFrame): VadState => {
  const speech = isSpeechFrame(frame.energy);

  if (speech) {
    if (!state.isSpeaking) {
      state.isSpeaking = true;
      state.speechStartTime = frame.timestamp;
    }
    state.speechFrames++;
    state.silenceFrames = 0;
  } else {
    state.silenceFrames++;

    if (state.isSpeaking && state.silenceFrames >= 3) {
      state.isSpeaking = false;
      state.speechEndTime = frame.timestamp;
    }
  }

  return state;
};