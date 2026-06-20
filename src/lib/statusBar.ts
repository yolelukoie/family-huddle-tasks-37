// All status-bar APIs are no-ops on Capacitor 8 + Android 15+.
// System bars are forced transparent by the OS; visual styling is done via
// CSS background + env(safe-area-inset-*) / var(--safe-area-inset-*).

export async function configureStatusBar(): Promise<void> {}
export async function showStatusBar(): Promise<void> {}
export async function hideStatusBar(): Promise<void> {}
export async function setStatusBarStyle(_isDark: boolean): Promise<void> {}
