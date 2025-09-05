import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, Users, Target, Trophy } from 'lucide-react';

export function WaitlistPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-primary to-primary-foreground bg-clip-text text-transparent mb-4">
            Family Stars ⭐
          </h1>
          <p className="text-xl text-muted-foreground mb-6">
            Transform chores into adventures. Build stronger family bonds through gamified task management.
          </p>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            🚀 Coming Soon - Join the Waitlist!
          </Badge>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <Star className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Earn Stars</CardTitle>
              <CardDescription>
                Complete tasks and chores to earn stars and unlock rewards
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Family Teamwork</CardTitle>
              <CardDescription>
                Work together as a family to achieve shared goals and milestones
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Trophy className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Level Up</CardTitle>
              <CardDescription>
                Watch your family character grow and evolve as you complete more tasks
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Ready to Transform Your Family?</CardTitle>
            <CardDescription>
              Be the first to experience the magic of Family Stars
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SignedOut>
              <div className="space-y-2">
                <SignUpButton mode="modal" fallbackRedirectUrl="/">
                  <Button className="w-full bg-gradient-to-r from-primary to-primary-foreground hover:from-primary/90 hover:to-primary-foreground/90">
                    Join the Waitlist
                  </Button>
                </SignUpButton>
                <p className="text-center text-sm text-muted-foreground">
                  Already have an account?{' '}
                  <SignInButton mode="modal" fallbackRedirectUrl="/">
                    <button className="text-primary hover:underline font-medium">
                      Sign in
                    </button>
                  </SignInButton>
                </p>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="text-center space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm text-muted-foreground">You're on the waitlist!</span>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h3 className="font-semibold text-primary mb-2">🎉 You're In!</h3>
                  <p className="text-sm text-muted-foreground">
                    Thanks for joining our waitlist. We'll notify you as soon as Family Stars is ready!
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  We're working hard to bring you the best family task management experience.
                </p>
              </div>
            </SignedIn>
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