# Testing Guide

## Stack

- **Vitest** — test runner
- **@testing-library/react** — render helpers
- **jsdom** — browser environment simulation
- **@testing-library/jest-dom** — DOM matchers (`toBeInTheDocument`, etc.)

## Running Tests

```bash
# Run all tests once
npx vitest run

# Watch mode
npx vitest

# Verbose output
npx vitest run --reporter=verbose

# Run a single file
npx vitest run src/hooks/__tests__/useFeatureGate.test.tsx
```

## File Layout

```
src/
  test/
    setup.ts                  # Global test setup (DOM polyfills, Capacitor mocks)
    renderWithProviders.tsx   # render() + renderHook() wrapped in MemoryRouter
    TESTING.md                # This file
    mocks/
      supabase.ts             # createMockSupabaseClient(), createMockQueryBuilder()
      hooks.ts                # createMockUser(), createMockAuthValue(), etc.
      router.ts               # mockNavigate, mockLocation, resetRouterMocks()
      i18n.ts                 # createI18nMock() for react-i18next
      capacitor.ts            # simulateNativePlatform() / simulateWebPlatform()
```

## Writing a Hook Test

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMyHook } from '../useMyHook';

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => createMockAuthValue(),
}));

describe('useMyHook', () => {
  it('returns expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.someValue).toBe(true);
  });
});
```

## Writing a Component Test

```tsx
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/renderWithProviders';
import MyComponent from '../MyComponent';

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => createMockAuthValue() }));

it('renders the component', () => {
  renderWithProviders(<MyComponent />);
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

## Mocking Supabase

Never add a global supabase mock in `setup.ts`. Each test file mocks it individually:

```ts
import { createMockSupabaseClient } from '@/test/mocks/supabase';

const mockClient = createMockSupabaseClient();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockClient,
}));
```

Use `mockSupabaseFrom()` to mock per-table responses:

```ts
import { mockSupabaseFrom } from '@/test/mocks/supabase';
mockSupabaseFrom(mockClient, 'goals', { data: [myGoal], error: null });
```

## Mock Factories

All factories accept an optional `overrides` object:

```ts
createMockUser({ displayName: 'Alice', activeFamilyId: 'fam-2' })
createMockAuthValue({ user: null, isAuthenticated: false })
createMockSubscriptionValue({ isPremium: true, isTrialActive: false })
createMockFeatureGateValue({ canUse: false })
```

## Key Rules

1. **Never mock in `setup.ts`** — only Capacitor and browser globals belong there.
2. **Mock at the module boundary** — mock `@/hooks/useAuth`, not internal state.
3. **Use `act()` for state changes** — wrap `fireEvent`, async calls, and hook mutations.
4. **Don't change production source files** — only fix test files when tests fail.
5. **`vi.mock()` calls are hoisted** — put them at the top of each test file.
