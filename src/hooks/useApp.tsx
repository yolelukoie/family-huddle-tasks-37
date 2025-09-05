import { createContext, useContext, useEffect, useState } from 'react';
import type { Family, UserFamily } from '@/lib/types';
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
    
    // Load initial data scoped to authenticated user
    if (user) {
      const storedFamilies = scopedStorage.getFamilies();
      const storedUserFamilies = scopedStorage.getUserFamilies(user.id);
      
      setFamilies(storedFamilies);
      setUserFamilies(storedUserFamilies);
    } else {
      setFamilies([]);
      setUserFamilies([]);
    }
    
    setIsLoading(false);
  }, [user, authLoading]);


  const createFamily = (name: string): string => {
    if (!user) throw new Error('No user found');

    // Allow duplicate family names; uniqueness is ensured by ID and inviteCode
    // (e.g., multiple families can be named the same)

    const family: Family = {
      id: generateId(),
      name,
      inviteCode: scopedStorage.generateUniqueInviteCode(),
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

    scopedStorage.addFamily(family);
    scopedStorage.addUserFamily(user.id, userFamily);

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

    const family = scopedStorage.findFamilyByInviteCode(inviteCode);
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

    scopedStorage.addUserFamily(user.id, userFamily);
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
    const existingFamily = scopedStorage.findFamilyByName(name);
    if (existingFamily && existingFamily.id !== familyId) {
      throw new Error('A family with this name already exists');
    }

    scopedStorage.updateFamily(familyId, { name });
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
    scopedStorage.updateUserFamily(user.id, familyId, { totalStars: newTotal });
    
    setUserFamilies(prev => prev.map(uf => 
      uf.familyId === familyId 
        ? { ...uf, totalStars: newTotal }
        : uf
    ));
  };

  const resetCharacterProgress = (familyId: string) => {
    if (!user) return;
    
    scopedStorage.resetCharacterData(user.id, familyId);
    
    setUserFamilies(prev => prev.map(uf => 
      uf.familyId === familyId 
        ? { ...uf, totalStars: 0, currentStage: 0, seenCelebrations: [] }
        : uf
    ));
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
      scopedStorage.addTaskCategory(user.id, familyId, category);

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
          scopedStorage.addTaskTemplate(user.id, familyId, template);
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