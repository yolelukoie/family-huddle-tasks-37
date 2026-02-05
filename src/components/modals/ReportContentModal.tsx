import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface ReportContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string;
  contentType: 'task_template' | 'task' | 'chat_message';
  familyId: string;
  contentName?: string;
  createdBy?: string;
  onReported?: () => void;
}

const REPORT_REASONS = [
  { value: 'spam', labelKey: 'report.reasonSpam' },
  { value: 'harassment', labelKey: 'report.reasonHarassment' },
  { value: 'hate', labelKey: 'report.reasonHate' },
  { value: 'sexual', labelKey: 'report.reasonSexual' },
  { value: 'violence', labelKey: 'report.reasonViolence' },
  { value: 'personal_info', labelKey: 'report.reasonPersonalInfo' },
  { value: 'other', labelKey: 'report.reasonOther' },
];

export function ReportContentModal({
  open,
  onOpenChange,
  contentId,
  contentType,
  familyId,
  contentName,
  createdBy,
  onReported,
}: ReportContentModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;

    setIsSubmitting(true);
    try {
      // 1. Delete the task_template FIRST if it's a task_template report
      // This ensures the task is removed before we create the report
      if (contentType === 'task_template' && contentId) {
        const { error: deleteError } = await supabase
          .from('task_templates')
          .delete()
          .eq('id', contentId);

        if (deleteError) {
          console.error('Failed to delete task template:', deleteError);
          throw deleteError; // Fail if we can't delete
        }
      }

      // 2. Insert report with content_name (store the name for audit purposes)
      const { error: reportError } = await supabase.from('reports').insert({
        reporter_id: user.id,
        family_id: familyId,
        content_id: contentId,
        content_type: contentType,
        content_name: contentName && contentName.trim() ? contentName.trim() : null,
        reason,
        details: details.trim() || null,
      });

      if (reportError) throw reportError;

      // 3. Notify the creator if we have their ID and it's not the reporter
      if (createdBy && createdBy !== user.id && contentType === 'task_template') {
        // Get the translated reason label for notification
        const reasonLabel = t(`report.reason${reason.charAt(0).toUpperCase() + reason.slice(1).replace('_', '')}`);
        
        // Create a task_event to notify the creator
        const { error: eventError } = await supabase.from('task_events').insert({
          task_id: contentId,
          event_type: 'reported',
          actor_id: user.id,
          recipient_id: createdBy,
          family_id: familyId,
          payload: {
            task_name: contentName,
            reason: reason,
            reason_label: reasonLabel,
          },
        });

        if (eventError) {
          console.error('Failed to create task event:', eventError);
        }

        // Send push notification to the creator
        try {
          const notificationTitle = t('notification.taskReported');
          const notificationBody = t('notification.taskReportedBody', {
            name: contentName,
            reason: reasonLabel,
          });

          await supabase.functions.invoke('send-push', {
            body: {
              recipientId: createdBy,
              title: notificationTitle,
              body: notificationBody,
              data: {
                event_type: 'reported',
                task_id: contentId,
                family_id: familyId,
              },
            },
          });
        } catch (pushError) {
          console.error('Failed to send push notification:', pushError);
          // Continue anyway - notification is optional
        }
      }

      toast({
        title: t('report.successTitle'),
        description: t('report.successDesc'),
      });

      // Reset form and close
      setReason('');
      setDetails('');
      onOpenChange(false);
      onReported?.();
    } catch (error) {
      console.error('Failed to submit report:', error);
      toast({
        title: t('common.error'),
        description: t('report.errorSubmitting'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setDetails('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('report.title')}</DialogTitle>
          <DialogDescription>{t('report.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">{t('report.reasonLabel')} *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger id="reason">
                <SelectValue placeholder={t('report.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {REPORT_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {t(r.labelKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {reason === 'other' && (
            <div className="space-y-2">
              <Label htmlFor="details">{t('report.detailsLabel')}</Label>
              <Textarea
                id="details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder={t('report.detailsPlaceholder')}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!reason || isSubmitting}
            variant="destructive"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('report.submitting')}
              </>
            ) : (
              t('report.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
