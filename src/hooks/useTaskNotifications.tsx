import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TaskNotification {
  id: string;
  taskId: string;
  taskName: string;
  assigneeId: string;
  assigneeName: string;
  action: 'accepted' | 'rejected';
  timestamp: string;
}

export function useTaskNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<TaskNotification[]>([]);

  // Check for new notifications when component mounts or user changes
  useEffect(() => {
    if (!user?.id) return;

    const checkNotifications = () => {
      const stored = localStorage.getItem(`task-notifications-${user.id}`);
      if (stored) {
        try {
          const notifications: TaskNotification[] = JSON.parse(stored);
          
          // Show toast for each unread notification
          notifications.forEach(notification => {
            const isAccepted = notification.action === 'accepted';
            toast({
              title: `Task ${notification.action}!`,
              description: `${notification.assigneeName} ${isAccepted ? 'accepted' : 'rejected'} the task "${notification.taskName}".`,
              variant: isAccepted ? "default" : "destructive",
            });
          });

          setNotifications(notifications);
          
          // Clear notifications after showing them
          localStorage.removeItem(`task-notifications-${user.id}`);
        } catch (error) {
          console.error('Error parsing notifications:', error);
        }
      }
    };

    // Check immediately
    checkNotifications();

    // Set up polling to check for new notifications every 5 seconds
    const interval = setInterval(checkNotifications, 5000);

    return () => clearInterval(interval);
  }, [user?.id, toast]);

  return {
    notifications,
    clearNotifications: () => {
      if (user?.id) {
        localStorage.removeItem(`task-notifications-${user.id}`);
        setNotifications([]);
      }
    }
  };
}