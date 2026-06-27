import { vi } from 'vitest';
import type { User, Family, UserFamily, Task, Goal } from '@/lib/types';

// ---------------------------------------------------------------------------
// Entity factories
// ---------------------------------------------------------------------------

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-1',
    displayName: 'Test User',
    gender: 'other',
    profileComplete: true,
    activeFamilyId: 'family-1',
    avatar_url: undefined,
    trialStartedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockFamily(overrides?: Partial<Family>): Family {
  return {
    id: 'family-1',
    name: 'Test Family',
    inviteCode: 'TESTCODE',
    createdBy: 'user-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createMockUserFamily(overrides?: Partial<UserFamily>): UserFamily {
  return {
    userId: 'user-1',
    familyId: 'family-1',
    joinedAt: new Date().toISOString(),
    totalStars: 0,
    currentStage: 1,
    lastReadTimestamp: Date.now(),
    lastReadAt: undefined,
    seenCelebrations: [],
    blockedAt: undefined,
    blockedUntil: undefined,
    blockedIndefinite: undefined,
    blockedReason: undefined,
    blockedBy: undefined,
    ...overrides,
  };
}

export function createMockTask(overrides?: Partial<Task>): Task {
  return {
    id: 'task-1',
    familyId: 'family-1',
    name: 'Test Task',
    assignedTo: 'user-1',
    assignedBy: 'user-1',
    dueDate: new Date().toISOString(),
    starValue: 1,
    completed: false,
    categoryId: 'cat-1',
    status: 'active',
    ...overrides,
  };
}

export function createMockGoal(overrides?: Partial<Goal>): Goal {
  return {
    id: 'goal-1',
    familyId: 'family-1',
    userId: 'user-1',
    targetStars: 10,
    targetCategories: [],
    reward: 'Ice cream',
    currentStars: 0,
    completed: false,
    completedAt: undefined,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Hook value factories
// ---------------------------------------------------------------------------

export function createMockAuthValue(overrides?: Record<string, unknown>) {
  return {
    user: createMockUser(),
    sessionId: 'session-1',
    isAuthenticated: true,
    isLoading: false,
    signUp: vi.fn().mockResolvedValue({ error: null }),
    signIn: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue(undefined),
    resetPassword: vi.fn().mockResolvedValue({ error: null }),
    createUser: vi.fn().mockResolvedValue(createMockUser()),
    updateUser: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn(),
    clearAuth: vi.fn(),
    ...overrides,
  };
}

export function createMockAppValue(overrides?: Record<string, unknown>) {
  return {
    activeFamilyId: 'family-1',
    userFamilies: [createMockUserFamily()],
    families: [createMockFamily()],
    isLoading: false,
    createFamily: vi.fn().mockResolvedValue('family-new'),
    joinFamily: vi.fn().mockResolvedValue(createMockFamily()),
    setActiveFamilyId: vi.fn().mockResolvedValue(undefined),
    updateFamilyName: vi.fn().mockResolvedValue(undefined),
    quitFamily: vi.fn().mockResolvedValue(true),
    removeFamilyMember: vi.fn().mockResolvedValue(true),
    blockFamilyMember: vi.fn().mockResolvedValue(true),
    unblockFamilyMember: vi.fn().mockResolvedValue(true),
    getUserFamily: vi.fn().mockReturnValue(createMockUserFamily()),
    getFamilyMembers: vi.fn().mockReturnValue([createMockUserFamily()]),
    getUserProfile: vi.fn().mockReturnValue(createMockUser()),
    getTotalStars: vi.fn().mockReturnValue(0),
    addStars: vi.fn(),
    applyStarsDelta: vi.fn().mockResolvedValue(true),
    resetCharacterProgress: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockSubscriptionValue(overrides?: Record<string, unknown>) {
  return {
    status: {
      isActive: false,
      isTrialing: false,
      isLifetime: false,
      plan: 'free' as const,
    },
    isPremium: false,
    isLoading: false,
    isTrialActive: true,
    trialExpiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    isTrialExpired: false,
    shouldShowPaywall: false,
    purchase: vi.fn().mockResolvedValue({ success: true }),
    purchaseWithPromo: vi.fn().mockResolvedValue({ success: true }),
    redeemLifetimeCode: vi.fn().mockResolvedValue({ success: true }),
    restore: vi.fn().mockResolvedValue(undefined),
    refreshStatus: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function createMockFeatureGateValue(overrides?: Record<string, unknown>) {
  return {
    canUse: true,
    gate: vi.fn().mockImplementation((action: () => void) => action()),
    gateAsync: vi.fn().mockImplementation(async <T,>(action: () => Promise<T>) => action()),
    ...overrides,
  };
}

export function createMockToastValue(overrides?: Record<string, unknown>) {
  return {
    toast: vi.fn(),
    dismiss: vi.fn(),
    toasts: [] as unknown[],
    ...overrides,
  };
}

export function createMockCelebrationsValue(overrides?: Record<string, unknown>) {
  return {
    currentCelebration: null,
    addCelebration: vi.fn(),
    completeCelebration: vi.fn(),
    ...overrides,
  };
}
