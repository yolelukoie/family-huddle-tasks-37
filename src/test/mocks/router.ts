import { vi } from 'vitest';

export const mockNavigate = vi.fn();
export const mockLocation = {
  pathname: '/',
  search: '',
  hash: '',
  state: null,
  key: 'default',
};

export function createRouterMock() {
  return {
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation,
    useParams: () => ({}),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    Link: ({ children }: any) => children,
    NavLink: ({ children }: any) => children,
    Outlet: () => null,
    Navigate: () => null,
    BrowserRouter: ({ children }: any) => children,
    MemoryRouter: ({ children }: any) => children,
    Routes: ({ children }: any) => children,
    Route: () => null,
  };
}

export function resetRouterMocks() {
  mockNavigate.mockClear();
  mockLocation.pathname = '/';
  mockLocation.search = '';
  mockLocation.hash = '';
  mockLocation.state = null;
}
