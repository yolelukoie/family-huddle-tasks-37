import type { Task } from '@/lib/types';

/**
 * Maps a raw Supabase tasks row (snake_case) to the app-level Task type (camelCase).
 * Accepts optional overrides for fields that differ from the DB row (e.g. familyId from context).
 */
export function taskFromRow(
  row: {
    id: string;
    name: string;
    description?: string | null;
    category_id: string;
    star_value: number;
    completed: boolean;
    completed_at?: string | null;
    family_id: string;
    template_id?: string | null;
    assigned_to: string;
    assigned_by: string;
    due_date: string;
    status?: string | null;
  },
  overrides?: Partial<Task>
): Task {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    categoryId: row.category_id,
    starValue: row.star_value,
    completed: row.completed,
    completedAt: row.completed_at || undefined,
    familyId: row.family_id,
    templateId: row.template_id || undefined,
    assignedTo: row.assigned_to,
    assignedBy: row.assigned_by,
    dueDate: row.due_date,
    status: (row.status as Task['status']) || 'active',
    ...overrides,
  };
}
