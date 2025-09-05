import { useEffect } from 'react';
import milestoneImage from '@/assets/milestone-celebration.png';

interface MilestoneCelebrationProps {
  show: boolean;
  onComplete: () => void;
}

export function MilestoneCelebration({ show, onComplete }: MilestoneCelebrationProps) {
  useEffect(() => {
    if (show) {
      // Auto-complete after 3 seconds
      const timer = setTimeout(() => {
        onComplete();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in">
      <div className="w-full h-full flex items-center justify-center p-4">
        <img 
          src="/lovable-uploads/c06507e8-c72e-4574-aa64-1f4d72c185a1.png"
          alt="Milestone Celebration - Character completed their full story"
          className="w-full h-full object-contain max-w-md max-h-screen"
        />
      </div>
    </div>
  );
}