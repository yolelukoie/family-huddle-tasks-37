import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_wAXUmkodysEH9PwBsZw8YpqCmfWvzpsuwLggM5eyk49L';
const POSTHOG_HOST = 'https://eu.i.posthog.com';
const CONSENT_KEY = 'analytics_consent';

let initialized = false;
let identified = false;
let pendingProperties: Record<string, unknown> = {};

function consentGranted(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistConsent(value: boolean): void {
  try {
    localStorage.setItem(CONSENT_KEY, value ? 'true' : 'false');
  } catch { /* ignore */ }
}

export const analytics = {
  init(): void {
    if (initialized) return;
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: false, // we fire $screen manually on route change
        capture_pageleave: true,
        autocapture: false, // avoid noisy DOM clicks; we capture explicit events
        opt_out_capturing_by_default: !consentGranted(),
        disable_session_recording: true,
        persistence: 'localStorage',
        loaded: () => { initialized = true; },
      });
      initialized = true;
    } catch (e) {
      console.warn('[analytics] init failed', e);
    }
  },

  setConsent(granted: boolean): void {
    persistConsent(granted);
    if (!initialized) return;
    try {
      if (granted) {
        posthog.opt_in_capturing();
      } else {
        posthog.opt_out_capturing();
        // Wipe any locally cached identity / queued properties so that no
        // residual data is associated with the user after they revoke consent.
        try { posthog.reset(); } catch { /* ignore */ }
        identified = false;
        pendingProperties = {};
      }
    } catch { /* ignore */ }
  },

  hasConsent(): boolean {
    return consentGranted();
  },

  identify(userId: string, properties?: Record<string, unknown>): void {
    if (!initialized) return;
    try {
      posthog.identify(userId, properties);
      identified = true;
      const buffered = pendingProperties;
      pendingProperties = {};
      if (Object.keys(buffered).length > 0) {
        try { posthog.setPersonProperties(buffered); } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  },

  reset(): void {
    identified = false;
    pendingProperties = {};
    if (!initialized) return;
    try { posthog.reset(); } catch { /* ignore */ }
  },

  capture(event: string, properties?: Record<string, unknown>): void {
    if (!initialized) return;
    try { posthog.capture(event, properties); } catch { /* ignore */ }
  },

  captureScreen(name: string): void {
    if (!initialized) return;
    try { posthog.capture('$screen', { $screen_name: name }); } catch { /* ignore */ }
  },

  setPersonProperties(properties: Record<string, unknown>): void {
    if (!identified) {
      pendingProperties = { ...pendingProperties, ...properties };
      return;
    }
    if (!initialized) return;
    try { posthog.setPersonProperties(properties); } catch { /* ignore */ }
  },
};
