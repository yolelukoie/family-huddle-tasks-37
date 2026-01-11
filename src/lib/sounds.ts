// Notification sound utility
// Using a simple, pleasant notification tone encoded as base64

const NOTIFICATION_SOUND_URL = "data:audio/mp3;base64,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";

let audioContext: AudioContext | null = null;
let notificationBuffer: AudioBuffer | null = null;

// Preload the notification sound
async function preloadSound() {
  if (audioContext && notificationBuffer) return;
  
  try {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Decode base64 to ArrayBuffer
    const base64Data = NOTIFICATION_SOUND_URL.split(',')[1];
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    notificationBuffer = await audioContext.decodeAudioData(bytes.buffer);
  } catch (error) {
    console.warn('Could not preload notification sound:', error);
  }
}

// Initialize on first user interaction
if (typeof window !== 'undefined') {
  const initAudio = () => {
    preloadSound();
    window.removeEventListener('click', initAudio);
    window.removeEventListener('touchstart', initAudio);
  };
  window.addEventListener('click', initAudio);
  window.addEventListener('touchstart', initAudio);
}

export async function playNotificationSound(variant?: 'default' | 'destructive') {
  try {
    // Try to use preloaded audio context
    if (audioContext && notificationBuffer) {
      // Resume if suspended (required by browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }
      
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      
      source.buffer = notificationBuffer;
      // Slightly lower volume for destructive, normal for default
      gainNode.gain.value = variant === 'destructive' ? 0.3 : 0.4;
      
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start(0);
      return;
    }
    
    // Fallback: use HTML Audio element
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = variant === 'destructive' ? 0.3 : 0.4;
    await audio.play();
  } catch (error) {
    // Silently fail - sound is not critical
    console.warn('Could not play notification sound:', error);
  }
}
