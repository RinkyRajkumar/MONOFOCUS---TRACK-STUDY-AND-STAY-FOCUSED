import type { TimerMode } from "@/types";

const getAudioContext = (): AudioContext | null => {
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;

  return AudioContextClass ? new AudioContextClass() : null;
};

export const playCompletionTone = (): void => {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.11, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.1);

  [659.25, 783.99].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    oscillator.connect(gain);
    oscillator.start(context.currentTime + index * 0.16);
    oscillator.stop(context.currentTime + 0.72 + index * 0.16);
  });

  window.setTimeout(() => {
    void context.close();
  }, 1400);
};

export const playSessionStartTone = (
  mode: TimerMode,
  delayMilliseconds = 0,
): void => {
  window.setTimeout(() => {
    const context = getAudioContext();
    if (!context) {
      return;
    }

    const gain = context.createGain();
    const now = context.currentTime;
    const frequencies =
      mode === "focus" ? [440, 554.37] : [493.88, 392];

    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);

    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(now + index * 0.12);
      oscillator.stop(now + 0.42 + index * 0.12);
    });

    window.setTimeout(() => {
      void context.close();
    }, 900);
  }, delayMilliseconds);
};

export const playPauseTone = (): void => {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const gain = context.createGain();
  const oscillator = context.createOscillator();
  const now = context.currentTime;

  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.045, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(349.23, now);
  oscillator.frequency.exponentialRampToValueAtTime(293.66, now + 0.28);
  oscillator.connect(gain);
  oscillator.start(now);
  oscillator.stop(now + 0.36);

  window.setTimeout(() => {
    void context.close();
  }, 600);
};
