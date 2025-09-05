import { useEffect, useState } from 'react';
import { ProfileStep } from './ProfileStep';
import { FamilyStep } from './FamilyStep';
import { useAuth } from '@/hooks/useAuth';

export default function OnboardingPage() {
  const { user, isLoading } = useAuth();
  const [currentStep, setCurrentStep] = useState<'profile' | 'family'>(
    user?.profileComplete ? 'family' : 'profile'
  );

  useEffect(() => {
    if (!isLoading && user?.profileComplete) {
      setCurrentStep('family');
    }
  }, [isLoading, user]);
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

        {currentStep === 'profile' && (
          <ProfileStep onComplete={() => setCurrentStep('family')} />
        )}
        
        {currentStep === 'family' && (
          <FamilyStep />
        )}
      </div>
    </div>
  );
}