import { useEffect, useState, useRef } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useApp } from "@/hooks/useApp";
import { useAuth } from "@/hooks/useAuth";
import { isPlatform } from "@/lib/platform";
import { requestPushPermission, listenForPushNotifications, getPushPermissionStatus } from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";
import { ROUTES } from "@/lib/constants";
import MainPage from "@/pages/main/MainPage";
import OnboardingPage from "@/pages/onboarding/OnboardingPage";
import TasksPage from "@/pages/tasks/TasksPage";
import GoalsPage from "@/pages/goals/GoalsPage";
import ChatPage from "@/pages/chat/ChatPage";
import FamilyPage from "@/pages/family/FamilyPage";
import PersonalPage from "@/pages/personal/PersonalPage";
import PrivacyPolicyPage from "@/pages/legal/PrivacyPolicyPage";
import TermsOfServicePage from "@/pages/legal/TermsOfServicePage";
import RefundPolicyPage from "@/pages/legal/RefundPolicyPage";
import NotFound from "@/pages/NotFound";
import { useKickedFromFamily } from "@/hooks/useKickedFromFamily";
import { useAssignmentModal } from "@/contexts/AssignmentModalContext";
import { supabase } from "@/integrations/supabase/client";
import {
  NotificationPermissionDialog,
  hasSeenNotificationPrompt,
  markNotificationPromptAsShown,
} from "@/components/notifications/NotificationPermissionDialog";
import {
  NativePushPrompt,
  hasSeenNativePushPrompt,
} from "@/components/notifications/NativePushPrompt";

