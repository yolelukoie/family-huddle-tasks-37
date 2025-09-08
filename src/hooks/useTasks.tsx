import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './useAuth';
import { useApp } from './useApp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import type { Task, TaskCategory, TaskTemplate } from '@/lib/types';

const MAX_TASKS_PER_FAMILY = 100;
const MAX_CATEGORIES_PER_FAMILY = 20;
const MAX_TEMPLATES_PER_CATEGORY = 50;

export function useTasks() {
  const { user } = useAuth();
  const { activeFamilyId } = useApp();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // Load data from Supabase when family changes
  useEffect(() => {
    if (activeFamilyId) {
      loadFamilyTasks();
    } else {
      setTasks([]);
      setCategories([]);
      setTemplates([]);
    }
  }, [activeFamilyId]);

  const loadFamilyTasks = async () => {
    if (!activeFamilyId) return;
    
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
        }));
        setTasks(convertedTasks);
      }

      if (categoriesRes.error) console.error('Error loading categories:', categoriesRes.error);
      else {
        const convertedCategories: TaskCategory[] = (categoriesRes.data || []).map(c => ({
          id: c.id,
          name: c.name,
          familyId: c.family_id,
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
  };

  const addTask = useCallback(async (task: Omit<Task, 'id' | 'createdAt'>) => {
    if (!activeFamilyId || !user) return null;

    // Check limit
    if (tasks.length >= MAX_TASKS_PER_FAMILY) {
      toast({
        title: "Limit Reached",
        description: `Cannot add more than ${MAX_TASKS_PER_FAMILY} tasks per family.`,
        variant: "destructive",
      });
      return null;
    }

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
          assigned_to: task.assignedTo,
          assigned_by: task.assignedBy,
          due_date: task.dueDate,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding task:', error);
        toast({
          title: "Error",
          description: "Failed to add task. Please try again.",
          variant: "destructive",
        });
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
      return newTask;
    } catch (error) {
      console.error('Failed to add task:', error);
      return null;
    }
  }, [activeFamilyId, user, tasks.length, toast]);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    if (!activeFamilyId) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          completed: updates.completed,
          completed_at: updates.completedAt || null,
        })
        .eq('id', taskId);

      if (error) {
        console.error('Error updating task:', error);
        return;
      }

      setTasks(prev => prev.map(task => 
        task.id === taskId ? { ...task, ...updates } : task
      ));
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  }, [activeFamilyId]);

  const addCategory = useCallback(async (category: Omit<TaskCategory, 'id' | 'createdAt'>) => {
    if (!activeFamilyId) return null;

    // Check limit
    if (categories.length >= MAX_CATEGORIES_PER_FAMILY) {
      toast({
        title: "Limit Reached", 
        description: `Cannot add more than ${MAX_CATEGORIES_PER_FAMILY} categories per family.`,
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('task_categories')
        .insert([{
          name: category.name,
          family_id: activeFamilyId,
          is_default: category.isDefault || false,
          is_house_chores: category.isHouseChores || false,
          order_index: category.order || categories.length,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error adding category:', error);
        toast({
          title: "Error",
          description: "Failed to add category. Please try again.",
          variant: "destructive", 
        });
        return null;
      }

      const newCategory: TaskCategory = {
        id: data.id,
        name: data.name,
        familyId: data.family_id,
        isDefault: data.is_default,
        isHouseChores: data.is_house_chores,
        order: data.order_index,
      };

      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (error) {
      console.error('Failed to add category:', error);
      return null;
    }
  }, [activeFamilyId, categories.length, toast]);

  const addTemplate = useCallback(async (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    if (!activeFamilyId || !user) return null;

    // Check limit per category
    const categoryTemplates = templates.filter(t => t.categoryId === template.categoryId);
    if (categoryTemplates.length >= MAX_TEMPLATES_PER_CATEGORY) {
      toast({
        title: "Limit Reached",
        description: `Cannot add more than ${MAX_TEMPLATES_PER_CATEGORY} templates per category.`,
        variant: "destructive",
      });
      return null;
    }

    try {
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
        console.error('Error adding template:', error);
        toast({
          title: "Error",
          description: "Failed to add template. Please try again.",
          variant: "destructive",
        });
        return null;
      }

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
      return newTemplate;
    } catch (error) {
      console.error('Failed to add template:', error);
      return null;
    }
  }, [activeFamilyId, user, templates, toast]);

  return {
    tasks,
    categories,
    templates,
    loading,
    addTask,
    updateTask,
    addCategory,
    addTemplate,
    refreshData: loadFamilyTasks,
  };
}