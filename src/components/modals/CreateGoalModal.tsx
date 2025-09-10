import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useTasks } from '@/hooks/useTasks';
import { useGoals } from '@/hooks/useGoals';
import { useToast } from '@/hooks/use-toast';

interface CreateGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  familyId: string;
  userId: string;
}

export function CreateGoalModal({ open, onOpenChange, familyId, userId }: CreateGoalModalProps) {
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
          title: "Success",
          description: "Goal created successfully!",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to create goal. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Failed to create goal:', error);
      toast({
        title: "Error",
        description: "Failed to create goal. Please try again.",
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
          <DialogTitle>Create New Goal</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="targetStars">Target Stars</Label>
            <Input
              id="targetStars"
              type="number"
              min="1"
              value={targetStars}
              onChange={(e) => setTargetStars(e.target.value)}
              placeholder="Enter number of stars"
              required
            />
          </div>

          <div>
            <Label>Target Categories (optional)</Label>
            <p className="text-sm text-muted-foreground mb-2">Leave empty to count all categories</p>
            <div className="space-y-2">
              {categories.map(category => (
                <div key={category.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`category-${category.id}`}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <Label htmlFor={`category-${category.id}`}>{category.name}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="reward">Reward (optional)</Label>
            <Textarea
              id="reward"
              value={reward}
              onChange={(e) => setReward(e.target.value)}
              placeholder="What will you reward yourself with?"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}