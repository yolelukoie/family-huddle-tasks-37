import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { createMockGoal } from '@/test/mocks/hooks';

// ---------------------------------------------------------------------------
// Mocks
// Note: vi.mock factories are hoisted — no top-level variables may be referenced
// inside them. The channel/builder objects are created inline here.
// ---------------------------------------------------------------------------

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      displayName: 'Test User',
      gender: 'other',
      profileComplete: true,
      activeFamilyId: 'family-1',
    },
  }),
}));

vi.mock('@/hooks/useApp', () => ({
  useApp: () => ({ activeFamilyId: 'family-1' }),
}));

vi.mock('@/hooks/useCelebrations', () => ({
  useCelebrations: () => ({ addCelebration: vi.fn() }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const builder: Record<string, any> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn(),
  };
  for (const key of Object.keys(builder)) {
    builder[key].mockReturnValue(builder);
  }
  // Default: resolve with empty array synchronously via resolved promise
  builder.then = (resolve: (v: any) => any) =>
    Promise.resolve({ data: [], error: null }).then(resolve);

  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };

  return {
    supabase: {
      from: vi.fn().mockReturnValue(builder),
      channel: vi.fn().mockReturnValue(channel),
      removeChannel: vi.fn(),
      __builder: builder,
    },
  };
});

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { useGoals } from '../useGoals';
import { supabase } from '@/integrations/supabase/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getBuilder() {
  return (supabase as any).__builder;
}

function resetBuilder(overrideData?: any[]) {
  const builder = getBuilder();
  builder.select.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.single.mockReturnValue(builder);
  builder.then = (resolve: (v: any) => any) =>
    Promise.resolve({ data: overrideData ?? [], error: null }).then(resolve);
  (supabase.from as any).mockReturnValue(builder);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useGoals', () => {
  const mockGoal = createMockGoal({ id: 'goal-1', targetStars: 10, currentStars: 0, completed: false });

  beforeEach(() => {
    vi.clearAllMocks();
    resetBuilder();
  });

  it('initializes with empty goals array', () => {
    const { result } = renderHook(() => useGoals());
    expect(result.current.goals).toEqual([]);
  });

  it('returns empty goals array when supabase returns no data', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.goals).toEqual([]), { timeout: 3000 });
  });

  it('activeGoal is undefined when no goals exist', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.activeGoal).toBeUndefined(), { timeout: 3000 });
  });

  it('completedGoals is empty when no goals exist', async () => {
    const { result } = renderHook(() => useGoals());
    await waitFor(() => expect(result.current.completedGoals).toEqual([]), { timeout: 3000 });
  });

  it('loads goals from supabase on mount', async () => {
    const rawGoal = {
      id: mockGoal.id,
      family_id: mockGoal.familyId,
      user_id: mockGoal.userId,
      target_stars: mockGoal.targetStars,
      target_categories: mockGoal.targetCategories,
      reward: mockGoal.reward,
      current_stars: mockGoal.currentStars,
      completed: false,
      completed_at: null,
      created_at: mockGoal.createdAt,
    };
    resetBuilder([rawGoal]);

    const { result } = renderHook(() => useGoals());

    await waitFor(() => {
      expect(result.current.goals).toHaveLength(1);
    });

    expect(result.current.goals[0].id).toBe('goal-1');
    expect(result.current.goals[0].targetStars).toBe(10);
  });

  it('activeGoal is set when an incomplete goal exists', async () => {
    const rawGoal = {
      id: 'goal-1',
      family_id: 'family-1',
      user_id: 'user-1',
      target_stars: 10,
      target_categories: [],
      reward: 'Ice cream',
      current_stars: 0,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
    };
    resetBuilder([rawGoal]);

    const { result } = renderHook(() => useGoals());

    await waitFor(() => {
      expect(result.current.activeGoal).toBeDefined();
    });

    expect(result.current.activeGoal?.id).toBe('goal-1');
  });

  it('exposes refreshGoals function', () => {
    const { result } = renderHook(() => useGoals());
    expect(typeof result.current.refreshGoals).toBe('function');
  });

  it('exposes createGoal function', () => {
    const { result } = renderHook(() => useGoals());
    expect(typeof result.current.createGoal).toBe('function');
  });

  it('exposes deleteGoal function', () => {
    const { result } = renderHook(() => useGoals());
    expect(typeof result.current.deleteGoal).toBe('function');
  });
});
