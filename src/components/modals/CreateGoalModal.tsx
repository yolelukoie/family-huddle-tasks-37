import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { useFeatureGate } from '@/hooks/useFeatureGate';
import { translateCategoryName } from '@/lib/translations';
import { Goal } from '@/lib/types';

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  userId: string;
  activeGoals?: Goal[];
  createGoal: (goalData: Omit<Goal, 'id' | 'createdAt' | 'currentStars' | 'completed' | 'completedAt'>) => Promise<Goal | null>;
}

export function CreateGoalModal({ open, onOpenChange, familyId, userId, activeGoals = [], createGoal }: CreateGoalModalProps) {
  const { t } = useTranslation();
  const [targetStars, setTargetStars] = useState('');
  const [reward, setReward] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { categories } = useTasks();
  const { toast } = useToast();
  const { gate } = useFeatureGate();

  const categoriesWithActiveGoals = new Set(
    activeGoals.flatMap(g => g.targetCategories || [])
  );
  const hasGeneralGoal = activeGoals.some(g => !g.targetCategories || g.targetCategories.length === 0);
  const availableCategories = categories.filter((c: any) => !categoriesWithActiveGoals.has(c.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetStars || parseInt(targetStars) <= 0) return;

    gate(async () => {
      setLoading(true);
      try {
        const success = await createGoal({
          familyId,
          userId,
          targetStars: parseInt(targetStars),
          targetCategories: selectedCategory ? [selectedCategory] : [],
          reward: reward.trim() || undefined,
        });

        if (success) {
          setTargetStars('');
          setReward('');
          setSelectedCategory(null);
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
    });
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategory(prev => prev === categoryId ? null : categoryId);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('goalModal.createNewGoal')}</DialogTitle>
        </DialogHeader>
        <DialogBody>
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
            <div className="space-y-2">
              {availableCategories.map((category: any) => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategory === category.id}
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
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
