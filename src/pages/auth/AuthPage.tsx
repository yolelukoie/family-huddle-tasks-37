import { useState, useEffect } from 'react';
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
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in.",
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
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email!",
        description: "We've sent you a confirmation link.",
      });
    }
    
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address first.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    const { error } = await resetPassword(email);
    
    if (error) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Check your email!",
        description: "We've sent you a password reset link.",
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
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-primary mb-4">
            Family Huddle<StarIcon />
          </h1>
          <p className="text-xl text-muted-foreground">
            Create families with relatives or friends, assign tasks to each other, and earn stars to level up your characters. Build real habits—and tighter bonds—through play.
          </p>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Join Family Huddle</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                {!showForgotPassword ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div>
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="signin-password">Password</Label>
                      <Input
                        id="signin-password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Signing in...' : 'Sign In'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot password?
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <Label htmlFor="reset-email">Email</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Sending reset link...' : 'Send Reset Link'}
                    </Button>
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        className="text-sm text-muted-foreground"
                        onClick={() => setShowForgotPassword(false)}
                      >
                        Back to sign in
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a password"
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
                        I confirm that I am 13 years of age or older
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
                          I agree to the Terms of Use
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
                          ? "Please confirm your age and agree to the Terms of Use to create an account."
                          : !confirmedAge 
                            ? "You must be 13 years or older to use Family Huddle."
                            : "Please agree to the Terms of Use to create an account."}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-primary to-primary-foreground hover:from-primary/90 hover:to-primary-foreground/90"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Creating account...' : 'Sign Up'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>
            Made with ❤️ for families everywhere
          </p>
        </div>
      </div>
    </div>
  );
}