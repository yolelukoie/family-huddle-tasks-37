import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

// matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver
class ResizeObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = ResizeObserverStub as any;

// IntersectionObserver
class IntersectionObserverStub {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds: number[] = [];
  takeRecords = vi.fn().mockReturnValue([]);
}
window.IntersectionObserver = IntersectionObserverStub as any;

// navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});

window.scrollTo = vi.fn() as any;
Element.prototype.scrollIntoView = vi.fn();

URL.createObjectURL = vi.fn().mockReturnValue('blob:mock');
URL.revokeObjectURL = vi.fn();

// Capacitor core
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
    getPlatform: vi.fn().mockReturnValue('web'),
    isPluginAvailable: vi.fn().mockReturnValue(false),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    getLaunchUrl: vi.fn().mockResolvedValue(null),
    exitApp: vi.fn(),
    getState: vi.fn().mockResolvedValue({ isActive: true }),
    minimizeApp: vi.fn(),
  },
}));

vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    register: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    checkPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ receive: 'granted' }),
    removeAllListeners: vi.fn().mockResolvedValue(undefined),
    getDeliveredNotifications: vi.fn().mockResolvedValue({ notifications: [] }),
    removeAllDeliveredNotifications: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/status-bar', () => ({
  StatusBar: {
    setStyle: vi.fn().mockResolvedValue(undefined),
    setBackgroundColor: vi.fn().mockResolvedValue(undefined),
    show: vi.fn().mockResolvedValue(undefined),
    hide: vi.fn().mockResolvedValue(undefined),
  },
  Style: { Dark: 'DARK', Light: 'LIGHT', Default: 'DEFAULT' },
}));

vi.mock('@revenuecat/purchases-capacitor', () => ({
  Purchases: {
    configure: vi.fn().mockResolvedValue(undefined),
    logIn: vi.fn().mockResolvedValue({ customerInfo: {} }),
    logOut: vi.fn().mockResolvedValue({ customerInfo: {} }),
    getCustomerInfo: vi.fn().mockResolvedValue({ customerInfo: {} }),
    getOfferings: vi.fn().mockResolvedValue({ current: null }),
    purchasePackage: vi.fn().mockResolvedValue({ customerInfo: {} }),
    restorePurchases: vi.fn().mockResolvedValue({ customerInfo: {} }),
    addCustomerInfoUpdateListener: vi.fn().mockReturnValue({ remove: vi.fn() }),
  },
}));

vi.mock('capacitor-native-settings', () => ({
  NativeSettings: { open: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@southdevs/capacitor-google-auth', () => ({
  GoogleAuth: {
    signIn: vi.fn().mockResolvedValue({ authentication: { idToken: 'mock-token' } }),
    signOut: vi.fn().mockResolvedValue(undefined),
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));
