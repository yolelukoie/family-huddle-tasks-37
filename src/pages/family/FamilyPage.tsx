import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { MemberProfileModal } from '@/components/modals/MemberProfileModal';
import { Users, Share, Plus, Edit, Settings, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getCurrentStage, getStageName } from '@/lib/character';

export default function FamilyPage() {
  const { user, updateUser } = useAuth();
  const { activeFamilyId, userFamilies, families, setActiveFamilyId, createFamily, joinFamily, updateFamilyName, getFamilyMembers, getUserProfile } = useApp();
  const { toast } = useToast();
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [editingFamilyId, setEditingFamilyId] = useState<string | null>(null);
  const [editingFamilyName, setEditingFamilyName] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberProfile, setShowMemberProfile] = useState(false);

  if (!user) return null;

  const activeFamily = activeFamilyId ? families.find(f => f.id === activeFamilyId) : null;
  const userFamilyIds = userFamilies.map(uf => uf.familyId);
  const allUserFamilies = families.filter(f => userFamilyIds.includes(f.id));

  const handleUpdateDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim() && newDisplayName !== user.displayName) {
      updateUser({ displayName: newDisplayName.trim() });
      toast({
        title: "Profile updated",
        description: "Your display name has been updated successfully.",
      });
    }
  };

  const handleJoinFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    try {
      const family = joinFamily(inviteCode.trim());
      if (family) {
        setInviteCode('');
        setShowJoinFamily(false);
        toast({
          title: "Joined family successfully!",
          description: `Welcome to ${family.name}`,
        });
      } else {
        toast({
          title: "Invalid invite code",
          description: "The invite code you entered is not valid.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error joining family",
        description: "There was an error joining the family. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;

    try {
      createFamily(newFamilyName.trim());
      setNewFamilyName('');
      setShowCreateFamily(false);
      toast({
        title: "Family created successfully!",
        description: `Welcome to ${newFamilyName.trim()}`,
      });
    } catch (error) {
      toast({
        title: "Error creating family",
        description: "There was an error creating the family. Please try again.",
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
        title: "Family name updated",
        description: "The family name has been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error updating family name",
        description: "There was an error updating the family name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyInviteCode = (inviteCode: string) => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Invite code copied!",
      description: "The invite code has been copied to your clipboard.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader title="Family Settings" />
      
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateDisplayName} className="space-y-4">
              <div>
                <Label htmlFor="displayName">Display Name</Label>
                <div className="flex gap-2">
                  <Input
                    id="displayName"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                  <Button type="submit" variant="outline">
                    Update
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Active Family */}
        {activeFamily && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Active Family
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{activeFamily.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    Invite code: {activeFamily.inviteCode}
                  </p>
                </div>
                <Button variant="outline" onClick={() => copyInviteCode(activeFamily.inviteCode)}>
                  <Share className="h-4 w-4 mr-2" />
                  Share Code
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Families */}
        <Card>
          <CardHeader>
            <CardTitle>Your Families</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {allUserFamilies.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No families yet. Create or join a family to get started!
              </p>
            ) : (
              allUserFamilies.map(family => (
                <div key={family.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="space-y-2">
                      <div className="font-medium text-lg">{family.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Code: {family.inviteCode}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {family.id === activeFamilyId && (
                          <Badge variant="default">Active</Badge>
                        )}
                        {family.createdBy === user.id && (
                          <Badge variant="secondary">Owner</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                          <Users className="h-4 w-4 mr-1" />
                          <span className="sm:hidden">Members</span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Family Members</DialogTitle>
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
                                className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                                  !isCurrentUser ? 'cursor-pointer hover:bg-muted/50' : ''
                                }`}
                                onClick={() => {
                                  if (!isCurrentUser) {
                                    setSelectedMember({ member, memberProfile });
                                    setShowMemberProfile(true);
                                  }
                                }}
                              >
                                <div className="flex items-center gap-3">
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
                                {isCurrentUser && (
                                  <Badge variant="secondary">You</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </DialogContent>
                    </Dialog>

                    {family.createdBy === user.id && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial">
                            <Settings className="h-4 w-4 mr-1" />
                            <span className="sm:hidden">Edit</span>
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Family Name</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleUpdateFamilyName} className="space-y-4">
                            <div>
                              <Label htmlFor="familyName">Family Name</Label>
                              <Input
                                id="familyName"
                                value={editingFamilyId === family.id ? editingFamilyName : family.name}
                                onChange={(e) => {
                                  setEditingFamilyId(family.id);
                                  setEditingFamilyName(e.target.value);
                                }}
                                placeholder="Enter family name"
                                required
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button type="submit" className="flex-1">Update</Button>
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => {
                                  setEditingFamilyId(null);
                                  setEditingFamilyName('');
                                }}
                              >
                                Cancel
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
                        Switch
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
              <CardTitle className="text-lg">Join Family</CardTitle>
            </CardHeader>
            <CardContent>
              {!showJoinFamily ? (
                <Button onClick={() => setShowJoinFamily(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Join Existing Family
                </Button>
              ) : (
                <form onSubmit={handleJoinFamily} className="space-y-3">
                  <Input
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code"
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Join</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowJoinFamily(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create Family</CardTitle>
            </CardHeader>
            <CardContent>
              {!showCreateFamily ? (
                <Button onClick={() => setShowCreateFamily(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Family
                </Button>
              ) : (
                <form onSubmit={handleCreateFamily} className="space-y-3">
                  <Input
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="Enter family name"
                    required
                  />
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1">Create</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setShowCreateFamily(false)}
                    >
                      Cancel
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
    </div>
  );
}