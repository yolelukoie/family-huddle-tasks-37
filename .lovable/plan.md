

# Fix: Deep Link Opens Sign-In Instead of Reset Password Page

## Root Cause

The Android App Links intent filter for `/auth/reset` correctly opens the app when the user taps the reset link. However, **there is no `appUrlOpen` listener in the app code**. Capacitor fires an `appUrlOpen` event when a deep link opens the app, but nobody is listening for it.

Without that listener, the app simply opens at its default route (`/`). Since the user has no active session (they're resetting their password), `AppLayout` sees `!isAuthenticated` and redirects to `/auth` (the sign-in page).

Additionally, `useAuth.tsx` has hash-based recovery token handling (lines 212-256) and a `PASSWORD_RECOVERY` event handler (lines 139-148), but neither fires because:
- The deep link URL (`https://familyhuddletasks.com/auth/reset?code=XXX`) is the **external** URL, not the app's internal webview URL
- Capacitor doesn't set `window.location` to the deep link URL — it delivers it via the `appUrlOpen` event instead

## Fix (2 files)

### 1. `src/App.tsx` — Add Capacitor deep link listener

Add a component inside `BrowserRouter` that listens for `appUrlOpen` events and navigates accordingly:

```
function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isPlatform('capacitor')) return;

    let cleanup: (() => void) | null = null;

    import('@capacitor/app').then(({ App }) => {
      const listener = App.addListener('appUrlOpen', (event) => {
        console.log('[DeepLink] appUrlOpen:', event.url);
        try {
          const url = new URL(event.url);
          const path = url.pathname;
          const search = url.search;
          const hash = url.hash;

          if (path.startsWith('/auth/reset')) {
            // Navigate to reset page with all params preserved
            navigate(`/auth/reset${search}${hash}`, { replace: true });
          } else if (path.startsWith('/auth/callback')) {
            navigate(`/auth/callback${search}${hash}`, { replace: true });
          }
          // Other deep links can be added here
        } catch (err) {
          console.error('[DeepLink] Failed to parse URL:', err);
        }
      });
      listener.then(handle => { cleanup = () => handle.remove(); });
    }).catch(() => {});

    return () => { cleanup?.(); };
  }, [navigate]);

  return null;
}
```

Mount `<DeepLinkHandler />` inside `<BrowserRouter>` alongside the existing `<RealtimeRoot />`.

### 2. `src/hooks/useAuth.tsx` — Handle `PASSWORD_RECOVERY` event on native

The existing `PASSWORD_RECOVERY` handler (line 146) uses `window.location.replace("/auth/reset")` which works on web but is redundant on native (the deep link handler already navigated there). However, the handler also `return`s early, preventing session state from updating — which breaks the reset page.

Fix: when `PASSWORD_RECOVERY` fires, still update session/user state so `NativeResetPasswordPage` can call `updateUser({ password })`:

```typescript
if (event === "PASSWORD_RECOVERY") {
  if (!handlingRecovery.current) {
    handlingRecovery.current = true;
    console.log('[useAuth] PASSWORD_RECOVERY event');
    // On web, navigate to reset page; on native, deep link already handled routing
    if (!location.pathname.includes('/auth/reset')) {
      try { window.history.replaceState({}, "", "/auth/reset"); } catch {}
      window.location.replace("/auth/reset");
    }
  }
  // IMPORTANT: Still update session state so the reset form can call updateUser
  if (!isMounted) return;
  setSession(session);
  await loadUserData(session?.user ?? null);
  return;
}
```

### 3. `src/pages/auth/NativeResetPasswordPage.tsx` — Handle code from deep link params

The reset page already handles `code`, `token_hash`, and hash tokens. But on native, the deep link parameters arrive via router navigation (from the deep link handler), so `useSearchParams()` should work correctly. No changes needed here — it already covers all cases.

### Summary

| File | Change |
|------|--------|
| `src/App.tsx` | Add `DeepLinkHandler` component that listens for `appUrlOpen` and navigates to `/auth/reset` |
| `src/hooks/useAuth.tsx` | Fix `PASSWORD_RECOVERY` handler to update session state even when already on `/auth/reset` |

This ensures: deep link → `appUrlOpen` event → navigate to `/auth/reset` with params → `NativeResetPasswordPage` exchanges code → shows password form → user resets password → done.

