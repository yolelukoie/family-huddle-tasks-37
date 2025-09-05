import { useEffect } from 'react';
import { Badge } from '@/lib/types';

interface BadgeCelebrationProps {
  badge: Badge;
  show: boolean;
  onComplete?: () => void;
}

export function BadgeCelebration({ badge, show, onComplete }: BadgeCelebrationProps) {
  useEffect(() => {
    if (show && onComplete) {
      // Auto-complete after exactly 2 seconds
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 animate-fade-in" />
      
      {/* Falling stars background */}
      <div className="absolute inset-0">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce text-2xl"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: '3s',
            }}
          >
            ⭐
          </div>
        ))}
      </div>

      {/* Badge celebration */}
      <div className="relative bg-white rounded-2xl shadow-2xl p-8 mx-4 text-center animate-scale-in border-4 border-family-celebration">
        <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-family-warm/20 to-family-celebration/20 rounded-full">
          <img 
            src={badge.imagePath}
            alt={`${badge.name} badge`}
            className="w-16 h-16 object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'block';
            }}
          />
          <div className="w-16 h-16 bg-family-celebration/20 rounded-full flex items-center justify-center text-3xl hidden">
            🏆
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-family-celebration mb-2">
          Badge Unlocked!
        </h3>
        
        <h4 className="text-xl font-semibold text-gray-800 mb-2">
          {badge.name}
        </h4>
        
        <p className="text-gray-600 text-lg">
          {badge.description}
        </p>
      </div>
    </div>
  );
}