export function AppLayout() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeFamilyId } = useApp();
  const { isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { openAssignmentModal } = useAssignmentModal();
  
  // State for notification permission dialogs
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [showNativePushPrompt, setShowNativePushPrompt] = useState(false);

  // Global listener for when user is kicked from a family
  useKickedFromFamily();

  /** 1) Register the service worker for web FCM (skip on native) */
  useEffect(() => {
    if (isPlatform('capacitor')) {
      console.log('[Push] Native platform detected, skipping SW registration');
      return;
    }
    
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
        if (!cancelled) {
          await navigator.serviceWorker.ready;
          console.log("[FCM] SW registered:", reg.scope);
        }
      } catch (e) {
        console.error("[FCM] SW register failed:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** 2) Listen for push notifications (both web and native) + auto-register on native */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // Native: automatically register for push on every auth
    if (isPlatform('capacitor')) {
      console.log('[Push] Native platform — auto-registering push for user:', user.id);
      requestPushPermission(user.id)
        .then((result) => {
          console.log('[Push] Native registration result (initial):', JSON.stringify(result));
        })
        .catch((err) => {
          console.error('[Push] Native registration call failed (initial):', err);
        });

      // Also re-register on app resume
      let resumeListenerHandle: any = null;
      import('@capacitor/app').then(({ App }) => {
        resumeListenerHandle = App.addListener('resume', () => {
          console.log('[Push] App resumed — re-registering native push');
          requestPushPermission(user.id)
            .then((result) => {
              console.log('[Push] Native registration result (resume):', JSON.stringify(result));
            })
            .catch((err) => {
              console.error('[Push] Native registration call failed (resume):', err);
            });
        });
      }).catch(() => {});

      var nativeResumeCleanup = () => {
        if (resumeListenerHandle) {
          resumeListenerHandle.then((l: any) => l.remove());
        }
      };
    } else {
      // Web: Check if already granted and silently register token
      if ('Notification' in window && Notification.permission === 'granted') {
        requestPushPermission(user.id);
      }
    }

    // Handle push notifications — routing on tap vs foreground
    let unsubscribe: (() => void) | null = null;
    
    const handleNotification = async (p: any) => {
      console.log('[Push] Notification received:', p);
      
      const eventType = p?.data?.event_type || p?.data?.type;
      const tapped = p?.meta?.tapped === true;
      
      // === TAPPED notifications: route to correct screen ===
      if (tapped) {
        if (eventType === 'assigned' || eventType === 'task_assigned') {
          const taskId = p?.data?.task_id;
          const familyId = p?.data?.family_id;
          if (taskId) {
            navigate(`/tasks?taskId=${taskId}`, { replace: true });
            // Also try to open assignment modal
            if (taskId && familyId) {
              try {
                const { data: task, error } = await supabase
                  .from('tasks')
                  .select('*')
                  .eq('id', taskId)
                  .single();
                if (task && !error && task.assigned_to === user?.id) {
                  openAssignmentModal({
                    id: task.id, name: task.name, description: task.description ?? '',
                    starValue: task.star_value ?? 0, assignedBy: task.assigned_by,
                    assignedTo: task.assigned_to, dueDate: task.due_date,
                    familyId, categoryId: task.category_id, completed: !!task.completed,
                  } as any);
                }
              } catch (err) {
                console.error('[Push] Failed to fetch task for tap routing:', err);
              }
            }
          }
          return;
        }
        
        if (eventType === 'chat_message') {
          const familyId = p?.data?.family_id;
          navigate(familyId ? `/chat?familyId=${familyId}` : '/chat', { replace: true });
          return;
        }
        
        if (eventType === 'kicked' || eventType === 'member_removed') {
          navigate('/onboarding', { replace: true });
          toast({
            title: p?.notification?.title || 'Removed from family',
            description: p?.notification?.body || 'You have been removed from a family.',
            variant: 'destructive',
          });
          return;
        }
        
        // Default tap: just show toast
        const title = p?.notification?.title || p?.data?.title || "Family Huddle";
        const body = p?.notification?.body || p?.data?.body || "";
        toast({ title, description: body });
        return;
      }
      
      // === FOREGROUND notifications (not tapped) ===
      if (eventType === 'assigned' || eventType === 'task_assigned') {
        const taskId = p?.data?.task_id;
        const familyId = p?.data?.family_id;
        
        if (taskId && familyId) {
          try {
            const { data: task, error } = await supabase
              .from('tasks')
              .select('*')
              .eq('id', taskId)
              .single();
            
            if (task && !error && task.assigned_to === user?.id) {
              openAssignmentModal({
                id: task.id, name: task.name, description: task.description ?? '',
                starValue: task.star_value ?? 0, assignedBy: task.assigned_by,
                assignedTo: task.assigned_to, dueDate: task.due_date,
                familyId, categoryId: task.category_id, completed: !!task.completed,
              } as any);
            }
          } catch (err) {
            console.error('[Push] Failed to fetch task:', err);
          }
        }
        return; // Don't show toast for assigned events
      }
      
      if (eventType === 'kicked' || eventType === 'member_removed') {
        toast({
          title: p?.notification?.title || 'Removed from family',
          description: p?.notification?.body || 'You have been removed from a family.',
          variant: 'destructive',
        });
        navigate('/onboarding', { replace: true });
        return;
      }
      
      // For other foreground events, show toast
      const title = p?.notification?.title || p?.data?.title || "Family Huddle";
      const body = p?.notification?.body || p?.data?.body || "";
      if (body) {
        toast({ title, description: body });
      }
    };
    
    listenForPushNotifications(handleNotification).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
      if (typeof nativeResumeCleanup === 'function') nativeResumeCleanup();
    };
  }, [isAuthenticated, user?.id, toast, openAssignmentModal, navigate]);

  /** 3) Recover pending task assignments missed while app was closed */
  const pendingCheckedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !user?.id || !activeFamilyId || pendingCheckedRef.current) return;
    pendingCheckedRef.current = true;

    const checkPendingTasks = async () => {
      try {
        const { data: pendingTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', user.id)
          .eq('family_id', activeFamilyId)
          .eq('status', 'pending')
          .eq('completed', false);

        if (pendingTasks && pendingTasks.length > 0) {
          console.log(`[TaskRecovery] Found ${pendingTasks.length} pending task(s)`);
          const task = pendingTasks[0];
          openAssignmentModal({
            id: task.id, name: task.name, description: task.description ?? '',
            starValue: task.star_value ?? 0, assignedBy: task.assigned_by,
            assignedTo: task.assigned_to, dueDate: task.due_date,
            familyId: task.family_id, categoryId: task.category_id,
            completed: !!task.completed,
          } as any);
        }
      } catch (err) {
        console.error('[TaskRecovery] Error checking pending tasks:', err);
      }
    };

    checkPendingTasks();

    const handleResume = () => {
      pendingCheckedRef.current = false;
      checkPendingTasks();
    };

    if (isPlatform('capacitor')) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('resume', handleResume);
      }).catch(() => {});
    } else {
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') checkPendingTasks();
      };
      document.addEventListener('visibilitychange', handleVisibility);
      return () => document.removeEventListener('visibilitychange', handleVisibility);
    }
  }, [isAuthenticated, user?.id, activeFamilyId, openAssignmentModal]);

  useEffect(() => {
    if (isAuthenticated && location.pathname.includes("reset-password")) {
      try { window.history.replaceState({}, "", "/"); } catch {}
      window.location.replace("/");
    }
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (authLoading || isLoading) return;

    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }

    if (isAuthenticated && !user) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    if (user && !user.profileComplete) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    if (user && user.profileComplete && !user.activeFamilyId) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    if (user?.profileComplete && user.activeFamilyId && location.pathname === ROUTES.onboarding) {
      navigate(ROUTES.main, { replace: true });
    }

    // Show notification permission dialog for fully set up users
    if (user?.profileComplete && user.activeFamilyId && location.pathname === ROUTES.main) {
      if (isPlatform('capacitor')) {
        // Native: show our custom prompt on first run
        if (!hasSeenNativePushPrompt()) {
          setShowNativePushPrompt(true);
        }
      } else if (!hasSeenNotificationPrompt()) {
        // Web: existing dialog
        getPushPermissionStatus().then((status) => {
          if (status === 'prompt') {
            setShowNotificationDialog(true);
          } else {
            markNotificationPromptAsShown();
          }
        });
      }
    }
  }, [user, isAuthenticated, authLoading, isLoading, navigate, location.pathname]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Routes>
        <Route index element={<MainPage />} />
        <Route path={ROUTES.onboarding.slice(1)} element={<OnboardingPage />} />
        <Route path={ROUTES.tasks.slice(1)} element={<TasksPage />} />
        <Route path={ROUTES.goals.slice(1)} element={<GoalsPage />} />
        <Route path={ROUTES.chat.slice(1)} element={<ChatPage />} />
        <Route path={ROUTES.family.slice(1)} element={<FamilyPage />} />
        <Route path={ROUTES.personal.slice(1)} element={<PersonalPage />} />
        <Route path={ROUTES.privacy.slice(1)} element={<PrivacyPolicyPage />} />
        <Route path={ROUTES.terms.slice(1)} element={<TermsOfServicePage />} />
        <Route path={ROUTES.refund.slice(1)} element={<RefundPolicyPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* Web: one-time notification permission dialog */}
      {user?.id && (
        <NotificationPermissionDialog
          open={showNotificationDialog}
          onClose={() => setShowNotificationDialog(false)}
          userId={user.id}
        />
      )}

      {/* Native: first-run push prompt */}
      {user?.id && (
        <NativePushPrompt
          open={showNativePushPrompt}
          onClose={() => setShowNativePushPrompt(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}
