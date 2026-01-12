// Notification sound utility using Web Audio API
// Generates a pleasant notification tone programmatically

let audioContext: AudioContext | null = null;
let audioUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (error) {
      console.warn('Could not create AudioContext:', error);
      return null;
    }
  }
  return audioContext;
}

// Unlock audio on first user interaction - must happen DURING the gesture
async function unlockAudio() {
  if (audioUnlocked) return;
  
  const ctx = getAudioContext();
  if (!ctx) return;
  
  try {
    // Resume if suspended - this must happen during user gesture
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    
    // Play a silent buffer to fully unlock on iOS Safari
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    
    audioUnlocked = true;
    console.log('Audio unlocked successfully, state:', ctx.state);
  } catch (error) {
    console.warn('Could not unlock audio:', error);
  }
}

// Initialize audio context on first user interaction
if (typeof window !== 'undefined') {
  const initAudio = () => {
    unlockAudio(); // Resume immediately during gesture
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
    window.removeEventListener('keydown', initAudio);
  };
  window.addEventListener('click', initAudio);
  window.addEventListener('touchstart', initAudio);
  window.addEventListener('keydown', initAudio);
}

export async function playNotificationSound(variant?: 'default' | 'destructive') {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Check if context is running
  if (ctx.state !== 'running') {
    console.warn('AudioContext not running, state:', ctx.state);
    return;
  }

  try {
    const now = ctx.currentTime;
    const volume = variant === 'destructive' ? 0.15 : 0.2;

    // Create a pleasant two-tone notification sound
    const frequencies = variant === 'destructive' 
      ? [400, 300] // Lower, more serious tones for errors
      : [523, 659]; // C5 and E5 - pleasant major third interval

    frequencies.forEach((freq, index) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, now);

      // Quick attack, gentle decay envelope
      const startTime = now + index * 0.1;
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.3);
    });
  } catch (error) {
    // Silently fail - sound is not critical
    console.warn('Could not play notification sound:', error);
  }
}
