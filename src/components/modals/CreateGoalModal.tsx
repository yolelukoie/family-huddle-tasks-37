import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';
import { translateCategoryName } from '@/lib/translations';

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  userId: string;
}

export function CreateGoalModal({ open, onOpenChange, familyId, userId }: CreateGoalModalProps) {
  const { t } = useTranslation();
  const [targetStars, setTargetStars] = useState('');
  const [reward, setReward] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { categories } = useTasks();
  const { createGoal } = useGoals();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStars || parseInt(targetStars) <= 0) return;

    setLoading(true);
    try {
      const success = await createGoal({
        familyId,
        userId,
        targetStars: parseInt(targetStars),
        targetCategories: selectedCategories.length > 0 ? selectedCategories : [],
        reward: reward.trim() || undefined,
      });

      if (success) {
        setTargetStars('');
        setReward('');
        setSelectedCategories([]);
        onOpenChange(false);
        toast({
          title: t('goalModal.success'),
          description: t('goalModal.goalCreated'),
        });
      } else {
        toast({
          title: t('goalModal.error'),
          description: t('goalModal.failedToCreate'),
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      toast({
        title: t('goalModal.error'),
        description: t('goalModal.failedToCreate'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('goalModal.createNewGoal')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="targetStars">{t('goalModal.targetStars')}</Label>
            <Input
              id="targetStars"
              type="number"
              min="1"
              value={targetStars}
              onChange={(e) => setTargetStars(e.target.value)}
              placeholder={t('goalModal.enterNumberOfStars')}
              required
            />
          </div>

          <div>
            <Label>{t('goalModal.targetCategories')}</Label>
            <p className="text-sm text-muted-foreground mb-2">{t('goalModal.leaveEmptyHint')}</p>
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label htmlFor={`category-${category.id}`}>{translateCategoryName(category.name, t)}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="reward">{t('goalModal.reward')}</Label>
            <Textarea
              id="reward"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder={t('goalModal.rewardPlaceholder')}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="warm" disabled={loading}>
              {loading ? t('goalModal.creating') : t('goalModal.createGoal')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}