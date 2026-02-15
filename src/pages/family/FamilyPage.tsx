import { useState } from 'react';
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
import { BlockMemberModal } from '@/components/modals/BlockMemberModal';
import { Users, Share, Plus, Star, Settings, Ban, ShieldOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentStage, getStageName } from '@/lib/character';
import { supabase } from '@/integrations/supabase/client';
import { isBlocked, getBlockStatusText, getBlockTimeRemaining, formatBlockTimeRemaining, type BlockReason, type BlockDuration } from '@/lib/blockUtils';

export default function FamilyPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeFamilyId, userFamilies, families, setActiveFamilyId, createFamily, joinFamily, updateFamilyName, quitFamily, blockFamilyMember, unblockFamilyMember, getFamilyMembers, getUserProfile, getUserFamily } = useApp();
  const { toast } = useToast();
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberProfile, setShowMemberProfile] = useState(false);
  const [memberToBlock, setMemberToBlock] = useState<{ userId: string; displayName: string; familyId: string } | null>(null);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);

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

  const handleUpdateFamilyName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamilyId || !editingFamilyName.trim()) return;

    try {
      await updateFamilyName(editingFamilyId, editingFamilyName.trim());
      setEditingFamilyId(null);
      setEditingFamilyName('');
      toast({
        title: t('family.nameUpdated'),
        description: t('family.nameUpdatedDesc'),
      });
    } catch (error) {
      console.error('Error updating family name:', error);
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

  const generateAndShareCode = async (familyId: string) => {
    setIsGeneratingCode(true);
    try {
      // Call RPC to regenerate invite code with 24-hour expiry
      const { data, error } = await supabase
        .rpc('regenerate_invite_code', { p_family_id: familyId });
      
      if (error) {
        console.error('Error regenerating invite code:', error);
        toast({
          title: t('family.error'),
          description: t('family.errorGeneratingCode') || 'Failed to generate invite code.',
          variant: "destructive",
        });
        return;
      }
      
      if (data && data[0]) {
        const newCode = data[0].new_invite_code;
        // Copy the new code to clipboard
        await navigator.clipboard.writeText(newCode);
        toast({
          title: t('family.inviteCodeCopied'),
          description: `${t('family.inviteCodeCopiedDesc')} ${t('family.codeActiveFor24Hours') || 'The invite code will be active for 24 hours.'}`,
        });
      }
    } catch (err) {
      console.error('Error generating invite code:', err);
      toast({
        title: t('family.error'),
        description: t('family.errorGeneratingCode') || 'Failed to generate invite code.',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCode(false);
    }
  };

  const handleBlockMember = async (memberId: string, familyId: string, reason: BlockReason, duration: BlockDuration) => {
    try {
      const success = await blockFamilyMember(familyId, memberId, reason, duration);
      
      if (success) {
        toast({
          title: t('block.memberBlocked'),
          description: t('block.memberBlockedDesc'),
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('block.failedToBlock'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('block.failedToBlock'),
        variant: "destructive",
      });
    }
  };

  const handleUnblockMember = async (memberId: string, familyId: string) => {
    try {
      const success = await unblockFamilyMember(familyId, memberId);
      
      if (success) {
        toast({
          title: t('block.memberUnblocked'),
          description: t('block.memberUnblockedDesc'),
        });
      } else {
        toast({
          title: t('common.error'),
          description: t('block.failedToUnblock'),
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('block.failedToUnblock'),
        variant: "destructive",
      });
    }
  };

  // Kicked-from-family handling is now global in useKickedFromFamily hook

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
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="h-3 w-3" />
                    <span>{userFamilies.find(uf => uf.familyId === activeFamilyId)?.totalStars || 0} {t('main.stars')}</span>
                  </div>
                </div>
                <Button 
                  variant="theme" 
                  onClick={() => generateAndShareCode(activeFamily.id)}
                  disabled={isGeneratingCode}
                >
                  <Share className="h-4 w-4 mr-2" />
                  {isGeneratingCode ? t('common.loading') : t('family.shareCode')}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">{t('family.inviteHint')}</p>
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
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3" />
                        <span>{userFamilies.find(uf => uf.familyId === family.id)?.totalStars || 0} {t('main.stars')}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {family.id === activeFamilyId && (
                          <Badge variant="default">{t('family.active')}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    {/* Only show Members button if user is NOT blocked */}
                    {!isBlocked(getUserFamily(family.id)) ? (
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
                                    <div className="flex flex-col min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium truncate">
                                          {memberProfile?.displayName || t('memberProfile.defaultMemberName')}
                                        </span>
                                        {isCurrentUser && (
                                          <Badge variant="secondary" className="shrink-0">{t('family.you')}</Badge>
                                        )}
                                        {isBlocked(member) && (
                                          <Badge variant="destructive" className="shrink-0 text-xs">
                                            {getBlockStatusText(member, t)}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Star className="h-3 w-3" />
                                        <span>{member.totalStars} {t('main.stars')}</span>
                                        <span>•</span>
                                        <span>{stageName}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {!isCurrentUser && (
                                      <>
                                        {isBlocked(member) ? (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleUnblockMember(member.userId, family.id)}
                                            className="h-8 text-primary hover:text-primary hover:bg-primary/10"
                                          >
                                            <ShieldOff className="h-4 w-4 mr-1" />
                                            {t('block.unblockBtn')}
                                          </Button>
                                        ) : (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              setMemberToBlock({
                                                userId: member.userId,
                                                displayName: memberProfile?.displayName || t('memberProfile.defaultMemberName'),
                                                familyId: family.id
                                              });
                                            }}
                                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                          >
                                            <Ban className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (() => {
                      const membership = getUserFamily(family.id);
                      const remaining = getBlockTimeRemaining(membership);
                      const timeStr = remaining === Infinity ? '' : formatBlockTimeRemaining(remaining);
                      return (
                        <Badge variant="destructive" className="text-xs">
                          {timeStr 
                            ? t('block.noMembersAccessFor', { time: timeStr })
                            : t('block.noMembersAccess')}
                        </Badge>
                      );
                    })()}

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

      {/* Block Member Modal */}
      {memberToBlock && (
        <BlockMemberModal
          open={!!memberToBlock}
          onOpenChange={(open) => !open && setMemberToBlock(null)}
          memberName={memberToBlock.displayName}
          memberId={memberToBlock.userId}
          familyId={memberToBlock.familyId}
          onBlock={handleBlockMember}
        />
      )}
    </div>
  );
}