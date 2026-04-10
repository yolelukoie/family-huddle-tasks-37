import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';
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

export function AuthPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [showSignupError, setShowSignupError] = useState(false);
  const { signIn, signUp, resetPassword, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGoogleSignIn = async () => {
    try {
      const googleUser = await GoogleAuth.signIn({ scopes: ['profile', 'email'], grantOfflineAccess: false });
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleUser.authentication.idToken,
      });
      if (error) {
        toast({
          title: t('auth.signInFailed'),
          description: error.message,
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      // 12501 = user cancelled the Google sign-in picker on Android
      if (e?.code !== 'popup_closed_by_user' && e?.code !== '12501') {
        toast({
          title: t('auth.signInFailed'),
          description: e?.message,
          variant: 'destructive',
        });
      }
    }
  };

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // Let AppLayout handle the routing based on user state
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast({
        title: t('auth.signInFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.successfullySignedIn'),
      });
      // Let AppLayout handle routing based on user state
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agreedToTerms || !confirmedAge) {
      setShowSignupError(true);
      return;
    }
    
    setShowSignupError(false);
    setIsLoading(true);

    const { error } = await signUp(email, password);
    
    if (error) {
      toast({
        title: t('auth.signUpFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.checkEmail'),
        description: t('auth.confirmationLinkSent'),
      });
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: t('auth.emailRequired'),
        description: t('auth.enterEmailFirst'),
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        title: t('auth.passwordResetFailed'),
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: t('auth.checkEmail'),
        description: t('auth.passwordResetSent'),
      });
      setShowForgotPassword(false);
    }
    
    setIsLoading(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary mb-4">
            {t('auth.appName')}<StarIcon />
          </h1>
          <p className="text-xl text-muted-foreground">
            {t('auth.appDescription')}
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>{t('auth.joinTitle')}</CardTitle>
            <CardDescription>
              {t('auth.joinDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">{t('auth.signIn')}</TabsTrigger>
                <TabsTrigger value="signup">{t('auth.signUp')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {!showForgotPassword ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">{t('auth.email')}</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">{t('auth.password')}</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('auth.passwordPlaceholder')}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? t('auth.signingIn') : t('auth.signIn')}
                    </Button>
                    
                    <div className="relative my-2">
                      <Separator />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                        {t('auth.or', 'or')}
                      </span>
                    </div>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                      onClick={handleGoogleSignIn}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      {t('auth.signInWithGoogle', 'Sign in with Google')}
                    </Button>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        {t('auth.forgotPassword')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="reset-email">{t('auth.email')}</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('auth.emailPlaceholder')}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        {t('auth.backToSignIn')}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email">{t('auth.email')}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('auth.emailPlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">{t('auth.password')}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t('auth.createPasswordPlaceholder')}
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="age-confirmation"
                        checked={confirmedAge}
                        onCheckedChange={(checked) => {
                          setConfirmedAge(checked === true);
                          if (checked) setShowSignupError(false);
                        }}
                        className="mt-0.5"
                      />
                      <Label 
                        htmlFor="age-confirmation" 
                        className="text-sm leading-tight cursor-pointer font-normal"
                      >
                        {t('auth.ageConfirmation')}
                      </Label>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <Checkbox
                          id="terms-agreement"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => {
                            setAgreedToTerms(checked === true);
                            if (checked) setShowSignupError(false);
                          }}
                          className="mt-0.5"
                        />
                        <Label 
                          htmlFor="terms-agreement" 
                          className="text-sm leading-tight cursor-pointer font-normal"
                        >
                          {t('auth.termsAgreement')}
                        </Label>
                      </div>
                      
                      <ScrollArea className="h-32 w-full rounded-md border border-border bg-muted/30 p-3">
                        <div className="text-xs text-muted-foreground space-y-3 pr-3">
                          <p className="font-semibold text-foreground">Terms of Service – Family Huddle</p>
                          <p className="text-[10px]">Last updated: 31 January 2026</p>
                          
                          <p>These Terms of Service ("Terms") govern your use of the Family Huddle application and any related services (together, the "Service"). The Service is owned and operated by Yana Sklyar, Tel Aviv, Israel ("we", "us", "our").</p>
                          
                          <p>By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.</p>
                          
                          <p className="font-medium text-foreground">1. What Family Huddle Is</p>
                          <p>Family Huddle is a family and group task-management app that allows users to create, assign, and track tasks and goals, collaborate with family members and friends, and share progress and feedback.</p>
                          
                          <p className="font-medium text-foreground">2. Eligibility</p>
                          <p>You may use the Service only if you are at least 13 years old, and if you are between 13 and 18 years old, you are using the Service with the permission and supervision of a parent or legal guardian.</p>
                          
                          <p className="font-medium text-foreground">3. Accounts and Security</p>
                          <p>You agree to provide accurate information, keep your login credentials secure, and be responsible for all activity that occurs under your account.</p>
                          
                          <p className="font-medium text-foreground">4. Subscriptions, Payments, and Refunds</p>
                          <p>The standard price for a Family Huddle Premium subscription is $4.90 USD per month. We may offer a free trial period (currently 4 days). Unless you cancel before the end of the free trial, your subscription will automatically start. We do not provide refunds for partial billing periods except where required by applicable law.</p>
                          
                          <p className="font-medium text-foreground">5. Acceptable Use</p>
                          <p>You agree not to use the Service to violate any applicable laws, harass or harm others, share inappropriate content, or attempt unauthorized access to the Service.</p>
                          
                          <p className="font-medium text-foreground">6. User Content</p>
                          <p>You retain ownership of your User Content. By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to store, process, and display your User Content as necessary to operate the Service.</p>
                          
                          <p className="font-medium text-foreground">7. Privacy</p>
                          <p>We collect account data, profile and family data, usage data, and technical data. We use your data to provide and maintain the Service, personalize your experience, enable collaboration, and comply with legal obligations. We do not sell your personal data to third parties.</p>
                          
                          <p className="font-medium text-foreground">8. Disclaimers</p>
                          <p>The Service is provided on an "as is" and "as available" basis, without any warranties of any kind.</p>
                          
                          <p className="font-medium text-foreground">9. Limitation of Liability</p>
                          <p>To the maximum extent permitted by law, we are not liable for any indirect, incidental, special, consequential, or punitive damages.</p>
                          
                          <p className="font-medium text-foreground">10. Governing Law</p>
                          <p>These Terms are governed by the laws of Israel. Any disputes will be subject to the exclusive jurisdiction of the courts in Tel Aviv, Israel.</p>
                          
                          <p className="font-medium text-foreground">Contact</p>
                          <p>Email: support@familyhuddletasks.com</p>
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                  
                  {showSignupError && (!agreedToTerms || !confirmedAge) && (
                    <Alert variant="destructive">
                      <AlertDescription>
                        {!confirmedAge && !agreedToTerms 
                          ? t('auth.ageTermsError')
                          : !confirmedAge 
                            ? t('auth.ageError')
                            : t('auth.termsError')}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary-foreground hover:from-primary/90 hover:to-primary-foreground/90"
                    disabled={isLoading}
                  >
                    {isLoading ? t('auth.creatingAccount') : t('auth.signUp')}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            {t('auth.madeWithLove')}
          </p>
        </div>
      </div>
    </div>
  );
}
