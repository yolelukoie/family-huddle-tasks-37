import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  // Use crypto.randomUUID() for proper UUID generation
  // Fallback to a manual UUID v4 if crypto.randomUUID is not available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Manual UUID v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// This function is no longer needed as Supabase generates invite codes
// Keep for backward compatibility but recommend using Supabase function
export function generateInviteCode(): string {
  return Math.random().toString(36).substr(2, 8).toUpperCase();
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString();
}

export function isToday(date: string | Date): boolean {
  const today = new Date();
  const compareDate = new Date(date);
  return (
    today.getDate() === compareDate.getDate() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getFullYear() === compareDate.getFullYear()
  );
}

export function isFuture(date: string | Date): boolean {
  const today = new Date();
  const compareDate = new Date(date);
  compareDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return compareDate > today;
}