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

interface NotificationPermissionDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

const NOTIFICATION_PROMPT_SHOWN_KEY = "notification_prompt_shown";

export function markNotificationPromptAsShown() {
  localStorage.setItem(NOTIFICATION_PROMPT_SHOWN_KEY, "true");
}

export function hasSeenNotificationPrompt(): boolean {
  return localStorage.getItem(NOTIFICATION_PROMPT_SHOWN_KEY) === "true";
}

export function NotificationPermissionDialog({
  open,
  onClose,
  userId,
}: NotificationPermissionDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleEnable = async () => {
    setIsEnabling(true);
    try {
      const result = await requestPushPermission(userId);
      markNotificationPromptAsShown();
      
      if (result.success) {
        toast({
          title: t("notifications.enabled"),
          description: t("notifications.enabledDesc"),
        });
      } else {
        toast({
          title: t("notifications.denied"),
          description: t("notifications.deniedDesc"),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t("notifications.error"),
        description: t("notifications.errorDesc"),
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
      onClose();
    }
  };

  const handleMaybeLater = () => {
    markNotificationPromptAsShown();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleMaybeLater()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Bell className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {t("notifications.enableTitle")}
          </DialogTitle>
          <DialogDescription className="text-center">
            {t("notifications.enableDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm">{t("assignTask.taskAssigned", { taskName: "" }).replace('""', t("tasks.title"))}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm">{t("celebrations.goalReached")}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <MessageSquare className="h-5 w-5 text-primary shrink-0" />
            <span className="text-sm">{t("chat.title")}</span>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            onClick={handleEnable}
            disabled={isEnabling}
            className="w-full"
          >
            {isEnabling ? t("notifications.enabling") : t("notifications.enable")}
          </Button>
          <Button
            variant="ghost"
            onClick={handleMaybeLater}
            disabled={isEnabling}
            className="w-full"
          >
            {t("notifications.later")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
