import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface CreateCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
}

export function CreateCategoryModal({ open, onOpenChange, familyId }: CreateCategoryModalProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { addCategory } = useTasks();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || loading || !user) return;

    setLoading(true);
    try {
      const result = await addCategory({
        name: name.trim(),
        familyId,
        userId: user.id,
        isHouseChores: false,
        isDefault: false,
        order: Date.now(),
      });
      
      if (result) {
        setName('');
        onOpenChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setName('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('tasks.createCategory')}</DialogTitle>
          <DialogDescription>{t('tasks.createCategoryDesc')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="categoryName">{t('tasks.categoryNameLabel')}</Label>
            <Input
              id="categoryName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tasks.categoryNamePlaceholder')}
              autoFocus
              required
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || loading} variant="theme">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('common.creating')}
                </>
              ) : (
                t('tasks.createCategoryBtn')
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}