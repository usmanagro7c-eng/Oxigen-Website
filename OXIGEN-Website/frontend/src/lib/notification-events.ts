export const NOTIFICATION_EVENT = "oxigen:new-notification";

export type NotificationToastPayload = {
  id: string;
  title: string;
  body: string;
  category?: string;
};

export function emitNotificationToast(payload: NotificationToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(NOTIFICATION_EVENT, {
      detail: payload,
    }),
  );
}

let audioContext: AudioContext | null = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;

  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return;

  try {
    const ctx = audioContext ?? new AudioCtor();
    const gainNode = ctx.createGain();
    const oscillator = ctx.createOscillator();

    gainNode.gain.value = 0.08;
    oscillator.type = "sine";
    oscillator.frequency.value = 1000;

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    oscillator.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    oscillator.stop(ctx.currentTime + 0.25);

    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    audioContext = ctx;
  } catch {
    // Ignore browser audio restrictions; toast still works.
  }
}
