import type { UserFamily } from '@/lib/types';
import type { TFunction } from 'i18next';

// Duration options in milliseconds
export const BLOCK_DURATIONS = {
  '1hour': 60 * 60 * 1000,
  '12hours': 12 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
  'indefinite': null, // null means "until unblocked"
} as const;

export type BlockDuration = keyof typeof BLOCK_DURATIONS;

export const BLOCK_REASONS = [
  'harassment',
  'hate',
  'sexual',
  'violence',
  'spam',
  'personalInfo',
  'other',
] as const;

export type BlockReason = typeof BLOCK_REASONS[number];

/**
 * Checks if a user family membership is currently blocked
 */
export function isBlocked(membership: UserFamily | null | undefined): boolean {
  if (!membership) return false;
  
  // Indefinite block
  if (membership.blockedIndefinite) return true;
  
  // Timed block that hasn't expired
  if (membership.blockedUntil) {
    const blockedUntil = new Date(membership.blockedUntil);
    return blockedUntil > new Date();
  }
  
  return false;
}

/**
 * Gets the remaining time for a timed block in milliseconds
 * Returns 0 if not blocked or indefinitely blocked
 */
export function getBlockTimeRemaining(membership: UserFamily | null | undefined): number {
  if (!membership) return 0;
  
  // Indefinite block - no remaining time concept
  if (membership.blockedIndefinite) return Infinity;
  
  // Timed block
  if (membership.blockedUntil) {
    const blockedUntil = new Date(membership.blockedUntil);
    const remaining = blockedUntil.getTime() - Date.now();
    return Math.max(0, remaining);
  }
  
  return 0;
}

/**
 * Formats block time remaining as human-readable string
 */
export function formatBlockTimeRemaining(ms: number): string {
  if (ms === Infinity) return '';
  if (ms <= 0) return '';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    const remainingHours = hours % 24;
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`;
    }
    return `${days}d`;
  }
  
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    if (remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${hours}h`;
  }
  
  if (minutes > 0) {
    return `${minutes}m`;
  }
  
  return `${seconds}s`;
}

/**
 * Gets the localized status text for a blocked member
 */
export function getBlockStatusText(
  membership: UserFamily | null | undefined,
  t: TFunction
): string | null {
  if (!membership || !isBlocked(membership)) return null;
  
  // Indefinite block
  if (membership.blockedIndefinite) {
    return t('block.blocked');
  }
  
  // Timed block
  const remaining = getBlockTimeRemaining(membership);
  if (remaining > 0) {
    const timeStr = formatBlockTimeRemaining(remaining);
    return t('block.blockedFor', { time: timeStr });
  }
  
  return null;
}

/**
 * Formats the family name with blocked status appended if applicable
 */
export function formatFamilyDisplayName(
  familyName: string,
  membership: UserFamily | null | undefined,
  t: TFunction
): string {
  const blockStatus = getBlockStatusText(membership, t);
  
  if (blockStatus) {
    return `${familyName} — ${blockStatus}`;
  }
  
  return familyName;
}

/**
 * Gets human-readable duration label
 */
export function getDurationLabel(duration: BlockDuration, t: TFunction): string {
  return t(`block.${duration}`);
}

/**
 * Gets human-readable reason label
 */
export function getReasonLabel(reason: BlockReason, t: TFunction): string {
  return t(`block.reasons.${reason}`);
}

/**
 * Calculates block_until timestamp from duration
 */
export function calculateBlockUntil(duration: BlockDuration): string | null {
  const ms = BLOCK_DURATIONS[duration];
  if (ms === null) return null; // indefinite
  return new Date(Date.now() + ms).toISOString();
}
