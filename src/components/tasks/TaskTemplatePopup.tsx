import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Flag } from 'lucide-react';
import { analytics } from '@/lib/analytics';

interface TaskTemplatePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: {
    id: string;
    name: string;
    description?: string | null;
    categoryId: string;
    isDefault?: boolean;
    isDeletable?: boolean;
  };
  prefilledComment: string;
  onAddToToday: (comment: string) => Promise<void> | void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function TaskTemplatePopup({
  open,
  onOpenChange,
  template,
  prefilledComment,
  onAddToToday,
  onDelete,
  onReport,
}: TaskTemplatePopupProps) {
  const { t } = useTranslation();
  const [comment, setComment] = useState(prefilledComment);

  // Keep the comment in sync if the prefilled value or template changes while opening
  useEffect(() => {
    if (open) setComment(prefilledComment);
  }, [open, prefilledComment, template.id]);

  const handleAdd = async () => {
    analytics.capture('task_added_from_template', {
      template_id: template.id,
      category_id: template.categoryId,
      has_comment: comment.trim().length > 0,
      comment_modified: comment !== prefilledComment,
    });
    await onAddToToday(comment);
    onOpenChange(false);
  };

  const handleDelete = () => {
    analytics.capture('template_deleted_via_popup', { template_id: template.id });
    onOpenChange(false);
    onDelete?.();
  };

  const handleReport = () => {
    onOpenChange(false);
    onReport?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tasks.longPressMenuTitle')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm font-medium mb-2">{template.name}</p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('tasks.commentPlaceholder')}
            rows={4}
            className="mb-4"
          />
          <Button className="w-full" onClick={handleAdd}>
            {t('tasks.addToTodayWithComment')}
          </Button>
        </DialogBody>
        <DialogFooter className="flex flex-row gap-2 sm:gap-2 sm:justify-stretch">
          {onDelete && template.isDeletable && (
            <Button variant="destructive" className="flex-1" onClick={handleDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              {t('common.delete')}
            </Button>
          )}
          {onReport && (
            <Button variant="outline" className="flex-1" onClick={handleReport}>
              <Flag className="mr-2 h-4 w-4" />
              {t('tasks.reportTemplate')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
