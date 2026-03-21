import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, MessageSquare, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { requestPushPermission } from "@/lib/pushNotifications";
import { useToast } from "@/hooks/use-toast";

const NATIVE_PUSH_PROMPT_KEY = "native_push_prompt_shown";

export function markNativePushPromptShown() {
  try { localStorage.setItem(NATIVE_PUSH_PROMPT_KEY, "true"); } catch {}
}

export function hasSeenNativePushPrompt(): boolean {
  try { return localStorage.getItem(NATIVE_PUSH_PROMPT_KEY) === "true"; } catch { return false; }
}

interface NativePushPromptProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export function NativePushPrompt({ open, onClose, userId }: NativePushPromptProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleYes = async () => {
    setIsEnabling(true);
    try {
      const result = await requestPushPermission(userId);
      markNativePushPromptShown();

      if (result.success) {
        toast({
          title: t("notifications.enabled") || "Notifications enabled",
          description: t("notifications.enabledDesc") || "You'll receive task and message notifications",
        });
      } else {
        toast({
          title: t("notifications.error") || "Could not enable",
          description: result.error || t("notifications.errorDesc") || "Please try from Settings",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: t("notifications.error") || "Error",
        description: t("notifications.errorDesc") || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
      onClose();
    }
  };

  const handleNotNow = () => {
    markNativePushPromptShown();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleNotNow()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {t("notifications.enableTitle") || "Enable Notifications"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("notifications.nativePromptDesc") || "Enable notifications to receive task assignments, chat messages, and family updates."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm">{t("notifications.benefitTasks") || "Task assignments & updates"}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm">{t("notifications.benefitChat") || "Chat messages from family"}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm">{t("notifications.benefitFamily") || "Family updates & events"}</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button onClick={handleYes} disabled={isEnabling} className="w-full">
            {isEnabling
              ? (t("notifications.enabling") || "Enabling...")
              : (t("notifications.yesEnable") || "Yes, enable notifications")}
          </Button>
          <Button variant="ghost" onClick={handleNotNow} disabled={isEnabling} className="w-full">
            {t("notifications.notNow") || "Not now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
