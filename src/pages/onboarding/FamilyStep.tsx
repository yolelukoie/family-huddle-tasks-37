import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApp } from '@/hooks/useApp';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/storage';

const createFamilySchema = z.object({
  familyName: z.string().min(2, 'Family name must be at least 2 characters'),
});

const joinFamilySchema = z.object({
  inviteCode: z.string().min(1, 'Invite code is required'),
});

type CreateFamilyForm = z.infer<typeof createFamilySchema>;
type JoinFamilyForm = z.infer<typeof joinFamilySchema>;

export function FamilyStep() {
  const { createFamily, joinFamily } = useApp();
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if user has existing families to determine default tab
  const existingFamilies = user ? storage.getFamilies().filter(f => 
    storage.getUserFamilies().some(uf => uf.userId === user.id && uf.familyId === f.id)
  ) : [];
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>(
    existingFamilies.length > 0 ? 'join' : 'create'
  );

  const createForm = useForm<CreateFamilyForm>({
    resolver: zodResolver(createFamilySchema),
    defaultValues: { familyName: '' },
  });

  const joinForm = useForm<JoinFamilyForm>({
    resolver: zodResolver(joinFamilySchema),
    defaultValues: { inviteCode: '' },
  });

  const onCreateFamily = (data: CreateFamilyForm) => {
    if (!user || isLoading) return;
    
    try {
      createFamily(data.familyName);
      navigate(ROUTES.main);
      toast({
        title: "Family created!",
        description: `Welcome to ${data.familyName}! 🎉`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create family. Please try again.",
        variant: "destructive",
      });
    }
  };

  const onJoinFamily = (data: JoinFamilyForm) => {
    const family = joinFamily(data.inviteCode);
    if (family) {
      navigate(ROUTES.main);
      toast({
        title: "Joined family!",
        description: `Welcome to ${family.name}! 🎉`,
      });
    } else {
      toast({
        title: "Invalid code",
        description: "The invite code you entered was not found.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Join your family</CardTitle>
        <CardDescription>
          Create a new family or join an existing one with an invite code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'create' | 'join')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Family</TabsTrigger>
            <TabsTrigger value="join">Join Family</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="mt-4">
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onCreateFamily)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="familyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family Name</FormLabel>
                      <FormControl>
                        <Input placeholder="The Smith Family" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-family-warm hover:bg-family-warm/90"
                  disabled={!user || isLoading}
                >
                  {isLoading ? 'Loading...' : 'Create Family'}
                </Button>
              </form>
            </Form>
          </TabsContent>

          <TabsContent value="join" className="mt-4">
            <Form {...joinForm}>
              <form onSubmit={joinForm.handleSubmit(onJoinFamily)} className="space-y-4">
                <FormField
                  control={joinForm.control}
                  name="inviteCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invite Code</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter family invite code" 
                          {...field}
                          style={{ textTransform: 'uppercase' }}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-primary/90"
                  disabled={!user || isLoading}
                >
                  {isLoading ? 'Loading...' : 'Join Family'}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}