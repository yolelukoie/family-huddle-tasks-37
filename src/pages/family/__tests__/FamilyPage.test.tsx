import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import { createMockUser, createMockFamily, createMockUserFamily } from '@/test/mocks/hooks';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockUser = createMockUser({ displayName: 'Test User', activeFamilyId: 'family-1' });
const mockFamily = createMockFamily({ id: 'family-1', name: 'Test Family', inviteCode: 'ABC123' });
const mockUserFamily = createMockUserFamily({ userId: 'user-1', familyId: 'family-1' });

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useApp', () => ({
  useApp: () => ({
    activeFamilyId: 'family-1',
    userFamilies: [mockUserFamily],
    families: [mockFamily],
    isLoading: false,
    createFamily: vi.fn(),
    joinFamily: vi.fn(),
    setActiveFamilyId: vi.fn(),
    updateFamilyName: vi.fn(),
    quitFamily: vi.fn(),
    removeFamilyMember: vi.fn(),
    blockFamilyMember: vi.fn(),
    unblockFamilyMember: vi.fn(),
    getUserFamily: vi.fn().mockReturnValue(mockUserFamily),
    getFamilyMembers: vi.fn().mockReturnValue([mockUserFamily]),
    getUserProfile: vi.fn().mockReturnValue(mockUser),
    getTotalStars: vi.fn().mockReturnValue(0),
    addStars: vi.fn(),
    applyStarsDelta: vi.fn(),
    resetCharacterProgress: vi.fn(),
  }),
}));

vi.mock('@/hooks/useFeatureGate', () => ({
  useFeatureGate: () => ({
    canUse: true,
    gate: vi.fn().mockImplementation((action: () => void) => action()),
    gateAsync: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Must include initReactI18next — it is imported by src/i18n/config.ts which is
// pulled in transitively when FamilyPage imports @/lib/character.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  Trans: ({ children }: any) => children,
  initReactI18next: {
    type: '3rdParty' as const,
    init: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
}));

vi.mock('@/components/layout/NavigationHeader', () => ({
  NavigationHeader: () => null,
}));

vi.mock('@/components/modals/MemberProfileModal', () => ({
  MemberProfileModal: () => null,
}));

vi.mock('@/components/modals/BlockMemberModal', () => ({
  BlockMemberModal: () => null,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import FamilyPage from '../FamilyPage';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('FamilyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing when user is logged in', () => {
    renderWithProviders(<FamilyPage />);
    // The page renders — just checking it does not throw
  });

  it('displays the active family name', () => {
    renderWithProviders(<FamilyPage />);
    expect(screen.getByText('Test Family')).toBeInTheDocument();
  });

  it('shows a share code button for the active family', () => {
    renderWithProviders(<FamilyPage />);
    // The invite code is surfaced via a share button — check the button is rendered
    // (the t() mock returns the i18n key, so the button text is 'family.shareCode')
    expect(screen.getByText('family.shareCode')).toBeInTheDocument();
  });

  it('renders a container element', () => {
    const { container } = renderWithProviders(<FamilyPage />);
    expect(container.firstChild).not.toBeNull();
  });
});
