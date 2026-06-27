import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';

/**
 * Pick a single image from the device's photo library.
 *
 * - On native (iOS/Android via Capacitor): opens the system Photos picker.
 *   Gallery selection only — no camera, no action sheet.
 *   On iOS, the plugin auto-converts HEIC to JPEG.
 * - On web: returns `null` so the caller can fall back to an HTML file input.
 *
 * Returns `null` if the user cancels / on web.
 */
export async function pickImageFromLibrary(): Promise<File | null> {
  if (!Capacitor.isNativePlatform()) return null;

  try {
    const result = await FilePicker.pickImages({
      limit: 1,
      readData: true,
    });

    if (!result.files.length) return null;

    const picked = result.files[0];
    if (!picked.data) return null;

    // Decode base64 → Uint8Array → Blob → File
    const byteString = atob(picked.data);
    const byteArray = new Uint8Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteArray[i] = byteString.charCodeAt(i);
    }

    const mimeType = picked.mimeType || 'image/jpeg';
    const ext = mimeType === 'image/png' ? 'png'
      : mimeType === 'image/webp' ? 'webp'
      : 'jpeg';
    const blob = new Blob([byteArray], { type: mimeType });
    return new File([blob], `image-${Date.now()}.${ext}`, { type: mimeType });
  } catch (e: unknown) {
    const msg = ((e as Error)?.message ?? '').toLowerCase();
    if (msg.includes('cancel') || msg.includes('dismissed') || msg.includes('user denied') || msg.includes('abort')) {
      return null;
    }
    throw e;
  }
}
