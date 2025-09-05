import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { useApp } from '@/hooks/useApp';
import { ROUTES } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';

const onboardingSchema = z.object({
  // Profile fields
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select your gender',
  }),
  // Family fields
  familyAction: z.enum(['create', 'join']),
  familyName: z.string().optional(),
  inviteCode: z.string().optional(),
}).refine((data) => {
  if (data.familyAction === 'create') {
    return data.familyName && data.familyName.length >= 2;
  }
  if (data.familyAction === 'join') {
    return data.inviteCode && data.inviteCode.length >= 1;
  }
  return false;
}, {
  message: "Please fill in the required family information",
  path: ["familyName"],
});

type OnboardingForm = z.infer<typeof onboardingSchema>;

export default function OnboardingPage() {
  const { user, isLoading, createUser } = useAuth();
  const { createFamily, joinFamily } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [familyAction, setFamilyAction] = useState<'create' | 'join'>('create');

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      familyAction: 'create',
    },
  });

  // Redirect if user is already fully set up
  useEffect(() => {
    if (!isLoading && user && user.profileComplete && user.activeFamilyId) {
      navigate(ROUTES.main, { replace: true });
    }
  }, [isLoading, user, navigate]);

  const onSubmit = (data: OnboardingForm) => {
    try {
      // Create user profile
      const newUser = createUser({
        displayName: data.displayName,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
      });

      // Handle family action
      if (data.familyAction === 'create' && data.familyName) {
        createFamily(data.familyName);
        toast({
          title: "Welcome to Family Stars! ⭐",
          description: `Your family "${data.familyName}" has been created!`,
        });
      } else if (data.familyAction === 'join' && data.inviteCode) {
        const family = joinFamily(data.inviteCode);
        if (family) {
          toast({
            title: "Welcome to Family Stars! ⭐",
            description: `You've joined "${family.name}"!`,
          });
        } else {
          toast({
            title: "Invalid invite code",
            description: "The invite code you entered was not found.",
            variant: "destructive",
          });
          return;
        }
      }

      navigate(ROUTES.main, { replace: true });
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-family-warm mb-2">
            Welcome to Family Stars! ⭐
          </h1>
          <p className="text-muted-foreground">
            Let's get you started on your family adventure
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Set up your profile</CardTitle>
            <CardDescription>
              Tell us about yourself and join your family
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                    <h3 className="font-medium">About you</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Display Name</FormLabel>
                        <FormControl>
                          <Input placeholder="What should we call you?" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Family Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                    <h3 className="font-medium">Join your family</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="familyAction"
                    render={({ field }) => (
                      <FormItem>
                        <Tabs value={field.value} onValueChange={(value) => {
                          field.onChange(value);
                          setFamilyAction(value as 'create' | 'join');
                        }}>
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="create">Create Family</TabsTrigger>
                            <TabsTrigger value="join">Join Family</TabsTrigger>
                          </TabsList>

                          <TabsContent value="create" className="mt-4">
                            <FormField
                              control={form.control}
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
                          </TabsContent>

                          <TabsContent value="join" className="mt-4">
                            <FormField
                              control={form.control}
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
                          </TabsContent>
                        </Tabs>
                      </FormItem>
                    )}
                  />
                </div>

                <Button type="submit" className="w-full bg-family-warm hover:bg-family-warm/90">
                  {familyAction === 'create' ? 'Create Family & Get Started' : 'Join Family & Get Started'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}