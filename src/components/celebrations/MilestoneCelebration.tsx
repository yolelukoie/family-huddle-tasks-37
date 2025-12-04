import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import milestoneImage from '@/assets/milestone-celebration.png';

interface MilestoneCelebrationProps {
  show: boolean;
  onComplete: () => void;
}

export function MilestoneCelebration({ show, onComplete }: MilestoneCelebrationProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (show) {
      // Auto-complete after 5 seconds (longer to read the message)
      const timer = setTimeout(() => {
        onComplete();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

  if (!show) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center animate-fade-in cursor-pointer"
      onClick={onComplete}
    >
      <div className="w-full max-w-md flex flex-col items-center justify-center p-6 text-center">
        {/* Title over image */}
        <h1 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
          {t('celebrations.amazingJob')}
        </h1>
        
        {/* Celebration image */}
        <img 
          src={milestoneImage}
          alt="Milestone Celebration"
          className="w-64 h-64 object-contain mb-6"
        />
        
        {/* Message below image */}
        <p className="text-lg text-white/90 leading-relaxed">
          {t('celebrations.characterCompleted')}
        </p>
        <p className="text-lg text-white/90 leading-relaxed mt-2">
          {t('celebrations.newChapter')}
        </p>
      </div>
    </div>
  );
}