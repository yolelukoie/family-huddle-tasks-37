import React, { type ReactElement } from 'react';
import { render, renderHook, type RenderOptions, type RenderHookOptions } from '@testing-library/react';
import { MemoryRouter, type MemoryRouterProps } from 'react-router-dom';

export interface ProviderOptions {
  routerEntries?: MemoryRouterProps['initialEntries'];
}

function createWrapper(opts: ProviderOptions = {}) {
  const { routerEntries = ['/'] } = opts;
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <MemoryRouter initialEntries={routerEntries}>
        {children}
      </MemoryRouter>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & ProviderOptions,
) {
  const { routerEntries, ...renderOptions } = options ?? {};
  return render(ui, { wrapper: createWrapper({ routerEntries }), ...renderOptions });
}

export function renderHookWithProviders<TResult>(
  hook: () => TResult,
  options?: Omit<RenderHookOptions<any>, 'wrapper'> & ProviderOptions,
) {
  const { routerEntries, ...renderOptions } = options ?? {};
  return renderHook(hook, { wrapper: createWrapper({ routerEntries }), ...renderOptions });
}
