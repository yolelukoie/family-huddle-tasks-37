import { useTaskNotifications } from '@/hooks/useTaskNotifications';

export function NotificationsBootstrap() {
  useTaskNotifications();
  return null;
}