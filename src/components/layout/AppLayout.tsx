import { useEffect, useState } from "react";
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
import NotFound from "@/pages/NotFound";
import { DevTestButton } from "@/components/dev/DevTestButton";
import { useKickedFromFamily } from "@/hooks/useKickedFromFamily";
import { useAssignmentModal } from "@/contexts/AssignmentModalContext";
import { supabase } from "@/integrations/supabase/client";
import {
  NotificationPermissionDialog,
  hasSeenNotificationPrompt,
  markNotificationPromptAsShown,
} from "@/components/notifications/NotificationPermissionDialog";

export function AppLayout() {
  // Mount notifications hook globally for all authenticated users
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { activeFamilyId } = useApp();
  const { isLoading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { openAssignmentModal } = useAssignmentModal();
  
  // State for notification permission dialog
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);

  // Global listener for when user is kicked from a family
  useKickedFromFamily();

  /** 1) Register the service worker for web FCM (skip on native) */
  useEffect(() => {
    // Skip service worker registration on native platforms
    if (isPlatform('capacitor')) {
      console.log('[Push] Native platform detected, skipping SW registration');
      return;
    }
    
    let cancelled = false;
    (async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        // Ensure the SW at the site root is registered (file must be in /public/)
        const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
        if (!cancelled) {
          // Wait until it's active so getToken can attach to it
          await navigator.serviceWorker.ready;
          console.log("[FCM] SW registered:", reg.scope);
        }
      } catch (e) {
        console.error("[FCM] SW register failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** 2) Listen for push notifications (both web and native) */
  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;

    // For web: Check if already granted and silently register token
    // For native: This will be handled by registerNativePush
    if (!isPlatform('capacitor') && 'Notification' in window && Notification.permission === 'granted') {
      requestPushPermission(user.id);
    }

    // Handle push notifications - open modal for 'assigned', toast for others
    let unsubscribe: (() => void) | null = null;
    
    const handleNotification = async (p: any) => {
      console.log('[Push] Notification received:', p);
      
      const eventType = p?.data?.event_type || p?.data?.type;
      
      // Handle 'assigned' events by opening the modal - NO toast
      if (eventType === 'assigned') {
        const taskId = p?.data?.task_id;
        const familyId = p?.data?.family_id;
        
        if (taskId && familyId) {
          try {
            const { data: task, error } = await supabase
              .from('tasks')
              .select('*')
              .eq('id', taskId)
              .single();
            
            if (task && !error) {
              // CRITICAL: Only show modal if current user is the ASSIGNEE
              if (task.assigned_to !== user?.id) {
                console.log('[Push] Ignoring assigned event - current user is not the assignee');
                return;
              }
              
              const taskForModal = {
                id: task.id,
                name: task.name,
                description: task.description ?? '',
                starValue: task.star_value ?? 0,
                assignedBy: task.assigned_by,
                assignedTo: task.assigned_to,
                dueDate: task.due_date,
                familyId: familyId,
                categoryId: task.category_id,
                completed: !!task.completed,
              };
              openAssignmentModal(taskForModal as any);
            }
          } catch (err) {
            console.error('[Push] Failed to fetch task:', err);
          }
        }
        return; // Don't show toast for assigned events
      }
      
      // For other events, show toast
      const title = p?.notification?.title || p?.data?.title || "Family Huddle";
      const body = p?.notification?.body || p?.data?.body || "";
      toast({ title, description: body });
    };
    
    listenForPushNotifications(handleNotification).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, [isAuthenticated, user?.id, toast, openAssignmentModal]);

  useEffect(() => {
    if (isAuthenticated && location.pathname.includes("reset-password")) {
      try {
        window.history.replaceState({}, "", "/");
      } catch {}
      // Hard redirect avoids odd cases with ad-blockers/SW/router races
      window.location.replace("/");
      // If you prefer SPA navigation, you could do:
      // navigate("/", { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (authLoading || isLoading) return;

    // If not authenticated, redirect to auth page
    if (!isAuthenticated) {
      navigate("/auth", { replace: true });
      return;
    }

    // If authenticated but no user profile, redirect to onboarding
    if (isAuthenticated && !user) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // If user exists but hasn't completed profile setup, redirect to onboarding
    if (user && !user.profileComplete) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // If user has completed profile but no active family, and not on onboarding, redirect to onboarding
    if (user && user.profileComplete && !user.activeFamilyId) {
      if (location.pathname !== ROUTES.onboarding) {
        navigate(ROUTES.onboarding, { replace: true });
      }
      return;
    }

    // If fully set up user is on onboarding page, redirect to main
    if (user?.profileComplete && user.activeFamilyId && location.pathname === ROUTES.onboarding) {
      navigate(ROUTES.main, { replace: true });
    }

    // Show notification permission dialog for fully set up users who haven't seen it
    if (user?.profileComplete && user.activeFamilyId && location.pathname === ROUTES.main) {
      if (!hasSeenNotificationPrompt()) {
        // Check if permission is still promptable
        getPushPermissionStatus().then((status) => {
          if (status === 'prompt') {
            setShowNotificationDialog(true);
          } else {
            // Already granted or denied, mark as shown
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
        <Route path="*" element={<NotFound />} />
      </Routes>

      {/* One-time notification permission dialog */}
      {user?.id && (
        <NotificationPermissionDialog
          open={showNotificationDialog}
          onClose={() => setShowNotificationDialog(false)}
          userId={user.id}
        />
      )}
    </div>
  );
}
