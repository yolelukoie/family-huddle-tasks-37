import { Badge } from '@/lib/types';

interface BadgeDisplayProps {
  badges: Badge[];
  className?: string;
  scattered?: boolean;
}

export function BadgeDisplay({ badges, className = "", scattered = false }: BadgeDisplayProps) {
  if (badges.length === 0) return null;

  // Predefined positions for scattered layout around a 160x160px character
  const scatteredPositions = [
    { top: '10%', left: '-15%' },
    { top: '5%', right: '-15%' },
    { top: '30%', left: '-20%' },
    { top: '25%', right: '-20%' },
    { top: '50%', left: '-15%' },
    { top: '45%', right: '-15%' },
    { top: '70%', left: '-20%' },
    { top: '65%', right: '-20%' },
    { top: '85%', left: '-10%' },
    { top: '90%', right: '-10%' },
  ];

  if (scattered) {
    return (
      <>
        {badges.map((badge, index) => {
          const position = scatteredPositions[index % scatteredPositions.length];
          return (
            <div 
              key={badge.id} 
              className="absolute w-12 h-12 bg-gradient-to-br from-family-warm/20 to-family-celebration/20 rounded-full border-2 border-family-celebration/30 flex items-center justify-center hover:scale-110 transition-transform duration-200"
              style={position}
              title={`${badge.name}: ${badge.description}`}
            >
              <img
                src={badge.imagePath}
                alt={`${badge.name} badge (${badge.unlockStars} stars)`}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
              <div className="w-8 h-8 bg-family-celebration/10 rounded-full border border-family-celebration/20 flex items-center justify-center text-xs font-bold text-family-celebration hidden">
                {badge.unlockStars}
              </div>
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {badges.map((badge) => (
        <div 
          key={badge.id} 
          className="w-12 h-12 bg-gradient-to-br from-family-warm/20 to-family-celebration/20 rounded-full border-2 border-family-celebration/30 flex items-center justify-center hover:scale-110 transition-transform duration-200"
          title={`${badge.name}: ${badge.description}`}
        >
          <img
            src={badge.imagePath}
            alt={`${badge.name} badge (${badge.unlockStars} stars)`}
            className="w-8 h-8 object-contain"
            onError={(e) => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = 'flex';
            }}
          />
          <div className="w-8 h-8 bg-family-celebration/10 rounded-full border border-family-celebration/20 flex items-center justify-center text-xs font-bold text-family-celebration hidden">
            {badge.unlockStars}
          </div>
        </div>
      ))}
    </div>
  );
}