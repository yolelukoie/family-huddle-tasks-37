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
  quitFamily: (familyId: string) => Promise<boolean>;
  removeFamilyMember: (familyId: string, userId: string) => Promise<boolean>;
  
  // Utility
  getUserFamily: (familyId: string) => UserFamily | null;
  getFamilyMembers: (familyId: string) => UserFamily[];
  getUserProfile: (userId: string) => User | null;
  getTotalStars: (familyId: string) => number;
  addStars: (familyId: string, stars: number) => void;
  applyStarsDelta: (familyId: string, delta: number) => Promise<boolean>;
  resetCharacterProgress: (familyId: string) => Promise<void>;
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

  // Hydrate data when active family changes
  useEffect(() => {
    if (user && activeFamilyId) {
      hydrateActiveFamily();
    }
  }, [activeFamilyId]);

  // Wire fetchFamilyMembers() to run whenever the active family is set/changes
  useEffect(() => {
    if (!activeFamilyId) return;
    fetchFamilyMembers(activeFamilyId);
  }, [activeFamilyId]);

  // Optional realtime refresh for family members
  useEffect(() => {
    if (!activeFamilyId) return;
    const ch = supabase
      .channel(`family-members-${activeFamilyId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_families',
        filter: `family_id=eq.${activeFamilyId}`
      }, () => fetchFamilyMembers(activeFamilyId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeFamilyId]);

  // Add focus/visibility refetch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && activeFamilyId) {
        hydrateActiveFamily();
      }
    };

    const handleFocus = () => {
      if (user && activeFamilyId) {
        hydrateActiveFamily();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user, activeFamilyId]);

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
      // Create family - invite code will be auto-generated by database
      const { data, error } = await supabase
        .from('families')
        .insert([{
          name,
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
    if (!user) {
      console.error('useApp: Cannot join family - no authenticated user');
      return null;
    }

    console.log(`useApp: Attempting to join family with invite code: ${inviteCode}`);

    try {
      // Use RPC function to safely join family by invite code
      const { data: familyData, error } = await supabase
        .rpc('join_family_by_code', { p_invite_code: inviteCode });

      console.log('useApp: RPC join_family_by_code response:', { familyData, error });

      if (error) {
        console.error('useApp: Error calling join_family_by_code RPC:', error);
        return null;
      }

      if (!familyData || familyData.length === 0) {
        console.warn('useApp: No family found with invite code:', inviteCode);
        return null;
      }

      const family = familyData[0];
      console.log('useApp: Family data received from RPC:', family);

      // Insert the membership row (the RPC may have already done this, but ensure it exists)
      const { error: ufErr } = await supabase
        .from('user_families')
        .insert([{ user_id: user.id, family_id: family.id }])
        .select()
        .single();
      
      // Ignore "duplicate key" if you retry
      if (ufErr && ufErr.code !== '23505') {
        console.error('Failed to insert user_families row on join:', ufErr);
        return null;
      }

      const convertedFamily: Family = {
        id: family.id,
        name: family.name,
        inviteCode: family.invite_code,
        createdBy: family.created_by,
        createdAt: family.created_at,
      };

      console.log('useApp: Converted family object:', convertedFamily);

      const userFamily: UserFamily = {
        userId: user.id,
        familyId: family.id,
        joinedAt: new Date().toISOString(),
        totalStars: 0,
        currentStage: 1,
        lastReadTimestamp: Date.now(),
        seenCelebrations: [],
      };

      console.log('useApp: Created user family relationship:', userFamily);

      // Also save to localStorage as backup
      storage.addFamily(convertedFamily);
      storage.addUserFamily(userFamily);
      console.log('useApp: Saved to localStorage');

      setFamilies(prev => {
        const exists = prev.some(f => f.id === convertedFamily.id);
        if (exists) {
          console.log('useApp: Family already exists in state');
          return prev;
        }
        console.log('useApp: Adding family to state');
        return [...prev, convertedFamily];
      });

      setUserFamilies(prev => {
        const exists = prev.some(uf => uf.familyId === convertedFamily.id && uf.userId === user.id);
        if (exists) {
          console.log('useApp: User-family relationship already exists in state');
          return prev;
        }
        console.log('useApp: Adding user-family relationship to state');
        return [...prev, userFamily];
      });

      // Set as active family
      console.log('useApp: Setting active family to:', family.id);
      await updateUser({ activeFamilyId: family.id });

      console.log('useApp: Successfully completed joinFamily process');
      return convertedFamily;
    } catch (error) {
      console.error('useApp: Exception in joinFamily:', error);
      return null;
    }
  };

  const hydrateActiveFamily = async () => {
    if (!user || !activeFamilyId) return;

    try {
      // Refresh user family data for active family
      const { data: userFamilyData, error } = await supabase
        .from('user_families')
        .select('*')
        .eq('user_id', user.id)
        .eq('family_id', activeFamilyId)
        .single();

      if (!error && userFamilyData) {
        const updatedUserFamily: UserFamily = {
          userId: userFamilyData.user_id,
          familyId: userFamilyData.family_id,
          joinedAt: userFamilyData.joined_at,
          totalStars: userFamilyData.total_stars,
          currentStage: userFamilyData.current_stage,
          lastReadTimestamp: userFamilyData.last_read_timestamp,
          seenCelebrations: userFamilyData.seen_celebrations,
        };

        // Upsert user family - update if exists, add if not
        setUserFamilies(prev => {
          const existingIndex = prev.findIndex(uf => 
            uf.familyId === activeFamilyId && uf.userId === user.id
          );
          
          if (existingIndex >= 0) {
            // Update existing
            return prev.map((uf, index) => 
              index === existingIndex ? updatedUserFamily : uf
            );
          } else {
            // Add new
            return [...prev, updatedUserFamily];
          }
        });
      }
    } catch (error) {
      console.error('Error hydrating active family:', error);
    }
  };

  const switchFamily = async (familyId: string): Promise<void> => {
    await updateUser({ activeFamilyId: familyId });
    await hydrateActiveFamily(); // immediate re-hydration
    window.dispatchEvent(new CustomEvent('tasks:changed')); // TasksProvider will reload
    window.dispatchEvent(new CustomEvent('badges:changed')); // badges hook will reload
  };

  const setActiveFamilyId = async (familyId: string): Promise<void> => {
    await updateUser({ activeFamilyId: familyId });
    await hydrateActiveFamily(); // immediate re-hydration
    window.dispatchEvent(new CustomEvent('tasks:changed')); // TasksProvider will reload
    window.dispatchEvent(new CustomEvent('badges:changed')); // badges hook will reload
  };

  const updateFamilyName = async (familyId: string, name: string): Promise<void> => {
    if (!user) throw new Error('No user found');
    
    try {
      // Get the old family name before updating
      const oldFamily = families.find(f => f.id === familyId);
      const oldName = oldFamily?.name || 'Family';

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
      
      // Dispatch event to trigger refetch in other components
      window.dispatchEvent(new CustomEvent('family:updated'));

      // Send push notifications to all family members (except the one who made the change)
      // Get all family members
      const familyMembers = allFamilyMembers[familyId] || [];
      const otherMembers = familyMembers.filter(m => m.userId !== user.id);

      // Send notification to each member
      for (const member of otherMembers) {
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              recipientId: member.userId,
              title: 'Family Name Changed',
              body: `Family "${oldName}" changed its name to "${name}"`,
              data: {
                event_type: 'family_name_changed',
                family_id: familyId,
                old_name: oldName,
                new_name: name
              }
            }
          });
        } catch (pushError) {
          // Don't fail the operation if push notification fails
          console.error('Failed to send push notification:', pushError);
        }
      }
    } catch (error) {
      console.error('Failed to update family name:', error);
      throw error;
    }
  };

  const quitFamily = async (familyId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if user has only one family
      if (userFamilies.length === 1) {
        return false; // Cannot quit last family
      }

      // Calculate remaining families BEFORE state updates
      const remainingFamilies = userFamilies.filter(uf => uf.familyId !== familyId);
      
      // Get family members
      const members = getFamilyMembers(familyId);
      
      // Optimistic update: Remove from local state immediately
      setUserFamilies(remainingFamilies);
      setFamilies(prev => prev.filter(f => f.id !== familyId));
      
      // If user is the only member, delete the family
      if (members.length === 1 && members[0].userId === user.id) {
        // Delete the family
        const { error: familyError } = await supabase
          .from('families')
          .delete()
          .eq('id', familyId);

        if (familyError) {
          console.error('Error deleting family:', familyError);
          // Rollback optimistic update
          await loadFamilyData();
          throw familyError;
        }
      } else {
        // Just remove user from the family
        const { error: userFamilyError } = await supabase
          .from('user_families')
          .delete()
          .eq('user_id', user.id)
          .eq('family_id', familyId);

        if (userFamilyError) {
          console.error('Error removing user from family:', userFamilyError);
          // Rollback optimistic update
          await loadFamilyData();
          throw userFamilyError;
        }

        // Notify remaining family members that this user left
        const familyMembers = allFamilyMembers[familyId] || [];
        const otherMembers = familyMembers.filter(m => m.userId !== user.id);
        const leavingUserName = user.displayName || 'A member';
        
        for (const member of otherMembers) {
          try {
            await supabase.functions.invoke('send-push', {
              body: {
                recipientId: member.userId,
                title: 'Member Left',
                body: `${leavingUserName} has left the family`,
                data: {
                  event_type: 'member_left',
                  family_id: familyId,
                  member_name: leavingUserName
                }
              }
            });
          } catch (pushError) {
            console.error('Failed to send member left notification:', pushError);
          }
        }
      }

      // If the family being quit is the active family, switch to another one
      if (activeFamilyId === familyId) {
        if (remainingFamilies.length > 0) {
          const nextFamilyId = remainingFamilies[0].familyId;
          
          // Update active_family_id in database
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ active_family_id: nextFamilyId })
            .eq('id', user.id);

          if (updateError) {
            console.error('Error updating active family:', updateError);
          }
          
          await setActiveFamilyId(nextFamilyId);
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to quit family:', error);
      throw error;
    }
  };

  const removeFamilyMember = async (familyId: string, memberUserId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      // Check if user is a family member (any member can remove others)
      const isMember = userFamilies.some(uf => uf.familyId === familyId && uf.userId === user.id);
      if (!isMember) {
        console.error('Only family members can remove other members');
        return false;
      }

      // Cannot remove yourself using this function (use quitFamily instead)
      if (memberUserId === user.id) {
        console.error('Cannot remove yourself, use quitFamily instead');
        return false;
      }

      // Optimistic update: Remove from local state immediately
      setUserFamilies(prev => prev.filter(uf => 
        !(uf.userId === memberUserId && uf.familyId === familyId)
      ));
      setAllFamilyMembers(prev => ({
        ...prev,
        [familyId]: (prev[familyId] || []).filter(uf => uf.userId !== memberUserId)
      }));

      // Remove member from the family in database
      const { data: deletedData, error: removeError } = await supabase
        .from('user_families')
        .delete()
        .eq('user_id', memberUserId)
        .eq('family_id', familyId)
        .select();

      console.log('[removeFamilyMember] DELETE result:', { deletedData, removeError, memberUserId, familyId });

      if (removeError) {
        console.error('Error removing member from family:', removeError);
        // Rollback on error: refresh from database
        await fetchFamilyMembers(familyId);
        throw removeError;
      }

      if (!deletedData || deletedData.length === 0) {
        console.warn('[removeFamilyMember] No rows deleted - RLS may have blocked the delete');
        await fetchFamilyMembers(familyId);
        return false;
      }

      // Update the kicked user's active_family_id in the database
      // This ensures consistency when they next open the app
      const { data: kickedUserRemainingFamilies } = await supabase
        .from('user_families')
        .select('family_id')
        .eq('user_id', memberUserId);

      if (!kickedUserRemainingFamilies || kickedUserRemainingFamilies.length === 0) {
        // User has no families left - clear their active_family_id
        await supabase
          .from('profiles')
          .update({ active_family_id: null })
          .eq('id', memberUserId);
      } else {
        // Check if we need to switch their active family
        const { data: kickedUserProfile } = await supabase
          .from('profiles')
          .select('active_family_id')
          .eq('id', memberUserId)
          .maybeSingle();

        if (kickedUserProfile?.active_family_id === familyId) {
          // Their active family was the one they got kicked from - switch to another
          await supabase
            .from('profiles')
            .update({ active_family_id: kickedUserRemainingFamilies[0].family_id })
            .eq('id', memberUserId);
        }
      }

      // Get the removed member's name for notification
      const removedMemberProfile = userProfiles[memberUserId];
      const removedMemberName = removedMemberProfile?.displayName || 'A member';

      // Notify remaining family members (except the remover) that this member left
      const familyMembers = allFamilyMembers[familyId] || [];
      const otherMembers = familyMembers.filter(m => m.userId !== user.id && m.userId !== memberUserId);
      
      for (const member of otherMembers) {
        try {
          await supabase.functions.invoke('send-push', {
            body: {
              recipientId: member.userId,
              title: 'Member Left',
              body: `${removedMemberName} has left the family`,
              data: {
                event_type: 'member_left',
                family_id: familyId,
                member_name: removedMemberName
              }
            }
          });
        } catch (pushError) {
          console.error('Failed to send member left notification:', pushError);
        }
      }

      // Refresh family members to get server truth
      await fetchFamilyMembers(familyId);

      return true;
    } catch (error) {
      console.error('Failed to remove family member:', error);
      throw error;
    }
  };

  const [allFamilyMembers, setAllFamilyMembers] = useState<Record<string, UserFamily[]>>({});
  const [userProfiles, setUserProfiles] = useState<Record<string, User>>({});

  const getFamilyMembers = (familyId: string): UserFamily[] => {
    return allFamilyMembers[familyId] || [];
  };

  const getUserProfile = (userId: string): User | null => {
    return userProfiles[userId] || null;
  };

  // Fetch all family members for a family using RPC
  const fetchFamilyMembers = async (familyId: string) => {
    try {
      // Call RPC as a generic function since types aren't updated yet
      const { data, error } = await supabase
        .rpc('get_family_members' as any, { p_family_id: familyId });

      console.log('fetchFamilyMembers: RPC result:', { data, error, familyId });

      if (error) {
        console.error('fetchFamilyMembers: RPC get_family_members failed:', error);
        // Do not clear existing state on error
        return;
      }

      if (!data || !Array.isArray(data)) {
        console.log('fetchFamilyMembers: No data or invalid data format');
        return;
      }

      console.log(`fetchFamilyMembers: RPC returned ${data.length} members:`, data.map((row: any) => row.user_id));

      // Map RPC rows to your existing types
      const members: UserFamily[] = data.map((row: any) => ({
        userId: row.user_id,
        familyId: row.family_id,
        joinedAt: row.joined_at,
        totalStars: row.total_stars ?? 0,
        currentStage: row.current_stage ?? 1,
        lastReadTimestamp: null,
        seenCelebrations: [],
      }));

      const profiles: Record<string, User> = {};
      for (const row of data) {
        profiles[row.user_id] = {
          id: row.profile_id ?? row.user_id,
          displayName: row.display_name ?? null,
          dateOfBirth: row.date_of_birth ?? null,
          gender: (row.gender ?? 'other') as 'male' | 'female' | 'other',
          age: row.age ?? null,
          profileComplete: !!row.profile_complete,
          activeFamilyId: row.active_family_id ?? null,
          avatar_url: row.avatar_url ?? null,
        };
      }

      console.log('fetchFamilyMembers: Final members:', members.map(m => m.userId));
      console.log('fetchFamilyMembers: Final profiles:', Object.keys(profiles));

      setAllFamilyMembers(prev => ({ ...prev, [familyId]: members }));
      setUserProfiles(prev => ({ ...prev, ...profiles }));

      console.log(`fetchFamilyMembers: Set ${members.length} members and ${Object.keys(profiles).length} profiles`);
    } catch (e) {
      console.error('fetchFamilyMembers: unexpected error', e);
    }
  };

  // Fetch user profiles
  const fetchUserProfiles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (!error && data) {
        const profiles = data.reduce((acc, profile) => {
          acc[profile.id] = {
            id: profile.id,
            displayName: profile.display_name,
            dateOfBirth: profile.date_of_birth,
            gender: profile.gender as 'male' | 'female' | 'other',
            age: profile.age,
            profileComplete: profile.profile_complete,
            activeFamilyId: profile.active_family_id,
          };
          return acc;
        }, {} as Record<string, User>);

        setUserProfiles(prev => ({
          ...prev,
          ...profiles
        }));
      }
    } catch (error) {
      console.error('Error fetching user profiles:', error);
    }
  };

  const getUserFamily = (familyId: string): UserFamily | null => {
    return userFamilies.find(uf => uf.familyId === familyId) || null;
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
      
      // Optimistic UI update
      setUserFamilies(prev => prev.map(uf => 
        uf.familyId === familyId && uf.userId === user?.id 
          ? updatedUserFamily 
          : uf
      ));
      
      // Persist to Supabase (fire-and-forget)
      if (user?.id) {
        supabase
          .from('user_families')
          .update({ total_stars: updatedUserFamily.totalStars })
          .eq('user_id', user.id)
          .eq('family_id', familyId)
          .then(({ error }) => {
            if (error) {
              console.error('Failed to persist stars to Supabase:', error);
            }
          });
      }
      
      // Keep localStorage as a backup only
      storage.updateUserFamily(user?.id || '', familyId, updatedUserFamily);
    }
  };
  
  const applyStarsDelta = async (familyId: string, delta: number): Promise<boolean> => {
    if (!user || !familyId || !Number.isFinite(delta) || delta === 0) return false;

    console.log(`useApp: applyStarsDelta called with familyId: ${familyId}, delta: ${delta}`);

    // Find current state
    const curr = getUserFamily(familyId);
    const prevTotal = curr?.totalStars ?? 0;
    const newTotal = Math.max(0, prevTotal + delta);
    const newStage = Math.max(1, Math.floor(newTotal / 50) + 1);

    console.log(`useApp: Stars update: ${prevTotal} -> ${newTotal} (delta: ${delta})`);

    // Optimistic UI update
    setUserFamilies(prev => prev.map(uf =>
      uf.familyId === familyId && uf.userId === user.id
        ? { ...uf, totalStars: newTotal }
        : uf
    ));

    // Persist to Supabase and detect if any rows were updated
    const { data: rows, error } = await supabase
      .from('user_families')
      .update({
        total_stars: newTotal,
        current_stage: newStage
      })
      .eq('user_id', user.id)
      .eq('family_id', familyId)
      .select('total_stars, current_stage');

    if (error) {
      console.error('useApp: applyStarsDelta failed:', error);
      // Rollback optimistic state
      setUserFamilies(prev => prev.map(uf =>
        uf.familyId === familyId && uf.userId === user.id
          ? { ...uf, totalStars: prevTotal }
          : uf
      ));
      return false;
    }

    if (!rows || rows.length === 0) {
      // No row existed – insert membership with the computed values
      const { data: inserted, error: insErr } = await supabase
        .from('user_families')
        .insert([{
          user_id: user.id,
          family_id: familyId,
          total_stars: newTotal,
          current_stage: newStage,
        }])
        .select('total_stars, current_stage')
        .single();

      if (insErr || !inserted) {
        console.error('useApp: Failed to insert user_families row:', insErr);
        // Rollback optimistic state
        setUserFamilies(prev => prev.map(uf =>
          uf.familyId === familyId && uf.userId === user.id
            ? { ...uf, totalStars: prevTotal }
            : uf
        ));
        return false;
      }

      // Adopt server truth
      setUserFamilies(prev => prev.map(uf =>
        uf.familyId === familyId && uf.userId === user.id
          ? { ...uf, totalStars: inserted.total_stars, currentStage: inserted.current_stage }
          : uf
      ));
      console.log(`useApp: Inserted new user_families row with ${inserted.total_stars} stars`);
      return true;
    }

    // Use server truth to update local state (prevents hydrate clobber)
    const row = rows[0];
    setUserFamilies(prev => prev.map(uf =>
      uf.familyId === familyId && uf.userId === user.id
        ? { ...uf, totalStars: row.total_stars, currentStage: row.current_stage }
        : uf
    ));

    console.log(`useApp: Successfully updated total_stars to ${row.total_stars} in database`);
    return true;
  };

  const resetCharacterProgress = async (familyId: string): Promise<void> => {
    if (!user?.id) return;

    const userFamily = getUserFamily(familyId);
    if (!userFamily) return;

    console.log('resetCharacterProgress: Starting reset for family', familyId);

    // CRITICAL: Delete completed tasks FIRST before resetting stars
    // This prevents the repairStarsConsistency bug where tasks remain
    // and stars get recalculated from remaining tasks
    const { error: delErr, count: deletedCount } = await supabase
      .from('tasks')
      .delete()
      .eq('family_id', familyId)
      .eq('assigned_to', user.id)
      .eq('completed', true);

    if (delErr) {
      console.error('resetCharacterProgress: Failed to delete completed tasks:', delErr);
      // Don't proceed with star reset if task deletion failed
      // This prevents inconsistency between stars and actual tasks
      return;
    }

    console.log(`resetCharacterProgress: Deleted ${deletedCount ?? 'unknown'} completed tasks`);

    // Delete all badges for this user in this family
    const { error: badgesError } = await supabase
      .from('user_badges')
      .delete()
      .eq('user_id', user.id)
      .eq('family_id', familyId);

    if (badgesError) {
      console.error('resetCharacterProgress: Failed to delete badges:', badgesError);
      // Continue anyway - badges are less critical than stars consistency
    }

    // NOW reset stars after tasks are confirmed deleted
    const { error: familyError } = await supabase
      .from('user_families')
      .update({ total_stars: 0, current_stage: 1 })
      .eq('user_id', user.id)
      .eq('family_id', familyId);

    if (familyError) {
      console.error('resetCharacterProgress: Failed to reset progress in Supabase:', familyError);
      return;
    }

    console.log('resetCharacterProgress: Successfully reset stars to 0');

    // Update local state only after successful database operations
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

    // Rehydrate family data to refresh everything
    await hydrateActiveFamily();
    
    // Emit events to refresh tasks and badges
    window.dispatchEvent(new CustomEvent('tasks:changed'));
    window.dispatchEvent(new CustomEvent('badges:changed'));

    console.log('resetCharacterProgress: Reset complete');
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
      quitFamily,
      removeFamilyMember,
      getUserFamily,
      getFamilyMembers,
      getUserProfile,
      getTotalStars,
      addStars,
      applyStarsDelta,
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