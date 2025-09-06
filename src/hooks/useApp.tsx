import { createContext, useContext, useEffect, useState } from 'react';
import type { Family, UserFamily, User } from '@/lib/types';
import { storage } from '@/lib/storage';
import { scopedStorage } from '@/lib/scopedStorage';
import { generateId } from '@/lib/utils';
import { DEFAULT_CATEGORIES, DEFAULT_HOUSE_CHORES } from '@/lib/constants';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

interface AppContextType {
  activeFamilyId: string | null;
  userFamilies: UserFamily[];
  families: Family[];
  isLoading: boolean;
  
  // Family actions
  createFamily: (name: string) => Promise<string>;
  joinFamily: (inviteCode: string) => Promise<Family | null>;
  switchFamily: (familyId: string) => Promise<void>;
  setActiveFamilyId: (familyId: string) => Promise<void>;
  updateFamilyName: (familyId: string, name: string) => Promise<void>;
  
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
      // Load data from Supabase with localStorage fallback
      loadFamilyData();
    } else {
      setFamilies([]);
      setUserFamilies([]);
      setIsLoading(false);
    }
  }, [user, authLoading, updateUser]);

  // Load family data from Supabase with localStorage migration
  const loadFamilyData = async () => {
    if (!user) return;
    
    try {
      // Load user families from Supabase
      const { data: userFamilyData, error: userFamilyError } = await supabase
        .from('user_families')
        .select('*')
        .eq('user_id', user.id);

      if (userFamilyError) {
        console.error('Error loading user families:', userFamilyError);
        await migrateUserData(user.id);
        return;
      }

      // Load families for this user
      const familyIds = userFamilyData.map(uf => uf.family_id);
      
      let familyData = [];
      if (familyIds.length > 0) {
        const { data, error: familyError } = await supabase
          .from('families')
          .select('*')
          .in('id', familyIds);

        if (familyError) {
          console.error('Error loading families:', familyError);
          await migrateUserData(user.id);
          return;
        }
        familyData = data || [];
      }

      // Convert Supabase data to app types
      const convertedUserFamilies: UserFamily[] = userFamilyData.map(uf => ({
        userId: uf.user_id,
        familyId: uf.family_id,
        joinedAt: uf.joined_at,
        totalStars: uf.total_stars,
        currentStage: uf.current_stage,
        lastReadTimestamp: uf.last_read_timestamp,
        seenCelebrations: uf.seen_celebrations,
      }));

      const convertedFamilies: Family[] = familyData.map(f => ({
        id: f.id,
        name: f.name,
        inviteCode: f.invite_code,
        createdBy: f.created_by,
        createdAt: f.created_at,
      }));

      setUserFamilies(convertedUserFamilies);
      setFamilies(convertedFamilies);

      // If user has families but no active family set, set the first one as active
      if (convertedUserFamilies.length > 0 && !user.activeFamilyId) {
        await updateUser({ activeFamilyId: convertedUserFamilies[0].familyId });
      }

      // If no families found in Supabase, try to migrate from localStorage
      if (convertedUserFamilies.length === 0) {
        await migrateUserData(user.id);
      }
      
    } catch (error) {
      console.error('Error in loadFamilyData:', error);
      // Fall back to localStorage migration
      await migrateUserData(user.id);
    }
    
    setIsLoading(false);
  };

  // Migration function to move data from localStorage to Supabase
  const migrateUserData = async (userId: string) => {
    try {
      // Check if migration is needed
      const migrationKey = `migration_completed_${userId}`;
      if (localStorage.getItem(migrationKey)) {
        // Even if migrated, load from localStorage as fallback
        loadFromLocalStorage();
        return;
      }

      console.log('Starting migration from localStorage to Supabase...');

      // Migrate families first
      const scopedFamilies = scopedStorage.getFamilies();
      const existingFamilies = storage.getFamilies();
      const allFamilies = [...scopedFamilies, ...existingFamilies];
      
      for (const family of allFamilies) {
        try {
          await supabase
            .from('families')
            .upsert([{
              id: family.id,
              name: family.name,
              invite_code: family.inviteCode,
              created_by: family.createdBy,
              created_at: family.createdAt,
            }]);
        } catch (error) {
          console.error('Error migrating family:', family.id, error);
        }
      }

      // Migrate user families
      const scopedUserFamilies = scopedStorage.getUserFamilies(userId);
      const existingUserFamilies = storage.getUserFamilies().filter(uf => uf.userId === userId);
      const allUserFamilies = [...scopedUserFamilies, ...existingUserFamilies];
      
      for (const userFamily of allUserFamilies) {
        try {
          await supabase
            .from('user_families')
            .upsert([{
              user_id: userFamily.userId,
              family_id: userFamily.familyId,
              joined_at: userFamily.joinedAt,
              total_stars: userFamily.totalStars,
              current_stage: userFamily.currentStage,
              last_read_timestamp: userFamily.lastReadTimestamp,
              seen_celebrations: userFamily.seenCelebrations,
            }]);
        } catch (error) {
          console.error('Error migrating user family:', userFamily, error);
        }
      }

      // Migrate family-specific data for each family
      for (const userFamily of allUserFamilies) {
        const familyId = userFamily.familyId;
        
        // Migrate task categories
        const scopedCategories = scopedStorage.getTaskCategories(userId, familyId);
        const existingCategories = storage.getTaskCategories(familyId);
        const allCategories = [...scopedCategories, ...existingCategories];
        
        for (const category of allCategories) {
          try {
            await supabase
              .from('task_categories')
              .upsert([{
                id: category.id,
                family_id: category.familyId,
                name: category.name,
                is_default: category.isDefault,
                is_house_chores: category.isHouseChores,
                order_index: category.order,
              }]);
          } catch (error) {
            console.error('Error migrating category:', category.id, error);
          }
        }

        // Migrate task templates
        const scopedTemplates = scopedStorage.getTaskTemplates(userId, familyId);
        const existingTemplates = storage.getTaskTemplates(familyId);
        const allTemplates = [...scopedTemplates, ...existingTemplates];
        
        for (const template of allTemplates) {
          try {
            await supabase
              .from('task_templates')
              .upsert([{
                id: template.id,
                family_id: template.familyId,
                category_id: template.categoryId,
                name: template.name,
                description: template.description,
                star_value: template.starValue,
                is_default: template.isDefault,
                is_deletable: template.isDeletable,
                created_by: template.createdBy,
              }]);
          } catch (error) {
            console.error('Error migrating template:', template.id, error);
          }
        }

        // Migrate tasks
        const scopedTasks = scopedStorage.getTasks(userId, familyId);
        const existingTasks = storage.getTasks(familyId);
        const allTasks = [...scopedTasks, ...existingTasks];
        
        for (const task of allTasks) {
          try {
            await supabase
              .from('tasks')
              .upsert([{
                id: task.id,
                family_id: task.familyId,
                category_id: task.categoryId,
                template_id: task.templateId,
                name: task.name,
                description: task.description,
                star_value: task.starValue,
                assigned_to: task.assignedTo,
                assigned_by: task.assignedBy,
                due_date: task.dueDate,
                completed: task.completed,
                completed_at: task.completedAt,
              }]);
          } catch (error) {
            console.error('Error migrating task:', task.id, error);
          }
        }

        // Migrate goals
        const scopedGoals = scopedStorage.getGoals(userId, familyId);
        const existingGoals = storage.getGoals(familyId, userId);
        const allGoals = [...scopedGoals, ...existingGoals];
        
        for (const goal of allGoals) {
          try {
            await supabase
              .from('goals')
              .upsert([{
                id: goal.id,
                user_id: goal.userId,
                family_id: goal.familyId,
                target_stars: goal.targetStars,
                current_stars: goal.currentStars,
                reward: goal.reward,
                completed: goal.completed,
                completed_at: goal.completedAt,
                target_categories: goal.targetCategories,
              }]);
          } catch (error) {
            console.error('Error migrating goal:', goal.id, error);
          }
        }

        // Migrate chat messages
        const scopedMessages = scopedStorage.getMessages(userId, familyId);
        const existingMessages = storage.getMessages(familyId);
        const allMessages = [...scopedMessages, ...existingMessages];
        
        for (const message of allMessages) {
          try {
            await supabase
              .from('chat_messages')
              .upsert([{
                id: message.id,
                user_id: message.userId,
                family_id: message.familyId,
                content: message.content,
                created_at: message.createdAt,
              }]);
          } catch (error) {
            console.error('Error migrating message:', message.id, error);
          }
        }
      }

      // Mark migration as completed
      localStorage.setItem(migrationKey, 'true');
      console.log(`Migration completed for user ${userId}`);
      
      // Reload data from Supabase
      await loadFamilyData();
      
    } catch (error) {
      console.error('Migration failed:', error);
      // Fall back to localStorage
      loadFromLocalStorage();
    }
  };

  // Load data from localStorage as fallback
  const loadFromLocalStorage = () => {
    if (!user) return;
    
    try {
      const storedFamilies = storage.getFamilies();
      const storedUserFamilies = storage.getUserFamilies().filter(uf => uf.userId === user.id);
      
      setFamilies(storedFamilies);
      setUserFamilies(storedUserFamilies);

      console.log('Loaded data from localStorage as fallback');
    } catch (error) {
      console.error('Error loading from localStorage:', error);
    }
  };


  const createFamily = async (name: string): Promise<string> => {
    if (!user) throw new Error('No user found');

    try {
      // Generate invite code first
      const { data: inviteCodeData, error: inviteError } = await supabase.rpc('generate_invite_code');
      
      if (inviteError) {
        console.error('Error generating invite code:', inviteError);
        throw inviteError;
      }

      // Create family in Supabase
      const { data, error } = await supabase
        .from('families')
        .insert([{
          name,
          invite_code: inviteCodeData,
          created_by: user.id,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating family in Supabase:', error);
        throw error;
      }

      const family: Family = {
        id: data.id,
        name: data.name,
        inviteCode: data.invite_code,
        createdBy: data.created_by,
        createdAt: data.created_at,
      };

      // Create user family relationship in Supabase
      const { error: userFamilyError } = await supabase
        .from('user_families')
        .insert([{
          user_id: user.id,
          family_id: family.id,
        }]);

      if (userFamilyError) {
        console.error('Error creating user family relationship:', userFamilyError);
        throw userFamilyError;
      }

      const userFamily: UserFamily = {
        userId: user.id,
        familyId: family.id,
        joinedAt: new Date().toISOString(),
        totalStars: 0,
        currentStage: 0,
        lastReadTimestamp: Date.now(),
        seenCelebrations: [],
      };

      // Also save to localStorage as backup
      storage.addFamily(family);
      storage.addUserFamily(userFamily);

      // Seed default categories and tasks for new family
      await seedFamilyDefaults(family.id);

      setFamilies(prev => [...prev, family]);
      setUserFamilies(prev => [...prev, userFamily]);

      // Set as active family
      await updateUser({ activeFamilyId: family.id });

      return family.id;
    } catch (error) {
      console.error('Failed to create family:', error);
      throw error;
    }
  };

  const joinFamily = async (inviteCode: string): Promise<Family | null> => {
    if (!user) return null;

    try {
      // Find family by invite code in Supabase
      const { data: family, error } = await supabase
        .from('families')
        .select('*')
        .eq('invite_code', inviteCode)
        .maybeSingle();

      if (error) {
        console.error('Error finding family:', error);
        return null;
      }

      if (!family) return null;

      // Check if user is already in this family
      const existingMembership = userFamilies.find(
        uf => uf.familyId === family.id
      );
      
      if (existingMembership) {
        const convertedFamily: Family = {
          id: family.id,
          name: family.name,
          inviteCode: family.invite_code,
          createdBy: family.created_by,
          createdAt: family.created_at,
        };
        return convertedFamily;
      }

      // Create user family relationship in Supabase
      const { error: userFamilyError } = await supabase
        .from('user_families')
        .insert([{
          user_id: user.id,
          family_id: family.id,
        }]);

      if (userFamilyError) {
        console.error('Error joining family:', userFamilyError);
        return null;
      }

      const convertedFamily: Family = {
        id: family.id,
        name: family.name,
        inviteCode: family.invite_code,
        createdBy: family.created_by,
        createdAt: family.created_at,
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

      // Also save to localStorage as backup
      storage.addFamily(convertedFamily);
      storage.addUserFamily(userFamily);

      setUserFamilies(prev => [...prev, userFamily]);
      setFamilies(prev => [...prev, convertedFamily]);

      // Set as active family
      await updateUser({ activeFamilyId: family.id });

      return convertedFamily;
    } catch (error) {
      console.error('Failed to join family:', error);
      return null;
    }
  };

  const switchFamily = async (familyId: string) => {
    await updateUser({ activeFamilyId: familyId });
  };

  const setActiveFamilyId = async (familyId: string) => {
    await updateUser({ activeFamilyId: familyId });
  };

  const updateFamilyName = async (familyId: string, name: string) => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('families')
        .update({ name })
        .eq('id', familyId);

      if (error) {
        console.error('Error updating family name:', error);
        throw error;
      }

      // Also update localStorage
      storage.updateFamily(familyId, { name });
      setFamilies(prev => prev.map(f => f.id === familyId ? { ...f, name } : f));
    } catch (error) {
      console.error('Failed to update family name:', error);
      throw error;
    }
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

  const seedFamilyDefaults = async (familyId: string) => {
    if (!user) return;
    
    try {
      // Use the Supabase function to seed family defaults
      const { error } = await supabase.rpc('seed_family_defaults', {
        p_family_id: familyId,
        p_creator: user.id
      });

      if (error) {
        console.error('Error seeding family defaults:', error);
        // Fall back to manual seeding
        await seedFamilyDefaultsManually(familyId);
      }
    } catch (error) {
      console.error('Failed to seed family defaults:', error);
      // Fall back to manual seeding
      await seedFamilyDefaultsManually(familyId);
    }
  };

  const seedFamilyDefaultsManually = async (familyId: string) => {
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