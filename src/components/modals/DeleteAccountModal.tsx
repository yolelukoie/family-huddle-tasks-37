import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Loader2, AlertTriangle, Mail } from 'lucide-react';

interface DeleteAccountModalProps {
  userId: string;
}

export function DeleteAccountModal({ userId }: DeleteAccountModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const isConfirmValid = confirmText === 'DELETE';

  const handleDeleteAccount = async () => {
    if (!isConfirmValid || !userId) return;

    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account');

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // Clear all Supabase and app-related localStorage items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('sb-') || key.startsWith('app_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Sign out the user
      await supabase.auth.signOut();

      toast({
        title: t('personal.accountDeleted') || 'Account Deleted',
        description: t('personal.accountDeletedDesc') || 'Your account and all data have been permanently deleted.',
      });

      // Force full page reload to auth page to ensure clean state
      window.location.replace('/auth');
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: t('personal.deleteError') || 'Error',
        description: t('personal.deleteErrorDesc') || 'Failed to delete account. Please try again or contact support.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setIsOpen(false);
      setConfirmText('');
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          {t('personal.deleteAccount') || 'Delete Account'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('personal.deleteAccountTitle') || 'Delete Your Account'}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              <p className="text-sm text-muted-foreground">
                {t('personal.deleteAccountWarning') || 
                  'This action is permanent and cannot be undone. All your data will be permanently deleted, including:'}
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>{t('personal.deleteDataProfile') || 'Your profile and personal information'}</li>
                <li>{t('personal.deleteDataTasks') || 'All tasks and task history'}</li>
                <li>{t('personal.deleteDataGoals') || 'Goals and progress'}</li>
                <li>{t('personal.deleteDataBadges') || 'Badges and achievements'}</li>
                <li>{t('personal.deleteDataCharacter') || 'Character customizations'}</li>
                <li>{t('personal.deleteDataChat') || 'Chat messages'}</li>
                <li>{t('personal.deleteDataFamily') || 'Family memberships'}</li>
              </ul>
              
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  {t('personal.deleteAccountSupport') || 'Need help? Contact us at'}{' '}
                  <a 
                    href="mailto:support@familyhuddletasks.com" 
                    className="text-primary hover:underline font-medium"
                  >
                    support@familyhuddletasks.com
                  </a>
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <Label htmlFor="confirm-delete" className="text-sm font-medium">
                  {t('personal.deleteConfirmLabel') || 'Type DELETE to confirm:'}
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="DELETE"
                  className="font-mono"
                  disabled={isDeleting}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {t('common.cancel') || 'Cancel'}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDeleteAccount}
            disabled={!isConfirmValid || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('personal.deleting') || 'Deleting...'}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('personal.deleteAccountConfirm') || 'Delete Account'}
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
