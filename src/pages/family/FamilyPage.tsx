import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { storage } from '@/lib/storage';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Users, Share, Plus, Edit } from 'lucide-react';

export default function FamilyPage() {
  const { user, updateUser } = useAuth();
  const { activeFamilyId, userFamilies, setActiveFamilyId } = useApp();
  const [newDisplayName, setNewDisplayName] = useState(user?.displayName || '');
  const [showJoinFamily, setShowJoinFamily] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showCreateFamily, setShowCreateFamily] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');

  if (!user || !activeFamilyId) return null;

  const activeFamily = storage.getFamilies().find(f => f.id === activeFamilyId);
  const allFamilies = storage.getFamilies().filter(f => 
    userFamilies.some(uf => uf.familyId === f.id)
  );

  const handleUpdateDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim() && newDisplayName !== user.displayName) {
      storage.setUser({ ...user, displayName: newDisplayName.trim() });
      window.location.reload();
    }
  };

  const handleJoinFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    const family = storage.findFamilyByInviteCode(inviteCode.trim());
    if (!family) {
      alert('Invalid invite code');
      return;
    }

    // Check if already member
    const existingMembership = storage.getUserFamily(user.id, family.id);
    if (existingMembership) {
      alert('You are already a member of this family');
      return;
    }

    // Add user to family
    storage.addUserFamily({
      userId: user.id,
      familyId: family.id,
      joinedAt: new Date().toISOString(),
      totalStars: 0,
      currentStage: 0,
      lastReadTimestamp: Date.now(),
      seenCelebrations: []
    });

    setInviteCode('');
    setShowJoinFamily(false);
    setActiveFamilyId(family.id);
    window.location.reload();
  };

  const handleCreateFamily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyName.trim()) return;

    const familyId = Date.now().toString();
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Create family
    storage.addFamily({
      id: familyId,
      name: newFamilyName.trim(),
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      inviteCode
    });

    // Add user to family
    storage.addUserFamily({
      userId: user.id,
      familyId,
      joinedAt: new Date().toISOString(),
      totalStars: 0,
      currentStage: 0,
      lastReadTimestamp: Date.now(),
      seenCelebrations: []
    });

    // Add default categories
    storage.addTaskCategory({
      id: `${familyId}_house_chores`,
      name: 'House Chores',
      familyId,
      isHouseChores: true,
      isDefault: true,
      order: 1
    });
    storage.addTaskCategory({
      id: `${familyId}_personal_growth`,
      name: 'Personal Growth',
      familyId,
      isHouseChores: false,
      isDefault: true,
      order: 2
    });
    storage.addTaskCategory({
      id: `${familyId}_happiness`,
      name: 'Happiness',
      familyId,
      isHouseChores: false,
      isDefault: true,
      order: 3
    });

    setNewFamilyName('');
    setShowCreateFamily(false);
    setActiveFamilyId(familyId);
    window.location.reload();
  };

  const copyInviteCode = () => {
    if (activeFamily?.inviteCode) {
      navigator.clipboard.writeText(activeFamily.inviteCode);
      alert('Invite code copied to clipboard!');
    }
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
                <Button variant="outline" onClick={copyInviteCode}>
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
            {allFamilies.map(family => (
              <div key={family.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium">{family.name}</div>
                    <div className="text-sm text-muted-foreground">
                      Code: {family.inviteCode}
                    </div>
                  </div>
                  {family.id === activeFamilyId && (
                    <Badge variant="default">Active</Badge>
                  )}
                </div>
                {family.id !== activeFamilyId && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveFamilyId(family.id);
                      window.location.reload();
                    }}
                  >
                    Switch
                  </Button>
                )}
              </div>
            ))}
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
    </div>
  );
}