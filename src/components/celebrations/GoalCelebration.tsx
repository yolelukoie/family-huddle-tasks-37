import { useTranslation } from 'react-i18next';
import { Goal } from '@/lib/types';

interface GoalCelebrationProps {
  goal: Goal;
  show: boolean;
  onComplete: () => void;
}

export function GoalCelebration({ goal, show, onComplete }: GoalCelebrationProps) {
  const { t } = useTranslation();
  
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      {/* Fireworks Container */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Firework 1 */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" 
             style={{ animationDelay: '0s' }}>
          <div className="absolute inset-0 bg-yellow-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Firework 2 */}
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-red-400 rounded-full animate-ping" 
             style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-red-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Firework 3 */}
        <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping" 
             style={{ animationDelay: '0.6s' }}>
          <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Firework 4 */}
        <div className="absolute top-3/4 right-1/3 w-2 h-2 bg-green-400 rounded-full animate-ping" 
             style={{ animationDelay: '0.9s' }}>
          <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Firework 5 */}
        <div className="absolute top-1/4 right-1/2 w-2 h-2 bg-purple-400 rounded-full animate-ping" 
             style={{ animationDelay: '1.2s' }}>
          <div className="absolute inset-0 bg-purple-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Falling stars */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-3 h-3 bg-yellow-300 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: '-12px',
              animation: `fallingStar ${(2 + Math.random() * 3) / 1.5}s linear infinite`,
              animationDelay: `${Math.random() * 2 / 1.5}s`
            }}
          />
        ))}
      </div>

      {/* Goal Celebration Content */}
      <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl animate-scale-in">
        <div className="space-y-6">
          {/* Celebration Text */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-gray-900">{t('celebrations.goalReached')}</h1>
            <h2 className="text-2xl font-semibold text-family-celebration">{t('celebrations.youAreAmazing')}</h2>
            <p className="text-gray-600" style={{ whiteSpace: 'pre-line' }}>
              {t('celebrations.thanksForEfforts')}
            </p>
          </div>

          {/* Goal Details */}
          <div className="bg-family-warm/10 rounded-lg p-4 space-y-2">
            <p className="text-sm text-gray-700">
              <span className="font-medium">{t('celebrations.target')}:</span> {goal.targetStars} {t('main.stars')}
            </p>
            {goal.reward && (
              <p className="text-sm text-gray-700">
                <span className="font-medium">{t('celebrations.yourReward')}:</span> {goal.reward}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}