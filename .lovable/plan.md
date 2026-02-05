
# Legal Pages Accuracy Update

## Overview

After analyzing the codebase against the legal pages, I found several discrepancies between what data the app actually collects and what the legal documents state. The legal pages need updates to accurately reflect the app's current data practices.

---

## Findings

### Data the App Actually Collects (from database/code)

| Category | Data |
|----------|------|
| Account | Email address, password (hashed in Supabase Auth) |
| Profile | Display name, gender, avatar URL, preferred language |
| Family | Family names, membership relationships, invite codes |
| Activity | Tasks, goals, templates, completion status, star values |
| Chat | Messages with content, sender, and timestamps |
| Progress | Stars earned, character stage, badges unlocked, celebrations |
| Notifications | FCM push tokens, platform type (web/android) |
| Custom Content | Uploaded character images, avatars |
| Moderation | Block status, block reasons, content reports |

### Data NOT Collected (but mentioned in legal pages)

| Mentioned | Status |
|-----------|--------|
| Date of birth / Age | **NOT COLLECTED** - removed from app |
| IP address, device type, OS version | **NOT COLLECTED** |
| Usage analytics | **NOT ACTIVE** - Firebase measurementId exists but analytics not initialized |
| Payment/billing data | **NOT YET** - subscription is TODO placeholder |

---

## Changes Required

### 1. Privacy Policy Page (`src/pages/legal/PrivacyPolicyPage.tsx`)

**Section 1 - Information We Collect:**
- Remove any reference to age/date of birth
- Add: language preferences
- Add: custom uploaded images (avatars, character images)

**Section 4 - Data Storage:**
- Already accurate (Supabase + RLS)

**Section 7 - Your Rights:**
- Fix delete account link (should link to Personal Settings page or just say "through the app's settings")

**Section 9 - Contact:**
- Add email: support@familyhuddletasks.com (to match other pages)

### 2. Terms of Service Page (`src/pages/legal/TermsOfServicePage.tsx`)

**Section 7.1 - Data We Collect:**
- Remove: "IP address, device type, operating system, app version"
- Remove or clarify: "basic usage analytics" (currently not active)
- Keep payment data mention but note it applies when subscription is active
- Add: FCM push notification tokens for notifications

---

## Technical Implementation

### File 1: Privacy Policy Updates

```tsx
// Section 1 - Update the data list:
<ul className="list-disc pl-6 text-muted-foreground space-y-1">
  <li>Account information (email address, display name)</li>
  <li>Profile information (avatar, gender preference for character display, language preference)</li>
  <li>Family and task data you create within the app</li>
  <li>Chat messages shared within your family groups</li>
  <li>Custom images you upload (profile pictures, character images)</li>
  <li>Push notification tokens (if you enable notifications)</li>
</ul>

// Section 7 - Fix delete link:
<li>Delete your account and associated data through the app's Personal Settings page</li>

// Section 9 - Add email:
<p className="text-muted-foreground">
  If you have questions about this Privacy Policy, please contact us at{' '}
  <a href="mailto:support@familyhuddletasks.com" className="text-primary hover:underline">
    support@familyhuddletasks.com
  </a>
</p>
```

### File 2: Terms of Service Updates

```tsx
// Section 7.1 - Update data list:
<h3>7.1 Data We Collect</h3>
<ul className="list-disc pl-6 text-muted-foreground space-y-1">
  <li><strong>Account data:</strong> email address, name or nickname, password (stored in hashed form), language preferences.</li>
  <li><strong>Profile and family data:</strong> family or group names, member names or nicknames, and relationships you define in the app.</li>
  <li><strong>Usage data:</strong> tasks you create or complete, schedules, progress, achievements, and app settings.</li>
  <li><strong>Notification data:</strong> push notification tokens if you enable notifications, and your device platform (web, Android, iOS).</li>
  <li><strong>Uploaded content:</strong> profile pictures and custom character images you choose to upload.</li>
  <li><strong>Payment data:</strong> if you subscribe to Premium, limited information about your subscription status and billing history as provided by payment processors. We do not store your full payment card number.</li>
</ul>
```

---

## Files to Modify

1. **`src/pages/legal/PrivacyPolicyPage.tsx`**
   - Update Section 1 (collected data list)
   - Update Section 7 (delete account reference)
   - Update Section 9 (add email contact)

2. **`src/pages/legal/TermsOfServicePage.tsx`**
   - Update Section 7.1 (remove false claims about IP/device tracking)
   - Clarify payment data only applies when subscriptions are active

---

## Summary

These updates will ensure the legal pages accurately reflect:
- What data is actually collected (no more, no less)
- How users can delete their data (correct path)
- Consistent contact information across all legal pages
- Removal of claims about data we don't collect (IP, device info, analytics)
