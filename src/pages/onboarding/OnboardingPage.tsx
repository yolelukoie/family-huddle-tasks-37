import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { initiateSubscription } from '@/config/subscription';

const StarIcon = () => (
  <svg viewBox="0 0 100 100" className="inline-block w-[1.2em] h-[1.2em] ml-1 align-middle">
    {/* Main star - centered */}
    <polygon 
      points="50,25 57,43 77,43 61,55 67,73 50,62 33,73 39,55 23,43 43,43" 
      fill="#FACC15" 
    />
    {/* Top dot - touching star's top point */}
    <circle cx="50" cy="15" r="7" fill="#FACC15" />
    {/* Bottom-left dot - at 7 o'clock */}
    <circle cx="25" cy="78" r="7" fill="#FACC15" />
    {/* Bottom-right dot - at 5 o'clock */}
    <circle cx="75" cy="78" r="7" fill="#FACC15" />
  </svg>
);

export default function OnboardingPage() {
  const { t } = useTranslation();
  const { user, isLoading, createUser, isAuthenticated } = useAuth();
  const { createFamily, joinFamily } = useApp();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [familyAction, setFamilyAction] = useState<'create' | 'join'>('create');

  const onboardingSchema = z.object({
    // Profile fields
    displayName: z.string().min(2, t('onboarding.nameMinLength')),
    gender: z.enum(['male', 'female', 'other'], {
      required_error: t('onboarding.selectGender'),
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
    message: t('onboarding.familyInfoRequired'),
    path: ["familyName"],
  });

  type OnboardingForm = z.infer<typeof onboardingSchema>;

  const form = useForm<OnboardingForm>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      familyAction: 'create',
      displayName: '',
    },
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/auth', { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Redirect if user is already fully set up
  useEffect(() => {
    if (!isLoading && user && user.profileComplete && user.activeFamilyId) {
      navigate(ROUTES.main, { replace: true });
    }
  }, [isLoading, user, navigate]);

  const onSubmit = async (data: OnboardingForm) => {
    try {
      console.log('Starting onboarding submission:', data);
      
      // Create user profile
      const newUser = await createUser({
        displayName: data.displayName,
        gender: data.gender,
      });
      
      console.log('Profile created successfully:', newUser);

      // Handle family action
      if (data.familyAction === 'create' && data.familyName) {
        console.log('Creating family:', data.familyName);
        const familyId = await createFamily(data.familyName);
        console.log('Family created successfully with ID:', familyId);
        
        toast({
          title: `${t('onboarding.welcomeTitle')} ⭐`,
          description: `${t('onboarding.joinedFamily')} "${data.familyName}"!`,
        });
      } else if (data.familyAction === 'join' && data.inviteCode) {
        console.log('Joining family with code:', data.inviteCode);
        const family = await joinFamily(data.inviteCode);
        if (family) {
          console.log('Joined family successfully:', family.name);
          
          toast({
            title: `${t('onboarding.welcomeTitle')} ⭐`,
            description: `${t('onboarding.joinedFamily')} "${family.name}"!`,
          });
        } else {
          toast({
            title: t('family.invalidCode'),
            description: t('family.invalidCodeDesc'),
            variant: "destructive",
          });
          return;
        }
      }

      console.log('Onboarding completed, navigating to main page');
      // Small delay to ensure state updates are processed
      setTimeout(() => {
        navigate(ROUTES.main, { replace: true });
      }, 100);
    } catch (error: any) {
      console.error('Onboarding error:', error);
      
      // Check for stale session error (foreign key constraint violation)
      const errorCode = error?.code || error?.message?.includes('23503');
      const isForeignKeyError = errorCode === '23503' || 
        error?.message?.includes('foreign key constraint') ||
        error?.message?.includes('profiles_id_fkey');
      
      if (isForeignKeyError) {
        // Clear all auth state to remove stale session
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.startsWith('app_'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        toast({
          title: t('auth.sessionExpired'),
          description: t('auth.sessionExpiredDesc'),
          variant: "destructive",
        });
        
        // Force redirect to auth page
        window.location.replace('/auth');
        return;
      }
      
      toast({
        title: t('common.error'),
        description: t('common.somethingWentWrong'),
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-family-warm mb-2">
            {t('onboarding.welcomeTitle')} <StarIcon />
          </h1>
          <p className="text-muted-foreground">
            {t('onboarding.completeProfile')}
          </p>
        </div>

        {/* Trial CTA - TODO: Integrate with RevenueCat */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6 text-center space-y-4">
            <h2 className="text-xl font-semibold">{t('onboarding.trialTitle')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('onboarding.trialDesc')}
            </p>
            <Button 
              onClick={() => user?.id && initiateSubscription(user.id)}
              className="w-full"
              disabled={!user?.id}
            >
              {t('onboarding.startTrial')}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('onboarding.setupProfile')}</CardTitle>
            <CardDescription>
              {t('onboarding.setupProfileDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Profile Section */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                    <h3 className="font-medium">{t('onboarding.aboutYou')}</h3>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="displayName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('onboarding.displayName')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('onboarding.displayNamePlaceholder')} {...field} />
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
                        <FormLabel>{t('onboarding.gender')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('onboarding.selectGenderPlaceholder')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">{t('onboarding.male')}</SelectItem>
                            <SelectItem value="female">{t('onboarding.female')}</SelectItem>
                            <SelectItem value="other">{t('onboarding.other')}</SelectItem>
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
                    <h3 className="font-medium">{t('onboarding.joinYourFamily')}</h3>
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
                            <TabsTrigger value="create">{t('family.createFamily')}</TabsTrigger>
                            <TabsTrigger value="join">{t('family.joinFamily')}</TabsTrigger>
                          </TabsList>

                          <TabsContent value="create" className="mt-4">
                            <FormField
                              control={form.control}
                              name="familyName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t('family.familyName')}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={t('onboarding.familyNamePlaceholder')} {...field} />
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
                                  <FormLabel>{t('family.inviteCode')}</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder={t('family.enterInviteCode')} 
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
                  {familyAction === 'create' ? t('onboarding.createAndStart') : t('onboarding.joinAndStart')}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
