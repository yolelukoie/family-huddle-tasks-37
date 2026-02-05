import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { BLOCK_REASONS, type BlockReason, type BlockDuration } from '@/lib/blockUtils';

interface BlockMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberName: string;
  memberId: string;
  familyId: string;
  onBlock: (memberId: string, familyId: string, reason: BlockReason, duration: BlockDuration) => Promise<void>;
}

const DURATION_OPTIONS: BlockDuration[] = ['1hour', '12hours', '1day', '1week', 'indefinite'];

export function BlockMemberModal({
  open,
  onOpenChange,
  memberName,
  memberId,
  familyId,
  onBlock,
}: BlockMemberModalProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState<BlockReason | ''>('');
  const [duration, setDuration] = useState<BlockDuration | ''>('');
  const [isBlocking, setIsBlocking] = useState(false);

  const handleBlock = async () => {
    if (!reason || !duration) return;
    
    setIsBlocking(true);
    try {
      await onBlock(memberId, familyId, reason, duration);
      onOpenChange(false);
      // Reset state
      setReason('');
      setDuration('');
    } finally {
      setIsBlocking(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isBlocking) {
      onOpenChange(newOpen);
      if (!newOpen) {
        setReason('');
        setDuration('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('block.title')}</DialogTitle>
          <DialogDescription>
            {t('block.description', { name: memberName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Reason Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="block-reason">{t('block.reason')}</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as BlockReason)}>
              <SelectTrigger id="block-reason">
                <SelectValue placeholder={t('block.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {BLOCK_REASONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {t(`block.reasons.${r}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Duration Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="block-duration">{t('block.duration')}</Label>
            <Select value={duration} onValueChange={(v) => setDuration(v as BlockDuration)}>
              <SelectTrigger id="block-duration">
                <SelectValue placeholder={t('block.selectDuration')} />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {t(`block.${d}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning for indefinite block */}
          {duration === 'indefinite' && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('block.autoKickWarning')}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isBlocking}
          >
            {t('common.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleBlock}
            disabled={!reason || !duration || isBlocking}
          >
            {isBlocking ? t('common.loading') : t('block.blockBtn')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
