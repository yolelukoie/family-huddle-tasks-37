export interface User {
  id: string;
  displayName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  age: number;
  profileComplete: boolean;
  activeFamilyId?: string;
  avatar_url?: string;
}

export interface Family {
  id: string;
  name: string;
  inviteCode: string;
  createdBy: string;
  createdAt: string;
}

export interface UserFamily {
  userId: string;
  familyId: string;
  joinedAt: string;
  totalStars: number;
  currentStage: number;
  lastReadTimestamp: number;
  lastReadAt?: string;
  seenCelebrations: string[];
}

export interface TaskCategory {
  id: string;
  familyId: string;
  name: string;
  isDefault: boolean;
  isHouseChores: boolean;
  order: number;
}

export interface TaskTemplate {
  id: string;
  categoryId: string;
  familyId: string;
  name: string;
  description?: string;
  starValue: number;
  isDefault: boolean;
  isDeletable: boolean;
  createdBy: string;
}

export interface Task {
  id: string;
  familyId: string;
  templateId?: string;
  name: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: string;
  starValue: number;
  completed: boolean;
  completedAt?: string;
  categoryId: string;
}

export interface Goal {
  id: string;
  familyId: string;
  userId: string;
  targetStars: number;
  targetCategories?: string[];
  reward?: string;
  currentStars: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  familyId: string;
  userId: string;
  userDisplayName: string;
  content: string;
  timestamp: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  imagePath: string;
  unlockStars: number;
}

export interface UserBadge {
  userId: string;
  familyId: string;
  badgeId: string;
  unlockedAt: string;
  seen: boolean;
}

export interface CharacterStage {
  stage: number;
  requiredStars: number;
  name: string;
}

export interface CelebrationEvent {
  type: 'stage' | 'badge' | 'goal' | 'milestone';
  userId: string;
  familyId: string;
  eventId: string;
  seen: boolean;
  timestamp: string;
}