import { createContext, useContext, useEffect, useState } from 'react';
import type { Family, UserFamily, User } from '@/lib/types';
import { storage } from '@/lib/storage';
import { scopedStorage } from '@/lib/scopedStorage';
import { generateId } from '@/lib/utils';
import { DEFAULT_CATEGORIES, DEFAULT_HOUSE_CHORES } from '@/lib/constants';
import { useAuth } from './useAuth';

interface AppContextType {
  activeFamilyId: string | null;
  userFamilies: UserFamily[];
  families: Family[];
  isLoading: boolean;
  
  // Family actions
  createFamily: (name: string) => string;
  joinFamily: (inviteCode: string) => Family | null;
  switchFamily: (familyId: string) => void;
  setActiveFamilyId: (familyId: string) => void;
  updateFamilyName: (familyId: string, name: string) => void;
  
  // Utility
  getUserFamily: (familyId: string) => UserFamily | null;
  getFamilyMembers: (familyId: string) => UserFamily[];
  getUserProfile: (userId: string) => User | null;
  getTotalStars: (familyId: string) => number;
  addStars: (familyId: string, stars: number) => void;
  resetCharacterProgress: (familyId: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUser, isLoading: authLoading } = useAuth();
  const [userFamilies, setUserFamilies] = useState<UserFamily[]>([]);
  const [families, setFamilies] = useState<Family[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeFamilyId = user?.activeFamilyId || null;

  useEffect(() => {
    if (authLoading) return;
    
    if (user) {
      // Migrate data from scopedStorage to storage if needed
      migrateUserData(user.id);
      
      // Load data using storage
      const storedFamilies = storage.getFamilies();
      const storedUserFamilies = storage.getUserFamilies().filter(uf => uf.userId === user.id);
      
      setFamilies(storedFamilies);
      setUserFamilies(storedUserFamilies);

      // If user has families but no active family set, set the first one as active
      if (storedUserFamilies.length > 0 && !user.activeFamilyId) {
        updateUser({ activeFamilyId: storedUserFamilies[0].familyId });
      }
    } else {
      setFamilies([]);
      setUserFamilies([]);
    }
    
    setIsLoading(false);
  }, [user, authLoading, updateUser]);

  // Migration function to move data from scopedStorage to storage
  const migrateUserData = (userId: string) => {
    try {
      // Check if migration is needed
      const migrationKey = `migration_completed_${userId}`;
      if (localStorage.getItem(migrationKey)) {
        return; // Already migrated
      }

      // Migrate families
      const scopedFamilies = scopedStorage.getFamilies();
      const existingFamilies = storage.getFamilies();
      
      scopedFamilies.forEach(family => {
        const exists = existingFamilies.find(f => f.id === family.id);
        if (!exists) {
          storage.addFamily(family);
        }
      });

      // Migrate user families
      const scopedUserFamilies = scopedStorage.getUserFamilies(userId);
      const existingUserFamilies = storage.getUserFamilies();
      
      scopedUserFamilies.forEach(userFamily => {
        const exists = existingUserFamilies.find(uf => 
          uf.userId === userFamily.userId && uf.familyId === userFamily.familyId
        );
        if (!exists) {
          storage.addUserFamily(userFamily);
        }
      });

      // Migrate family-specific data for each family
      scopedUserFamilies.forEach(userFamily => {
        const familyId = userFamily.familyId;
        
        // Migrate task categories
        const scopedCategories = scopedStorage.getTaskCategories(userId, familyId);
        const existingCategories = storage.getTaskCategories(familyId);
        
        scopedCategories.forEach(category => {
          const exists = existingCategories.find(c => c.id === category.id);
          if (!exists) {
            storage.addTaskCategory(category);
          }
        });

        // Migrate task templates
        const scopedTemplates = scopedStorage.getTaskTemplates(userId, familyId);
        const existingTemplates = storage.getTaskTemplates(familyId);
        
        scopedTemplates.forEach(template => {
          const exists = existingTemplates.find(t => t.id === template.id);
          if (!exists) {
            storage.addTaskTemplate(template);
          }
        });

        // Migrate tasks
        const scopedTasks = scopedStorage.getTasks(userId, familyId);
        const existingTasks = storage.getTasks(familyId);
        
        scopedTasks.forEach(task => {
          const exists = existingTasks.find(t => t.id === task.id);
          if (!exists) {
            storage.addTask(task);
          }
        });

        // Migrate goals
        const scopedGoals = scopedStorage.getGoals(userId, familyId);
        const existingGoals = storage.getGoals(familyId, userId);
        
        scopedGoals.forEach(goal => {
          const exists = existingGoals.find(g => g.id === goal.id);
          if (!exists) {
            storage.addGoal(goal);
          }
        });

        // Migrate chat messages
        const scopedMessages = scopedStorage.getMessages(userId, familyId);
        const existingMessages = storage.getMessages(familyId);
        
        scopedMessages.forEach(message => {
          const exists = existingMessages.find(m => m.id === message.id);
          if (!exists) {
            storage.addMessage(message);
          }
        });
      });

      // Mark migration as completed
      localStorage.setItem(migrationKey, 'true');
      console.log(`Migration completed for user ${userId}`);
    } catch (error) {
      console.error('Migration failed:', error);
    }
  };


  const createFamily = (name: string): string => {
    if (!user) throw new Error('No user found');

    const family: Family = {
      id: generateId(),
      name,
      inviteCode: storage.generateUniqueInviteCode(),
      createdBy: user.id,
      createdAt: new Date().toISOString(),
    };

    const userFamily: UserFamily = {
      userId: user.id,
      familyId: family.id,
      joinedAt: new Date().toISOString(),
      totalStars: 0,
      currentStage: 0,
      lastReadTimestamp: Date.now(),
      seenCelebrations: [],
    };

    storage.addFamily(family);
    storage.addUserFamily(userFamily);

    // Seed default categories and tasks for new family
    seedFamilyDefaults(family.id);

    setFamilies(prev => [...prev, family]);
    setUserFamilies(prev => [...prev, userFamily]);

    // Set as active family
    updateUser({ activeFamilyId: family.id });

    return family.id;
  };

  const joinFamily = (inviteCode: string): Family | null => {
    if (!user) return null;

    const family = storage.findFamilyByInviteCode(inviteCode);
    if (!family) return null;

    // Check if user is already in this family
    const existingMembership = userFamilies.find(
      uf => uf.familyId === family.id
    );
    if (existingMembership) return family;

    const userFamily: UserFamily = {
      userId: user.id,
      familyId: family.id,
      joinedAt: new Date().toISOString(),
      totalStars: 0,
      currentStage: 0,
      lastReadTimestamp: Date.now(),
      seenCelebrations: [],
    };

    storage.addUserFamily(userFamily);
    setUserFamilies(prev => [...prev, userFamily]);

    // Set as active family
    updateUser({ activeFamilyId: family.id });

    return family;
  };

  const switchFamily = (familyId: string) => {
    updateUser({ activeFamilyId: familyId });
  };

  const setActiveFamilyId = (familyId: string) => {
    updateUser({ activeFamilyId: familyId });
  };

  const updateFamilyName = (familyId: string, name: string) => {
    // Check if another family already has this name
    const existingFamily = storage.findFamilyByName(name);
    if (existingFamily && existingFamily.id !== familyId) {
      throw new Error('A family with this name already exists');
    }

    storage.updateFamily(familyId, { name });
    setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, name } : f));
  };

  const getUserFamily = (familyId: string): UserFamily | null => {
    if (!user) return null;
    return userFamilies.find(uf => uf.familyId === familyId) || null;
  };

  const getFamilyMembers = (familyId: string): UserFamily[] => {
    // In a single-user context, this just returns the current user's family relationship
    const userFamily = getUserFamily(familyId);
    return userFamily ? [userFamily] : [];
  };

  const getTotalStars = (familyId: string): number => {
    const userFamily = getUserFamily(familyId);
    return userFamily?.totalStars || 0;
  };

  const addStars = (familyId: string, stars: number) => {
    if (!user) return;
    
    const currentUserFamily = getUserFamily(familyId);
    if (!currentUserFamily) return;

    const newTotal = currentUserFamily.totalStars + stars;
    storage.updateUserFamily(user.id, familyId, { totalStars: newTotal });
    
    setUserFamilies(prev => prev.map(uf => 
      uf.familyId === familyId 
        ? { ...uf, totalStars: newTotal }
        : uf
    ));
  };

  const resetCharacterProgress = (familyId: string) => {
    if (!user) return;
    
    storage.resetCharacterData(user.id, familyId);
    
    setUserFamilies(prev => prev.map(uf => 
      uf.familyId === familyId 
        ? { ...uf, totalStars: 0, currentStage: 0, seenCelebrations: [] }
        : uf
    ));
  };

  const getUserProfile = (userId: string): User | null => {
    return storage.getUserProfile(userId);
  };

  const seedFamilyDefaults = (familyId: string) => {
    if (!user) return;
    
    // Create default categories
    DEFAULT_CATEGORIES.forEach(categoryData => {
      const category = {
        id: generateId(),
        familyId,
        name: categoryData.name,
        isDefault: true,
        isHouseChores: categoryData.isHouseChores,
        order: categoryData.order,
      };
      storage.addTaskCategory(category);

      // Add default tasks for House Chores category
      if (categoryData.isHouseChores) {
        DEFAULT_HOUSE_CHORES.forEach(taskData => {
          const template = {
            id: generateId(),
            categoryId: category.id,
            familyId,
            name: taskData.name,
            starValue: taskData.starValue,
            isDefault: true,
            isDeletable: false,
            createdBy: user.id,
          };
          storage.addTaskTemplate(template);
        });
      }
    });
  };

  return (
    <AppContext.Provider value={{
      activeFamilyId,
      userFamilies,
      families,
      isLoading,
      createFamily,
      joinFamily,
      switchFamily,
      setActiveFamilyId,
      updateFamilyName,
      getUserFamily,
      getFamilyMembers,
      getUserProfile,
      getTotalStars,
      addStars,
      resetCharacterProgress,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}