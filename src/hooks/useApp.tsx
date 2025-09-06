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

      // Migrate families first - create new families instead of using old IDs
      const scopedFamilies = scopedStorage.getFamilies();
      const existingFamilies = storage.getFamilies();
      const allFamilies = [...scopedFamilies, ...existingFamilies];
      
      const familyIdMapping: { [oldId: string]: string } = {};
      
      for (const family of allFamilies) {
        try {
          // Only migrate families created by this user
          if (family.createdBy === userId) {
            // Generate a new invite code for migrated family
            const { data: inviteCodeData, error: inviteError } = await supabase.rpc('generate_invite_code');
            
            if (inviteError) {
              console.error('Error generating invite code for migration:', inviteError);
              continue;
            }

            const { data, error } = await supabase
              .from('families')
              .insert([{
                name: family.name,
                invite_code: inviteCodeData,
                created_by: userId,
              }])
              .select('id, invite_code')
              .single();

            if (!error && data) {
              familyIdMapping[family.id] = data.id;
              console.log(`Migrated family ${family.name} with new ID: ${data.id}`);
            } else if (error.code !== '23505') { // Ignore duplicate key errors
              console.error('Error migrating family:', family.id, error);
            }
          }
        } catch (error) {
          console.error('Error migrating family:', family.id, error);
        }
      }

      // Migrate user families with new family IDs
      const scopedUserFamilies = scopedStorage.getUserFamilies(userId);
      const existingUserFamilies = storage.getUserFamilies().filter(uf => uf.userId === userId);
      const allUserFamilies = [...scopedUserFamilies, ...existingUserFamilies];
      
      for (const userFamily of allUserFamilies) {
        try {
          // Use new family ID if available, otherwise skip
          const newFamilyId = familyIdMapping[userFamily.familyId];
          if (newFamilyId) {
            await supabase
              .from('user_families')
              .insert([{
                user_id: userId,
                family_id: newFamilyId,
                total_stars: userFamily.totalStars,
                current_stage: userFamily.currentStage,
                last_read_timestamp: userFamily.lastReadTimestamp,
                seen_celebrations: userFamily.seenCelebrations,
              }]);
          }
        } catch (error) {
          if (error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error migrating user family:', userFamily, error);
          }
        }
      }

      // Mark migration as completed
      localStorage.setItem(migrationKey, 'true');
      console.log('Migration completed successfully');
      
      // Reload data from Supabase
      await loadFamilyData();
      
    } catch (error) {
      console.error('Migration failed:', error);
      // Fall back to localStorage data
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

      // Create family with generated invite code
      const { data, error } = await supabase
        .from('families')
        .insert([{
          name,
          invite_code: inviteCodeData,
          created_by: user.id,
        }])
        .select('id, invite_code')
        .single();

      if (error) {
        console.error('Error creating family in Supabase:', error);
        throw error;
      }

      const family: Family = {
        id: data.id,
        name: name,
        inviteCode: data.invite_code,
        createdBy: user.id,
        createdAt: new Date().toISOString(),
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
        currentStage: 1,
        lastReadTimestamp: Date.now(),
        seenCelebrations: [],
      };

      // Also save to localStorage as backup
      storage.addFamily(family);
      storage.addUserFamily(userFamily);

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
        currentStage: 1,
        lastReadTimestamp: Date.now(),
        seenCelebrations: [],
      };

      // Also save to localStorage as backup
      storage.addFamily(convertedFamily);
      storage.addUserFamily(userFamily);

      setFamilies(prev => [...prev, convertedFamily]);
      setUserFamilies(prev => [...prev, userFamily]);

      // Set as active family
      await updateUser({ activeFamilyId: family.id });

      return convertedFamily;
    } catch (error) {
      console.error('Failed to join family:', error);
      return null;
    }
  };

  const switchFamily = async (familyId: string): Promise<void> => {
    await updateUser({ activeFamilyId: familyId });
  };

  const setActiveFamilyId = async (familyId: string): Promise<void> => {
    await updateUser({ activeFamilyId: familyId });
  };

  const updateFamilyName = async (familyId: string, name: string): Promise<void> => {
    try {
      // Update in Supabase
      const { error } = await supabase
        .from('families')
        .update({ name })
        .eq('id', familyId);

      if (error) {
        console.error('Error updating family name in Supabase:', error);
        throw error;
      }

      // Update local state
      setFamilies(prev => prev.map(f => 
        f.id === familyId ? { ...f, name } : f
      ));

      // Also update localStorage as backup
      storage.updateFamily(familyId, { name });
    } catch (error) {
      console.error('Failed to update family name:', error);
      throw error;
    }
  };

  const getUserFamily = (familyId: string): UserFamily | null => {
    return userFamilies.find(uf => uf.familyId === familyId) || null;
  };

  const getFamilyMembers = (familyId: string): UserFamily[] => {
    // For now, return all user families for this family
    // In the future, we might need to query all users in the family
    return userFamilies.filter(uf => uf.familyId === familyId);
  };

  const getUserProfile = (userId: string): User | null => {
    // This would need to be implemented to fetch user profiles
    // For now, return null as this functionality isn't fully implemented
    return null;
  };

  const getTotalStars = (familyId: string): number => {
    const userFamily = getUserFamily(familyId);
    return userFamily?.totalStars || 0;
  };

  const addStars = (familyId: string, stars: number): void => {
    const userFamily = getUserFamily(familyId);
    if (userFamily) {
      const updatedUserFamily = {
        ...userFamily,
        totalStars: userFamily.totalStars + stars
      };
      
      setUserFamilies(prev => prev.map(uf => 
        uf.familyId === familyId && uf.userId === user?.id 
          ? updatedUserFamily 
          : uf
      ));
      
      // Also update localStorage
      storage.updateUserFamily(user?.id || '', familyId, updatedUserFamily);
    }
  };

  const resetCharacterProgress = (familyId: string): void => {
    const userFamily = getUserFamily(familyId);
    if (userFamily) {
      const updatedUserFamily = {
        ...userFamily,
        totalStars: 0,
        currentStage: 1
      };
      
      setUserFamilies(prev => prev.map(uf => 
        uf.familyId === familyId && uf.userId === user?.id 
          ? updatedUserFamily 
          : uf
      ));
      
      // Also update localStorage
      storage.updateUserFamily(user?.id || '', familyId, updatedUserFamily);
    }
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