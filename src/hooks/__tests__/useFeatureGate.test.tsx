import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFeatureGate } from '../useFeatureGate';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockToast = vi.fn();
const mockNavigate = vi.fn();
let mockIsPremium = false;
let mockIsTrialActive = false;

vi.mock('../useSubscription', () => ({
  useSubscription: () => ({
    isPremium: mockIsPremium,
    isTrialActive: mockIsTrialActive,
  }),
}));

vi.mock('../use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/ui/toast', () => ({
  ToastAction: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/lib/constants', () => ({
  ROUTES: { personal: '/personal' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderGate() {
  return renderHook(() => useFeatureGate());
}

beforeEach(() => {
  mockIsPremium = false;
  mockIsTrialActive = false;
  mockToast.mockClear();
  mockNavigate.mockClear();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useFeatureGate', () => {
  describe('canUse', () => {
    it('is false when neither premium nor trialing', () => {
      const { result } = renderGate();
      expect(result.current.canUse).toBe(false);
    });

    it('is true when isPremium', () => {
      mockIsPremium = true;
      const { result } = renderGate();
      expect(result.current.canUse).toBe(true);
    });

    it('is true when isTrialActive', () => {
      mockIsTrialActive = true;
      const { result } = renderGate();
      expect(result.current.canUse).toBe(true);
    });
  });

  describe('gate()', () => {
    it('runs the action when canUse is true (premium)', () => {
      mockIsPremium = true;
      const action = vi.fn();
      const { result } = renderGate();
      act(() => result.current.gate(action));
      expect(action).toHaveBeenCalledOnce();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('runs the action when canUse is true (trial)', () => {
      mockIsTrialActive = true;
      const action = vi.fn();
      const { result } = renderGate();
      act(() => result.current.gate(action));
      expect(action).toHaveBeenCalledOnce();
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('blocks the action and shows toast when canUse is false', () => {
      const action = vi.fn();
      const { result } = renderGate();
      act(() => result.current.gate(action));
      expect(action).not.toHaveBeenCalled();
      expect(mockToast).toHaveBeenCalledOnce();
      expect(mockToast.mock.calls[0][0]).toMatchObject({
        title: 'Premium feature',
        description: 'Subscribe to unlock this feature.',
      });
    });
  });

  describe('gateAsync()', () => {
    it('runs and returns async action when canUse is true', async () => {
      mockIsPremium = true;
      const action = vi.fn().mockResolvedValue('ok');
      const { result } = renderGate();
      let value: string | null = null;
      await act(async () => {
        value = await result.current.gateAsync(action);
      });
      expect(action).toHaveBeenCalledOnce();
      expect(value).toBe('ok');
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('returns null and shows toast when canUse is false', async () => {
      const action = vi.fn().mockResolvedValue('ok');
      const { result } = renderGate();
      let value: string | null = 'initial';
      await act(async () => {
        value = await result.current.gateAsync(action);
      });
      expect(action).not.toHaveBeenCalled();
      expect(value).toBeNull();
      expect(mockToast).toHaveBeenCalledOnce();
    });
  });
});
