import type { User, Family, UserFamily, Task, Goal, ChatMessage, TaskCategory, TaskTemplate } from './types';

// Scoped storage that ensures all data is properly namespaced by userId and familyId
class ScopedStorage {
  private getUserKey(userId: string, key: string): string {
    return `user_${userId}_${key}`;
  }

  private getFamilyKey(userId: string, familyId: string, key: string): string {
    return `user_${userId}_family_${familyId}_${key}`;
  }

  private getGlobalKey(key: string): string {
    return `global_${key}`;
  }

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

  private removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  // Family management (global scope)
  getFamilies(): Family[] {
    return this.getItem<Family[]>(this.getGlobalKey('families')) || [];
  }

  addFamily(family: Family): void {
    const families = this.getFamilies();
    families.push(family);
    this.setItem(this.getGlobalKey('families'), families);
  }

  updateFamily(familyId: string, updates: Partial<Family>): void {
    const families = this.getFamilies();
    const index = families.findIndex(f => f.id === familyId);
    if (index >= 0) {
      families[index] = { ...families[index], ...updates };
      this.setItem(this.getGlobalKey('families'), families);
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

  // User-Family relationships (user scoped)
  getUserFamilies(userId: string): UserFamily[] {
    return this.getItem<UserFamily[]>(this.getUserKey(userId, 'families')) || [];
  }

  getUserFamily(userId: string, familyId: string): UserFamily | null {
    return this.getUserFamilies(userId).find(uf => uf.familyId === familyId) || null;
  }

  addUserFamily(userId: string, userFamily: UserFamily): void {
    const userFamilies = this.getUserFamilies(userId);
    userFamilies.push(userFamily);
    this.setItem(this.getUserKey(userId, 'families'), userFamilies);
  }

  updateUserFamily(userId: string, familyId: string, updates: Partial<UserFamily>): void {
    const userFamilies = this.getUserFamilies(userId);
    const index = userFamilies.findIndex(uf => uf.familyId === familyId);
    if (index >= 0) {
      userFamilies[index] = { ...userFamilies[index], ...updates };
      this.setItem(this.getUserKey(userId, 'families'), userFamilies);
    }
  }

  // Task categories (family scoped)
  getTaskCategories(userId: string, familyId: string): TaskCategory[] {
    return this.getItem<TaskCategory[]>(this.getFamilyKey(userId, familyId, 'categories')) || [];
  }

  addTaskCategory(userId: string, familyId: string, category: TaskCategory): void {
    const categories = this.getTaskCategories(userId, familyId);
    categories.push(category);
    this.setItem(this.getFamilyKey(userId, familyId, 'categories'), categories);
  }

  // Task templates (family scoped)
  getTaskTemplates(userId: string, familyId: string, categoryId?: string): TaskTemplate[] {
    const allTemplates = this.getItem<TaskTemplate[]>(this.getFamilyKey(userId, familyId, 'templates')) || [];
    return categoryId ? allTemplates.filter(t => t.categoryId === categoryId) : allTemplates;
  }

  addTaskTemplate(userId: string, familyId: string, template: TaskTemplate): void {
    const templates = this.getTaskTemplates(userId, familyId);
    templates.push(template);
    this.setItem(this.getFamilyKey(userId, familyId, 'templates'), templates);
  }

  updateTaskTemplate(userId: string, familyId: string, templateId: string, updates: Partial<TaskTemplate>): void {
    const templates = this.getTaskTemplates(userId, familyId);
    const index = templates.findIndex(t => t.id === templateId);
    if (index >= 0) {
      templates[index] = { ...templates[index], ...updates };
      this.setItem(this.getFamilyKey(userId, familyId, 'templates'), templates);
    }
  }

  deleteTaskTemplate(userId: string, familyId: string, templateId: string): void {
    const templates = this.getTaskTemplates(userId, familyId);
    const filtered = templates.filter(t => t.id !== templateId);
    this.setItem(this.getFamilyKey(userId, familyId, 'templates'), filtered);
  }

  // Tasks (family scoped)
  getTasks(userId: string, familyId: string): Task[] {
    return this.getItem<Task[]>(this.getFamilyKey(userId, familyId, 'tasks')) || [];
  }

  addTask(userId: string, familyId: string, task: Task): void {
    const tasks = this.getTasks(userId, familyId);
    tasks.push(task);
    this.setItem(this.getFamilyKey(userId, familyId, 'tasks'), tasks);
  }

  updateTask(userId: string, familyId: string, taskId: string, updates: Partial<Task>): void {
    const tasks = this.getTasks(userId, familyId);
    const index = tasks.findIndex(t => t.id === taskId);
    if (index >= 0) {
      tasks[index] = { ...tasks[index], ...updates };
      this.setItem(this.getFamilyKey(userId, familyId, 'tasks'), tasks);
    }
  }

  // Goals (user + family scoped)
  getGoals(userId: string, familyId: string): Goal[] {
    return this.getItem<Goal[]>(this.getFamilyKey(userId, familyId, 'goals')) || [];
  }

  addGoal(userId: string, familyId: string, goal: Goal): void {
    const goals = this.getGoals(userId, familyId);
    goals.push(goal);
    this.setItem(this.getFamilyKey(userId, familyId, 'goals'), goals);
  }

  updateGoal(userId: string, familyId: string, goalId: string, updates: Partial<Goal>): void {
    const goals = this.getGoals(userId, familyId);
    const index = goals.findIndex(g => g.id === goalId);
    if (index >= 0) {
      goals[index] = { ...goals[index], ...updates };
      this.setItem(this.getFamilyKey(userId, familyId, 'goals'), goals);
    }
  }

  deleteGoal(userId: string, familyId: string, goalId: string): void {
    const goals = this.getGoals(userId, familyId);
    const filtered = goals.filter(g => g.id !== goalId);
    this.setItem(this.getFamilyKey(userId, familyId, 'goals'), filtered);
  }

  // Chat messages (family scoped)
  getMessages(userId: string, familyId: string): ChatMessage[] {
    return this.getItem<ChatMessage[]>(this.getFamilyKey(userId, familyId, 'messages')) || [];
  }

  addMessage(userId: string, familyId: string, message: ChatMessage): void {
    const messages = this.getMessages(userId, familyId);
    messages.push(message);
    this.setItem(this.getFamilyKey(userId, familyId, 'messages'), messages);
  }

  // Badge storage (user + family scoped)
  getSeenBadges(userId: string, familyId: string): string[] {
    return this.getItem<string[]>(this.getFamilyKey(userId, familyId, 'seenBadges')) || [];
  }

  setSeenBadges(userId: string, familyId: string, badgeIds: string[]): void {
    this.setItem(this.getFamilyKey(userId, familyId, 'seenBadges'), badgeIds);
  }

  addSeenBadge(userId: string, familyId: string, badgeId: string): void {
    const seenBadges = this.getSeenBadges(userId, familyId);
    if (!seenBadges.includes(badgeId)) {
      this.setSeenBadges(userId, familyId, [...seenBadges, badgeId]);
    }
  }

  clearSeenBadges(userId: string, familyId: string): void {
    this.setSeenBadges(userId, familyId, []);
  }

  // Reset character data for a specific user/family
  resetCharacterData(userId: string, familyId: string): void {
    // Reset user-family stats
    this.updateUserFamily(userId, familyId, {
      totalStars: 0,
      currentStage: 0,
      seenCelebrations: []
    });

    // Clear seen badges
    this.clearSeenBadges(userId, familyId);

    // Reset tasks and goals (mark completed as incomplete)
    const tasks = this.getTasks(userId, familyId);
    const resetTasks = tasks.map(t => ({ ...t, completed: false, completedAt: undefined }));
    this.setItem(this.getFamilyKey(userId, familyId, 'tasks'), resetTasks);

    const goals = this.getGoals(userId, familyId);
    const resetGoals = goals.map(g => ({ ...g, completed: false, completedAt: undefined }));
    this.setItem(this.getFamilyKey(userId, familyId, 'goals'), resetGoals);
  }

  // Clear all data for a specific user
  clearUserData(userId: string): void {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(`user_${userId}_`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => this.removeItem(key));
  }

  // Development helper - clear all data
  clearAllData(): void {
    localStorage.clear();
  }
}

export const scopedStorage = new ScopedStorage();