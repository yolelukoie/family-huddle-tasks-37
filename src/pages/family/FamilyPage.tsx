import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { MemberProfileModal } from '@/components/modals/MemberProfileModal';
import { Users, Share, Plus, Edit, Star, Settings, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentStage, getStageName } from '@/lib/character';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export default function FamilyPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const { activeFamilyId, userFamilies, families, setActiveFamilyId, createFamily, joinFamily, updateFamilyName, quitFamily, removeFamilyMember, getFamilyMembers, getUserProfile } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberProfile, setShowMemberProfile] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ userId: string; displayName: string; familyId: string } | null>(null);

  if (!user) return null;

  const activeFamily = activeFamilyId ? families.find(f => f.id === activeFamilyId) : null;
  const userFamilyIds = userFamilies.map(uf => uf.familyId);
  const allUserFamilies = families.filter(f => userFamilyIds.includes(f.id));

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      const family = await joinFamily(inviteCode.trim());
      if (family) {
        setInviteCode('');
        setShowJoinFamily(false);
        toast({
          title: t('family.joinedSuccess'),
          description: `${t('family.welcomeTo')} ${family.name}`,
        });
      } else {
        toast({
          title: t('family.invalidCode'),
          description: t('family.invalidCodeDesc'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('family.errorJoining'),
        description: t('family.errorJoiningDesc'),
        variant: "destructive",
      });
    }
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;

    try {
      await createFamily(newFamilyName.trim());
      setNewFamilyName('');
      setShowCreateFamily(false);
      toast({
        title: t('family.createdSuccess'),
        description: `${t('family.welcomeTo')} ${newFamilyName.trim()}`,
      });
    } catch (error) {
      toast({
        title: t('family.errorCreating'),
        description: t('family.errorCreatingDesc'),
        variant: "destructive",
      });
    }
  };

  const handleUpdateFamilyName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamilyId || !editingFamilyName.trim()) return;

    try {
      updateFamilyName(editingFamilyId, editingFamilyName.trim());
      setEditingFamilyId(null);
      setEditingFamilyName('');
      toast({
        title: t('family.nameUpdated'),
        description: t('family.nameUpdatedDesc'),
      });
    } catch (error) {
      toast({
        title: t('family.errorUpdatingName'),
        description: t('family.errorUpdatingNameDesc'),
        variant: "destructive",
      });
    }
  };

  const handleQuitFamily = async (familyId: string) => {
    try {
      const success = await quitFamily(familyId);
      
      if (!success) {
        toast({
          title: t('family.cannotQuit'),
          description: t('family.cannotQuitDesc'),
          variant: "destructive",
        });
        return;
      }

      setEditingFamilyId(null);
      setEditingFamilyName('');
      toast({
        title: t('family.leftFamily'),
        description: t('family.leftFamilyDesc'),
      });
    } catch (error) {
      toast({
        title: t('family.errorLeaving'),
        description: t('family.errorLeavingDesc'),
        variant: "destructive",
      });
    }
  };

  const copyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: t('family.inviteCodeCopied'),
      description: t('family.inviteCodeCopiedDesc'),
    });
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;

    try {
      const success = await removeFamilyMember(memberToRemove.familyId, memberToRemove.userId);
      
      if (success) {
        toast({
          title: t('family.memberRemoved'),
          description: `${memberToRemove.displayName} ${t('family.memberRemovedDesc')}`,
        });
      } else {
        toast({
          title: t('family.error'),
          description: t('family.failedToRemove'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('family.errorRemovingMember'),
        description: t('family.errorRemovingMemberDesc'),
        variant: "destructive",
      });
    } finally {
      setMemberToRemove(null);
    }
  };

  // Listen for when user is kicked from a family
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('user-family-changes')
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'user_families',
        filter: `user_id=eq.${user.id}`,
      }, async (payload) => {
        const removedFamilyId = (payload.old as any).family_id;
        
        // Refresh userFamilies from database to get current state
        const { data: currentUserFamilies } = await supabase
          .from('user_families')
          .select('*')
          .eq('user_id', user.id);

        // Get the removed family details
        const { data: removedFamilyData } = await supabase
          .from('families')
          .select('name')
          .eq('id', removedFamilyId)
          .single();

        const familyName = removedFamilyData?.name || 'the family';

        // Show notification
        toast({
          title: t('family.removedFromFamily'),
          description: `${t('family.removedFromFamilyDesc')} "${familyName}".`,
          variant: "destructive",
        });

        // Check if user has any remaining families
        if (!currentUserFamilies || currentUserFamilies.length === 0) {
          // No families left, go to onboarding
          await updateUser({ activeFamilyId: undefined, profileComplete: false });
          navigate('/onboarding');
        } else if (activeFamilyId === removedFamilyId) {
          // If this was the active family, switch to the first remaining family
          const nextFamilyId = currentUserFamilies[0].family_id;
          await updateUser({ activeFamilyId: nextFamilyId });
          window.location.reload(); // Force reload to refresh all data
        } else {
          // User still has families but wasn't on the kicked family page
          window.location.reload(); // Force reload to refresh family list
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, activeFamilyId, toast, navigate, updateUser]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('family.title')} />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Active Family */}
        {activeFamily && (
          <Card accent>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                {t('family.activeFamily')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{activeFamily.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {t('family.inviteCode')}: {activeFamily.inviteCode}
                  </p>
                </div>
                <Button variant="theme" onClick={() => copyInviteCode(activeFamily.inviteCode)}>
                  <Share className="h-4 w-4 mr-2" />
                  {t('family.shareCode')}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Families */}
        <Card accent>
          <CardHeader>
            <CardTitle>{t('family.yourFamilies')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allUserFamilies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                {t('family.noFamilies')}
              </p>
            ) : (
              allUserFamilies.map(family => (
                <div key={family.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-2">
                      <div className="font-medium text-lg">{family.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {t('family.code')}: {family.inviteCode}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {family.id === activeFamilyId && (
                          <Badge variant="default">{t('family.active')}</Badge>
                        )}
                        {family.createdBy === user.id && (
                          <Badge variant="secondary">{t('family.owner')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="theme" size="sm" className="flex-1 sm:flex-initial">
                          <Users className="h-4 w-4 mr-1" />
                          <span className="sm:hidden">{t('family.members')}</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>{t('family.familyMembers')}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          {getFamilyMembers(family.id).map((member) => {
                            const memberProfile = getUserProfile(member.userId);
                            const isCurrentUser = member.userId === user.id;
                            const currentStage = getCurrentStage(member.totalStars);
                            const stageName = getStageName(currentStage);
                            
                            return (
                              <div 
                                key={member.userId}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div 
                                  className={`flex items-center gap-3 flex-1 ${
                                    !isCurrentUser ? 'cursor-pointer hover:opacity-80' : ''
                                  }`}
                                  onClick={() => {
                                    if (!isCurrentUser) {
                                      setSelectedMember({ member, memberProfile });
                                      setShowMemberProfile(true);
                                    }
                                  }}
                                >
                                  <Avatar className="h-10 w-10">
                                    <AvatarImage src={memberProfile?.avatar_url} alt={memberProfile?.displayName} />
                                    <AvatarFallback>
                                      {getInitials(memberProfile?.displayName || 'FM')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex flex-col">
                                    <span className="font-medium">
                                      {memberProfile?.displayName || 'Family Member'}
                                    </span>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                      <Star className="h-3 w-3" />
                                      <span>{member.totalStars} stars</span>
                                      <span>•</span>
                                      <span>{stageName}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCurrentUser && (
                                    <Badge variant="secondary">{t('family.you')}</Badge>
                                  )}
                                  {!isCurrentUser && family.createdBy === user.id && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setMemberToRemove({
                                          userId: member.userId,
                                          displayName: memberProfile?.displayName || 'Family Member',
                                          familyId: family.id
                                        });
                                      }}
                                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <UserMinus className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {family.createdBy === user.id && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="theme" size="sm" className="flex-1 sm:flex-initial">
                            <Settings className="h-4 w-4 mr-1" />
                            <span className="sm:hidden">{t('family.edit')}</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{t('family.editFamilyName')}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateFamilyName} className="space-y-4">
                            <div>
                              <Label htmlFor="familyName">{t('family.familyName')}</Label>
                              <Input
                                id="familyName"
                                value={editingFamilyId === family.id ? editingFamilyName : family.name}
                                onChange={(e) => {
                                  setEditingFamilyId(family.id);
                                  setEditingFamilyName(e.target.value);
                                }}
                                placeholder={t('family.enterFamilyName')}
                                required
                              />
                            </div>
                            <div className="flex flex-col gap-2">
                              <div className="flex gap-2">
                                <Button type="submit" className="flex-1">{t('family.update')}</Button>
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setEditingFamilyId(null);
                                    setEditingFamilyName('');
                                  }}
                                >
                                  {t('family.cancel')}
                                </Button>
                              </div>
                              <Button 
                                type="button" 
                                variant="destructive" 
                                 onClick={() => handleQuitFamily(family.id)}
                                 className="w-full"
                               >
                                 {t("family.quitFamily")}
                               </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                    )}

                    {family.id !== activeFamilyId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveFamilyId(family.id)}
                        className="flex-1 sm:flex-initial"
                      >
                        {t("family.switchTo")}
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("family.joinFamily")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!showJoinFamily ? (
                <Button onClick={() => setShowJoinFamily(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("family.join")}
                </Button>
              ) : (
                <form onSubmit={handleJoinFamily} className="space-y-3">
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder={t("family.enterInviteCode")}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">{t("family.join")}</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowJoinFamily(false)}
                    >
                      {t("family.cancel")}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("family.createFamily")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!showCreateFamily ? (
                <Button onClick={() => setShowCreateFamily(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  {t("family.create")}
                </Button>
              ) : (
                <form onSubmit={handleCreateFamily} className="space-y-3">
                  <Input
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder={t("family.enterFamilyName")}
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">{t("family.create")}</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateFamily(false)}
                    >
                      {t("family.cancel")}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Member Profile Modal */}
      {selectedMember && (
        <MemberProfileModal
          open={showMemberProfile}
          onOpenChange={setShowMemberProfile}
          member={selectedMember.member}
          memberProfile={selectedMember.memberProfile}
          familyId={activeFamilyId!}
        />
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("family.removeMember")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("family.removeConfirm")} <strong>{memberToRemove?.displayName}</strong> {t("family.fromFamily")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("family.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t("family.remove")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}