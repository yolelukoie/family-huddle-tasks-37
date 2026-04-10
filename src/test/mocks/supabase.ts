import { vi } from 'vitest';

type SupabaseResponse<T = any> = { data: T; error: null } | { data: null; error: { message: string; code?: string } };

export function createMockQueryBuilder(response?: SupabaseResponse) {
  const defaultResponse: SupabaseResponse = response ?? { data: [], error: null };
  const builder: Record<string, any> = {};

  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte',
    'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'filter', 'not', 'or', 'and',
    'order', 'limit', 'range', 'textSearch',
    'match', 'overlaps', 'single', 'maybeSingle',
  ] as const;

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  builder.then = (resolve: (v: any) => any, reject?: (e: any) => any) =>
    Promise.resolve(defaultResponse).then(resolve, reject);

  return builder;
}

export function createMockSupabaseClient() {
  const defaultBuilder = createMockQueryBuilder();

  return {
    from: vi.fn().mockReturnValue(defaultBuilder),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithIdToken: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }),
    removeChannel: vi.fn(),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'mock-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/mock.png' } }),
        download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    },
  };
}

export type MockSupabaseClient = ReturnType<typeof createMockSupabaseClient>;

export function mockSupabaseFrom(
  client: MockSupabaseClient,
  table: string,
  response: SupabaseResponse,
) {
  const builder = createMockQueryBuilder(response);
  const originalFrom = client.from;
  client.from = vi.fn().mockImplementation((t: string) => {
    if (t === table) return builder;
    return originalFrom(t);
  });
  return builder;
}

export function mockSupabaseRpc(
  client: MockSupabaseClient,
  fnName: string,
  response: SupabaseResponse,
) {
  const originalRpc = client.rpc;
  client.rpc = vi.fn().mockImplementation((name: string, ...args: any[]) => {
    if (name === fnName) return Promise.resolve(response);
    return originalRpc(name, ...args);
  });
}
