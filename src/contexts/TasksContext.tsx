import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCelebrations } from '@/hooks/useCelebrations';
import { getNewlyUnlockedBadges } from '@/lib/badges';
import { isBlocked } from '@/lib/blockUtils';
import type { Task, TaskCategory, TaskTemplate, Badge } from '@/lib/types';

const MAX_CATEGORIES_PER_FAMILY = 10;
const MAX_TEMPLATES_PER_CATEGORY = 20;

interface TasksContextValue {
  tasks: Task[];
  categories: TaskCategory[];
  templates: TaskTemplate[];
  loading: boolean;
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task | null>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<boolean>;
  addCategory: (category: Omit<TaskCategory, 'id' | 'createdAt'>) => Promise<TaskCategory | null>;
  deleteCategory: (categoryId: string) => Promise<boolean>;
  deleteTemplate: (templateId: string) => Promise<boolean>;
  addTemplate: (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => Promise<TaskTemplate | null>;
  addTodayTaskFromTemplate: (templateId: string) => Promise<Task | null>;
  ensureCategoryByName: (name: string, opts?: { isHouseChores?: boolean }) => Promise<TaskCategory | null>;
  refreshData: () => Promise<void>;
}

const TasksContext = createContext<TasksContextValue | undefined>(undefined);

export function TasksProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeFamilyId, applyStarsDelta, getUserFamily } = useApp();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { addCelebration } = useCelebrations();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Centralized badge checking and awarding - ensures badges are awarded from any page
  const checkAndAwardBadges = useCallback(async (
    userId: string, 
    familyId: string, 
    oldStars: number, 
    newStars: number
  ) => {
    try {
      const newBadges = getNewlyUnlockedBadges(oldStars, newStars);
      if (newBadges.length === 0) return;

      console.log(`TasksContext: Found ${newBadges.length} new badges to award`);

      const badgeIds = newBadges.map(b => b.id);
      
      // Fetch existing badge rows for these ids
      const { data: existing, error: selError } = await supabase
        .from('user_badges')
        .select('badge_id, seen')
        .eq('user_id', userId)
        .eq('family_id', familyId)
        .in('badge_id', badgeIds);

      if (selError) {
        console.error('TasksContext: Failed to read user_badges:', selError);
        return;
      }

      const existingMap = new Map<string, { seen: boolean }>();
      (existing || []).forEach(row => existingMap.set(row.badge_id as string, { seen: row.seen as boolean }));

      const toInsert: { user_id: string; family_id: string; badge_id: string; seen: boolean }[] = [];
      const toMarkSeen: string[] = [];
      const celebrate: Badge[] = [];

      for (const b of newBadges) {
        const ex = existingMap.get(b.id);
        if (!ex) {
          // Insert as unseen so celebration triggers
          toInsert.push({ user_id: userId, family_id: familyId, badge_id: b.id, seen: false });
          celebrate.push(b);
        } else if (!ex.seen) {
          toMarkSeen.push(b.id);
          celebrate.push(b);
        }
      }

      if (toInsert.length > 0) {
        const { error } = await supabase.from('user_badges').insert(toInsert);
        if (error) console.error('TasksContext: Failed to insert user_badges:', error);
        else console.log('TasksContext: Inserted new badges:', toInsert.map(b => b.badge_id));
      }

      // Queue celebrations first
      if (celebrate.length > 0) {
        console.log('TasksContext: Queueing celebrations for badges:', celebrate.map(b => b.id));
        celebrate.forEach(badge => addCelebration({ type: 'badge', badge }));
      }

      // Mark as seen after celebrations are queued (including newly inserted ones)
      const allToMarkSeen = [...toMarkSeen, ...toInsert.map(b => b.badge_id)];
      if (allToMarkSeen.length > 0) {
        const { error } = await supabase
          .from('user_badges')
          .update({ seen: true })
          .eq('user_id', userId)
          .eq('family_id', familyId)
          .in('badge_id', allToMarkSeen);
        if (error) console.error('TasksContext: Failed to mark badges as seen:', error);
        else console.log('TasksContext: Marked badges as seen:', allToMarkSeen);
      }
      
      // Emit event for badge displays to refresh
      window.dispatchEvent(new CustomEvent('badges:changed'));
    } catch (e) {
      console.error('TasksContext: checkAndAwardBadges failed:', e);
    }
  }, [addCelebration]);

  // Load data from Supabase when family changes
  const loadFamilyTasks = useCallback(async () => {
    if (!activeFamilyId) {
      setTasks([]);
      setCategories([]);
      setTemplates([]);
      return;
    }
    
    setLoading(true);
    try {
      // Load all family data in parallel
      const [tasksRes, categoriesRes, templatesRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', activeFamilyId),
        supabase.from('task_categories').select('*').eq('family_id', activeFamilyId).order('order_index'),
        supabase.from('task_templates').select('*').eq('family_id', activeFamilyId)
      ]);

      if (tasksRes.error) console.error('Error loading tasks:', tasksRes.error);
      else {
        const convertedTasks: Task[] = (tasksRes.data || []).map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          categoryId: t.category_id,
          starValue: t.star_value,
          completed: t.completed,
          completedAt: t.completed_at || undefined,
          familyId: t.family_id,
          templateId: t.template_id || undefined,
          assignedTo: t.assigned_to,
          assignedBy: t.assigned_by,
          dueDate: t.due_date,
          status: (t as any).status || 'active',
        }));
        setTasks(convertedTasks);
      }

      if (categoriesRes.error) console.error('Error loading categories:', categoriesRes.error);
      else {
        const convertedCategories: TaskCategory[] = (categoriesRes.data || []).map(c => ({
          id: c.id,
          name: c.name,
          familyId: c.family_id,
          userId: c.user_id,
          isDefault: c.is_default,
          isHouseChores: c.is_house_chores,
          order: c.order_index,
        }));
        setCategories(convertedCategories);
      }

      if (templatesRes.error) console.error('Error loading templates:', templatesRes.error);
      else {
        const convertedTemplates: TaskTemplate[] = (templatesRes.data || []).map(t => ({
          id: t.id,
          name: t.name,
          description: t.description || '',
          categoryId: t.category_id,
          starValue: t.star_value,
          familyId: t.family_id,
          isDefault: t.is_default,
          isDeletable: t.is_deletable,
          createdBy: t.created_by,
          createdAt: t.created_at,
        }));
        setTemplates(convertedTemplates);
      }
    } catch (error) {
      console.error('Error loading family tasks:', error);
    }
    setLoading(false);
  }, [activeFamilyId]);

  useEffect(() => {
    loadFamilyTasks();
  }, [loadFamilyTasks]);

  // Listen for global task changes
  useEffect(() => {
    const handler = () => loadFamilyTasks();
    window.addEventListener('tasks:changed', handler);
    return () => window.removeEventListener('tasks:changed', handler);
  }, [loadFamilyTasks]);

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    if (!activeFamilyId || !user) return null;

    // Check if user is blocked and trying to assign to someone else
    const userFamily = getUserFamily(activeFamilyId);
    if (isBlocked(userFamily)) {
      const targetUser = task.assignedTo ?? user.id;
      if (targetUser !== user.id) {
        toast({
          title: t('block.restricted'),
          description: t('block.cannotAssignTasks'),
          variant: 'destructive',
        });
        return null;
      }
    }
  
    // Ensure due_date defaults to today if missing
    const ensureDate = (d?: string) => {
      if (d) return d;
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
  
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          name: task.name,
          description: task.description || null,
          category_id: task.categoryId,
          star_value: task.starValue,
          family_id: activeFamilyId,
          template_id: task.templateId || null,
          assigned_to: task.assignedTo ?? user.id,
          assigned_by: task.assignedBy ?? user.id,
          due_date: ensureDate(task.dueDate),
          status: task.status || 'active',
        }])
        .select()
        .single();
  
      if (error) {
        toast({ title: "Error", description: `Failed to add task: ${error.message}`, variant: "destructive" });
        return null;
      }
  
      const newTask: Task = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        categoryId: data.category_id,
        starValue: data.star_value,
        completed: data.completed,
        completedAt: data.completed_at || undefined,
        familyId: data.family_id,
        templateId: data.template_id || undefined,
        assignedTo: data.assigned_to,
        assignedBy: data.assigned_by,
        dueDate: data.due_date,
        status: (data as any).status || 'active',
      };
  
      setTasks(prev => [...prev, newTask]);
      window.dispatchEvent(new CustomEvent('tasks:changed'));
      return newTask;
    } catch (e: any) {
      toast({ title: "Error", description: `Failed to add task: ${e?.message || e}`, variant: "destructive" });
      return null;
    }
  }, [activeFamilyId, user, toast]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!activeFamilyId) return;

    const prev = tasks.find(t => t.id === taskId);
    const prevCompleted = !!prev?.completed;

    // Build update object for all possible fields
    const patch: any = {};
    if (updates.completed !== undefined) {
      patch.completed = updates.completed;
      patch.completed_at = updates.completedAt ?? (updates.completed ? new Date().toISOString() : null);
    }
    if (updates.categoryId !== undefined) patch.category_id = updates.categoryId;
    if (updates.assignedTo !== undefined) patch.assigned_to = updates.assignedTo;
    if (updates.dueDate !== undefined) patch.due_date = updates.dueDate;
    if (updates.status !== undefined) patch.status = updates.status;

    const { data: updated, error } = await supabase
      .from('tasks')
      .update(patch)
      .eq('id', taskId)
      .select('id, completed, star_value, family_id')
      .single();

    if (error) {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
      return;
    }

    // Update local state
    setTasks(prevList => prevList.map(task => task.id === taskId ? { ...task, ...updates } : task));

    // Compute delta from fresh DB data
    const nowCompleted = !!updated.completed;
    let delta = 0;
    if (nowCompleted && !prevCompleted) delta = + (updated.star_value ?? 0);
    if (!nowCompleted && prevCompleted) delta = - (updated.star_value ?? 0);
    
    console.log(`TasksContext: Task ${taskId} completion changed. Was: ${prevCompleted}, Now: ${nowCompleted}, Stars: ${updated.star_value}, Delta: ${delta}`);
    
    // Apply stars delta if there's a change
    if (delta !== 0) {
      console.log(`TasksContext: Applying stars delta ${delta} to family ${updated.family_id}`);
      
      // Get old stars before applying delta
      const userFamily = getUserFamily(updated.family_id);
      const oldStars = userFamily?.totalStars ?? 0;
      
      const success = await applyStarsDelta(updated.family_id, delta);
      
      if (success && delta > 0 && user) {
        const newStars = oldStars + delta;
        console.log(`TasksContext: Stars changed from ${oldStars} to ${newStars}, checking badges...`);
        
        // Check for newly unlocked badges and trigger celebrations
        await checkAndAwardBadges(user.id, updated.family_id, oldStars, newStars);
      } else if (!success) {
        console.error('TasksContext: Failed to apply stars delta, skipping badge award');
      }
    }

    // Send completion notification to assigner if task was completed by someone else
    if (nowCompleted && !prevCompleted && prev?.assignedBy && prev.assignedBy !== user?.id) {
      try {
        const { error: evErr } = await supabase.from("task_events").insert({
          task_id: taskId,
          family_id: updated.family_id,
          recipient_id: prev.assignedBy,
          actor_id: user!.id,
          event_type: "completed",
          payload: {
            name: prev.name,
            stars: updated.star_value,
            actor_name: user!.displayName,
          },
        });

        if (!evErr) {
          await supabase.functions.invoke("send-push", {
            body: {
              recipientId: prev.assignedBy,
              title: "Task completed",
              body: `${user!.displayName ?? "Someone"} completed "${prev.name}"`,
              data: { type: "completed", taskId },
            },
          }).catch(e => console.error("[send-push] invoke failed:", e));
        } else {
          console.error("[task_events] insert failed (completed):", evErr);
        }
      } catch (e) {
        console.error("[task_events] completion notification failed:", e);
      }
    }

    // Emit change event for other components
    window.dispatchEvent(new CustomEvent('tasks:changed'));
  }, [activeFamilyId, tasks, applyStarsDelta, getUserFamily, user, toast, checkAndAwardBadges]);

  // Helper to ensure a category exists by name
  const ensureCategoryByName = useCallback(async (name: string, opts?: { isHouseChores?: boolean }) => {
    if (!activeFamilyId) return null;

    // 1) Try to find (case-insensitive) in current family
    const existing = categories.find(
      c => c.familyId === activeFamilyId && c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) return existing;

    // 2) If not found, create with the next order
    const familyCategories = categories.filter(c => c.familyId === activeFamilyId);
    const nextOrder =
      (familyCategories.length === 0
        ? 0
        : Math.max(...familyCategories.map(c => c.order ?? 0))) + 1;

    const { data, error } = await supabase
      .from('task_categories')
      .insert([{
        name,
        family_id: activeFamilyId,
        user_id: user?.id || null,
        is_default: name.toLowerCase() === 'assigned',
        is_house_chores: !!opts?.isHouseChores,
        order_index: nextOrder,
      }])
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: `Failed to create category "${name}": ${error.message}`, variant: "destructive" });
      return null;
    }

    const newCategory: TaskCategory = {
      id: data.id,
      name: data.name,
      familyId: data.family_id,
      userId: data.user_id,
      isDefault: data.is_default,
      isHouseChores: data.is_house_chores,
      order: data.order_index,
    };

    setCategories(prev => [...prev, newCategory]);
    return newCategory;
  }, [activeFamilyId, categories, toast]);

  const addCategory = useCallback(async (category: Omit<TaskCategory, 'id' | 'createdAt'>) => {
    if (!activeFamilyId) return null;

    // Check limit using only categories for the current family
    const familyCategories = categories.filter(c => c.familyId === activeFamilyId);
    if (familyCategories.length >= MAX_CATEGORIES_PER_FAMILY) {
      toast({
        title: "Limit Reached", 
        description: `Cannot add more than ${MAX_CATEGORIES_PER_FAMILY} categories per family.`,
        variant: "destructive",
      });
      return null;
    }

    const nextOrder =
      (familyCategories.length === 0
        ? 0
        : Math.max(...familyCategories.map(c => c.order ?? 0))) + 1;

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert([{
          name: category.name,
          family_id: activeFamilyId,
          user_id: category.userId || null,
          is_default: category.isDefault || false,
          is_house_chores: category.isHouseChores || false,
          order_index: nextOrder,
        }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: `Failed to add category: ${error.message}`,
          variant: "destructive", 
        });
        return null;
      }

      const newCategory: TaskCategory = {
        id: data.id,
        name: data.name,
        familyId: data.family_id,
        userId: data.user_id,
        isDefault: data.is_default,
        isHouseChores: data.is_house_chores,
        order: data.order_index,
      };

      setCategories(prev => [...prev, newCategory]);
      
      // Emit change event for other components
      window.dispatchEvent(new CustomEvent('tasks:changed'));
      
      return newCategory;
    } catch (e: any) {
      toast({
        title: "Error",
        description: `Failed to add category: ${e?.message || e}`,
        variant: "destructive",
      });
      return null;
    }
  }, [activeFamilyId, categories, toast]);

  const addTemplate = useCallback(async (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    if (!activeFamilyId || !user) return null;
  
    // Quick client-side guard by current state (same family + category)
    const existingInCategory = templates.filter(t => t.familyId === activeFamilyId && t.categoryId === template.categoryId);
    if (existingInCategory.length >= MAX_TEMPLATES_PER_CATEGORY) {
      toast({
        title: "Limit Reached",
        description: `You can have at most ${MAX_TEMPLATES_PER_CATEGORY} templates in this category.`,
        variant: "destructive",
      });
      return null;
    }
  
    // Insert the template
    const { data, error } = await supabase
      .from('task_templates')
      .insert([{
        name: template.name,
        description: template.description || null,
        category_id: template.categoryId,
        star_value: template.starValue,
        family_id: activeFamilyId,
        is_default: template.isDefault || false,
        is_deletable: template.isDeletable ?? true,
        created_by: user.id,
      }])
      .select()
      .single();
  
    if (error) {
      toast({ title: "Error", description: `Failed to add template: ${error.message}`, variant: "destructive" });
      return null;
    }
  
    // Authoritative count after insert (handles concurrent creators)
    const { count, error: countErr } = await supabase
      .from('task_templates')
      .select('id', { count: 'exact', head: true })
      .eq('family_id', activeFamilyId)
      .eq('category_id', template.categoryId);
  
    if (!countErr && (count ?? 0) > MAX_TEMPLATES_PER_CATEGORY) {
      // Too many now – delete just-inserted template to keep the earliest ones
      await supabase.from('task_templates').delete().eq('id', data.id);
      toast({
        title: "Limit Reached",
        description: `Only the first ${MAX_TEMPLATES_PER_CATEGORY} templates are kept. Yours was not saved because the category is full.`,
        variant: "destructive",
      });
      return null;
    }
  
    // Add to local state
    const newTemplate: TaskTemplate = {
      id: data.id,
      name: data.name,
      description: data.description || '',
      categoryId: data.category_id,
      starValue: data.star_value,
      familyId: data.family_id,
      isDefault: data.is_default,
      isDeletable: data.is_deletable,
      createdBy: data.created_by,
    };
  
    setTemplates(prev => [...prev, newTemplate]);
    window.dispatchEvent(new CustomEvent('tasks:changed'));
    return newTemplate;
  }, [activeFamilyId, user, templates, toast]);

  const addTodayTaskFromTemplate = useCallback(async (templateId: string) => {
    if (!activeFamilyId || !user) return null;
  
    const t = templates.find(x => x.id === templateId);
    if (!t) {
      console.error('Template not found for Today:', templateId);
      return null;
    }
  
    // today's date (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayDateStr = `${yyyy}-${mm}-${dd}`;
  
    try {
      const insertData = {
        name: t.name,
        description: t.description || null,
        category_id: t.categoryId,
        star_value: t.starValue,
        family_id: activeFamilyId,
        template_id: t.id,
        assigned_to: user.id,
        assigned_by: user.id,
        due_date: todayDateStr,
      };
  
      const { data, error } = await supabase
        .from('tasks')
        .insert([insertData])
        .select()
        .single();
  
      if (error) {
        toast({ title: 'Database Error', description: `Failed to add task: ${error.message}`, variant: 'destructive' });
        return null;
      }
  
      const newTask: Task = {
        id: data.id,
        name: data.name,
        description: data.description || '',
        categoryId: data.category_id,
        starValue: data.star_value,
        completed: data.completed,
        completedAt: data.completed_at || undefined,
        familyId: data.family_id,
        templateId: data.template_id || undefined,
        assignedTo: data.assigned_to,
        assignedBy: data.assigned_by,
        dueDate: data.due_date,
      };
  
      setTasks(prev => [...prev, newTask]);
      window.dispatchEvent(new CustomEvent('tasks:changed'));
      return newTask;
    } catch (e: any) {
      toast({ title: 'Error', description: `Failed to add task: ${e?.message || 'Unknown error'}`, variant: 'destructive' });
      return null;
    }
  }, [activeFamilyId, user, templates, toast]);

  const deleteCategory = useCallback(async (categoryId: string) => {
    if (!activeFamilyId) return false;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return false;

    // Prevent deletion of default categories
    if (category.isDefault || category.isHouseChores) {
      toast({
        title: "Cannot Delete",
        description: "Default and house chores categories cannot be deleted.",
        variant: "destructive",
      });
      return false;
    }

    try {
      // Delete all templates in this category first
      const { error: templatesError } = await supabase
        .from('task_templates')
        .delete()
        .eq('category_id', categoryId);

      if (templatesError) {
        console.error('Error deleting templates:', templatesError);
      }

      // Delete only INCOMPLETE tasks in this category
      // Completed tasks are kept for star tracking
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('category_id', categoryId)
        .eq('completed', false);

      if (tasksError) {
        console.error('Error deleting tasks:', tasksError);
      }

      // Delete the category
      const { error } = await supabase
        .from('task_categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to delete category: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Update local state - remove category, templates, and incomplete tasks
      // Keep completed tasks for star tracking
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      setTemplates(prev => prev.filter(t => t.categoryId !== categoryId));
      setTasks(prev => prev.filter(t => !(t.categoryId === categoryId && !t.completed)));
      
      // Emit change event
      window.dispatchEvent(new CustomEvent('tasks:changed'));
      
      toast({
        title: "Success",
        description: "Category deleted. Your earned stars are preserved.",
      });
      
      return true;
    } catch (e: any) {
      toast({
        title: "Error", 
        description: `Failed to delete category: ${e?.message || e}`,
        variant: "destructive",
      });
      return false;
    }
  }, [activeFamilyId, categories, toast]);

  const deleteTemplate = useCallback(async (templateId: string) => {
    if (!activeFamilyId) return false;

    try {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        toast({
          title: "Error",
          description: `Failed to delete template: ${error.message}`,
          variant: "destructive",
        });
        return false;
      }

      // Update local state
      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      // Emit change event
      window.dispatchEvent(new CustomEvent('tasks:changed'));
      
      return true;
    } catch (e: any) {
      toast({
        title: "Error",
        description: `Failed to delete template: ${e?.message || e}`,
        variant: "destructive",
      });
      return false;
    }
  }, [activeFamilyId, toast]);

  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    if (!activeFamilyId) return false;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('family_id', activeFamilyId);

      if (error) throw error;

      // Update local state
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      return true;
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }, [activeFamilyId, toast]);

  const contextValue: TasksContextValue = {
    tasks,
    categories,
    templates,
    loading,
    addTask,
    updateTask,
    deleteTask,
    addCategory,
    deleteCategory,
    deleteTemplate,
    addTemplate,
    addTodayTaskFromTemplate,
    ensureCategoryByName,
    refreshData: loadFamilyTasks,
  };

  return (
    <TasksContext.Provider value={contextValue}>
      {children}
    </TasksContext.Provider>
  );
}

export function useTasks() {
  const context = useContext(TasksContext);
  if (context === undefined) {
    throw new Error('useTasks must be used within a TasksProvider');
  }
  return context;
}