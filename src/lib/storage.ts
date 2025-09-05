import type { User, Family, UserFamily, Task, Goal, ChatMessage, TaskCategory, TaskTemplate } from './types';

// Simple localStorage-based data store with per-family scoping
class LocalStorage {
  private getItem<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }

  private setItem<T>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // User management
  getUser(): User | null {
    return this.getItem<User>('user');
  }

  setUser(user: User): void {
    this.setItem('user', user);
  }

  // Family management
  getFamilies(): Family[] {
    return this.getItem<Family[]>('families') || [];
  }

  addFamily(family: Family): void {
    const families = this.getFamilies();
    families.push(family);
    this.setItem('families', families);
  }

  updateFamily(familyId: string, updates: Partial<Family>): void {
    const families = this.getFamilies();
    const index = families.findIndex(f => f.id === familyId);
    if (index >= 0) {
      families[index] = { ...families[index], ...updates };
      this.setItem('families', families);
    }
  }

  findFamilyByInviteCode(inviteCode: string): Family | null {
    return this.getFamilies().find(f => f.inviteCode === inviteCode) || null;
  }

  findFamilyByName(name: string): Family | null {
    return this.getFamilies().find(f => f.name.toLowerCase() === name.toLowerCase()) || null;
  }

  generateUniqueInviteCode(): string {
    let inviteCode: string;
    do {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.findFamilyByInviteCode(inviteCode));
    return inviteCode;
  }

  // User-Family relationships
  getUserFamilies(): UserFamily[] {
    return this.getItem<UserFamily[]>('userFamilies') || [];
  }

  getUserFamily(userId: string, familyId: string): UserFamily | null {
    return this.getUserFamilies().find(uf => uf.userId === userId && uf.familyId === familyId) || null;
  }

  addUserFamily(userFamily: UserFamily): void {
    const userFamilies = this.getUserFamilies();
    userFamilies.push(userFamily);
    this.setItem('userFamilies', userFamilies);
  }

  updateUserFamily(userId: string, familyId: string, updates: Partial<UserFamily>): void {
    const userFamilies = this.getUserFamilies();
    const index = userFamilies.findIndex(uf => uf.userId === userId && uf.familyId === familyId);
    if (index >= 0) {
      userFamilies[index] = { ...userFamilies[index], ...updates };
      this.setItem('userFamilies', userFamilies);
    }
  }

  // Task categories
  getTaskCategories(familyId: string): TaskCategory[] {
    const allCategories = this.getItem<TaskCategory[]>('taskCategories') || [];
    return allCategories.filter(c => c.familyId === familyId);
  }

  addTaskCategory(category: TaskCategory): void {
    const categories = this.getItem<TaskCategory[]>('taskCategories') || [];
    categories.push(category);
    this.setItem('taskCategories', categories);
  }

  deleteTaskCategory(categoryId: string): void {
    // Remove the category
    const categories = this.getItem<TaskCategory[]>('taskCategories') || [];
    const filteredCategories = categories.filter(c => c.id !== categoryId);
    this.setItem('taskCategories', filteredCategories);

    // Remove all task templates in this category
    const templates = this.getItem<TaskTemplate[]>('taskTemplates') || [];
    const filteredTemplates = templates.filter(t => t.categoryId !== categoryId);
    this.setItem('taskTemplates', filteredTemplates);

    // Remove all tasks in this category
    const tasks = this.getItem<Task[]>('tasks') || [];
    const filteredTasks = tasks.filter(t => t.categoryId !== categoryId);
    this.setItem('tasks', filteredTasks);
  }

  // Task templates
  getTaskTemplates(familyId: string, categoryId?: string): TaskTemplate[] {
    const allTemplates = this.getItem<TaskTemplate[]>('taskTemplates') || [];
    return allTemplates.filter(t => 
      t.familyId === familyId && 
      (!categoryId || t.categoryId === categoryId)
    );
  }

  addTaskTemplate(template: TaskTemplate): void {
    const templates = this.getItem<TaskTemplate[]>('taskTemplates') || [];
    templates.push(template);
    this.setItem('taskTemplates', templates);
  }

  updateTaskTemplate(templateId: string, updates: Partial<TaskTemplate>): void {
    const templates = this.getItem<TaskTemplate[]>('taskTemplates') || [];
    const index = templates.findIndex(t => t.id === templateId);
    if (index >= 0) {
      templates[index] = { ...templates[index], ...updates };
      this.setItem('taskTemplates', templates);
    }
  }

  deleteTaskTemplate(templateId: string): void {
    const templates = this.getItem<TaskTemplate[]>('taskTemplates') || [];
    const filtered = templates.filter(t => t.id !== templateId);
    this.setItem('taskTemplates', filtered);
  }

  // Tasks
  getTasks(familyId: string): Task[] {
    const allTasks = this.getItem<Task[]>('tasks') || [];
    return allTasks.filter(t => t.familyId === familyId);
  }

  addTask(task: Task): void {
    const tasks = this.getItem<Task[]>('tasks') || [];
    tasks.push(task);
    this.setItem('tasks', tasks);
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const tasks = this.getItem<Task[]>('tasks') || [];
    const index = tasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...updates };
      this.setItem('tasks', tasks);
    }
  }

  // Goals
  getGoals(familyId: string, userId?: string): Goal[] {
    const allGoals = this.getItem<Goal[]>('goals') || [];
    return allGoals.filter(g => 
      g.familyId === familyId && 
      (!userId || g.userId === userId)
    );
  }

  addGoal(goal: Goal): void {
    const goals = this.getItem<Goal[]>('goals') || [];
    goals.push(goal);
    this.setItem('goals', goals);
  }

  updateGoal(goalId: string, updates: Partial<Goal>): void {
    const goals = this.getItem<Goal[]>('goals') || [];
    const index = goals.findIndex(g => g.id === goalId);
    if (index >= 0) {
      goals[index] = { ...goals[index], ...updates };
      this.setItem('goals', goals);
    }
  }

  deleteGoal(goalId: string): void {
    const goals = this.getItem<Goal[]>('goals') || [];
    const filtered = goals.filter(g => g.id !== goalId);
    this.setItem('goals', filtered);
  }

  // Chat messages
  getMessages(familyId: string): ChatMessage[] {
    const allMessages = this.getItem<ChatMessage[]>('messages') || [];
    return allMessages.filter(m => m.familyId === familyId);
  }

  addMessage(message: ChatMessage): void {
    const messages = this.getItem<ChatMessage[]>('messages') || [];
    messages.push(message);
    this.setItem('messages', messages);
  }

  // Public badge storage methods
  getSeenBadges(familyId: string, userId: string): string[] {
    return this.getItem(`seenBadges_${familyId}_${userId}`) || [];
  }

  setSeenBadges(familyId: string, userId: string, badgeIds: string[]): void {
    this.setItem(`seenBadges_${familyId}_${userId}`, badgeIds);
  }

  addSeenBadge(familyId: string, userId: string, badgeId: string): void {
    const seenBadges = this.getSeenBadges(familyId, userId);
    if (!seenBadges.includes(badgeId)) {
      this.setSeenBadges(familyId, userId, [...seenBadges, badgeId]);
    }
  }

  clearSeenBadges(familyId: string, userId: string): void {
    this.setSeenBadges(familyId, userId, []);
  }

  // Clear all data and reset to single account
  clearAllData(): void {
    localStorage.clear();
  }

  // Reset character data for a specific family
  resetCharacterData(userId: string, familyId: string): void {
    // Reset user-family stats
    this.updateUserFamily(userId, familyId, {
      totalStars: 0,
      currentStage: 0,
      seenCelebrations: []
    });

    // Clear seen badges
    this.clearSeenBadges(familyId, userId);

    // Mark completed tasks as history but keep current tasks
    const tasks = this.getTasks(familyId);
    const completedTasks = tasks.filter(t => t.completed && t.assignedTo === userId);
    const currentTasks = tasks.filter(t => !t.completed || t.assignedTo !== userId);
    this.setItem('tasks', [...currentTasks, ...completedTasks.map(t => ({ ...t, completed: false, completedAt: undefined }))]);

    // Mark completed goals as history but keep active goals
    const goals = this.getGoals(familyId, userId);
    const activeGoals = goals.filter(g => !g.completed);
    const completedGoals = goals.filter(g => g.completed);
    this.setItem('goals', [...this.getItem<Goal[]>('goals')?.filter(g => g.familyId !== familyId || g.userId !== userId) || [], ...activeGoals]);
  }
}

export const storage = new LocalStorage();
