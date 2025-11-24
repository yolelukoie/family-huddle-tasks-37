import React, { useState, useRef, useEffect } from 'react';
import { Badge } from '@/lib/types';

interface DraggableBadgeDisplayProps {
  badges: Badge[];
  familyId: string;
  userId: string;
  className?: string;
  containerBounds?: { width: number; height: number };
}

interface BadgePosition {
  id: string;
  x: number;
  y: number;
}

export function DraggableBadgeDisplay({ 
  badges, 
  familyId, 
  userId, 
  className = "", 
  containerBounds = { width: 320, height: 320 } 
}: DraggableBadgeDisplayProps) {
  const [badgePositions, setBadgePositions] = useState<BadgePosition[]>([]);
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    badgeId: string | null;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
  }>({
    isDragging: false,
    badgeId: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Badge size in px (w-12 h-12)
  const BADGE_SIZE = 48;
  const PADDING = 8;
  const w = containerBounds.width;
  const h = containerBounds.height;
  const maxX = Math.max(0, w - BADGE_SIZE);
  const maxY = Math.max(0, h - BADGE_SIZE);

  // Default positions inside the container area
  const defaultPositions = [
    { x: PADDING, y: PADDING },
    { x: Math.max(PADDING, maxX), y: PADDING },
    { x: PADDING, y: Math.max(PADDING, maxY) },
    { x: Math.max(PADDING, maxX), y: Math.max(PADDING, maxY) },
    { x: Math.max(0, (w - BADGE_SIZE) / 2), y: PADDING },
    { x: Math.max(0, (w - BADGE_SIZE) / 2), y: Math.max(PADDING, maxY) },
    { x: PADDING, y: Math.max(0, (h - BADGE_SIZE) / 2) },
    { x: Math.max(PADDING, maxX), y: Math.max(0, (h - BADGE_SIZE) / 2) },
    { x: Math.max(0, (w - BADGE_SIZE) / 2), y: Math.max(0, (h - BADGE_SIZE) / 2) },
    { x: Math.max(PADDING, maxX * 0.25), y: Math.max(PADDING, maxY * 0.65) },
  ];

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));
  const clampPosition = (x: number, y: number) => ({
    x: clamp(x, 0, maxX),
    y: clamp(y, 0, maxY),
  });

  // Load saved positions from localStorage on mount or when bounds change
  useEffect(() => {
    const key = `badge-positions-${familyId}-${userId}`;
    const saved = localStorage.getItem(key);

    const buildInitial = () => badges.map((badge, index) => {
      const d = defaultPositions[index % defaultPositions.length];
      const clamped = clampPosition(d.x, d.y);
      return { id: badge.id, x: clamped.x, y: clamped.y };
    });

    try {
      if (saved) {
        const parsed = JSON.parse(saved) as
          | BadgePosition[]
          | { width: number; height: number; positions: BadgePosition[] };

        let savedWidth = w;
        let savedHeight = h;
        let positions: BadgePosition[] | null = null;

        if (Array.isArray(parsed)) {
          // Legacy format: plain array of positions saved when container was 320x160
          savedWidth = 320;
          savedHeight = 160;
          positions = parsed;
        } else if (parsed && Array.isArray(parsed.positions)) {
          savedWidth = parsed.width || w;
          savedHeight = parsed.height || h;
          positions = parsed.positions;
        }

        if (positions) {
          const scaleX = savedWidth ? w / savedWidth : 1;
          const scaleY = savedHeight ? h / savedHeight : 1;

          const scaled = positions.map((p) => {
            const scaledX = p.x * scaleX;
            const scaledY = p.y * scaleY;
            const clamped = clampPosition(scaledX, scaledY);
            return { id: p.id, x: clamped.x, y: clamped.y };
          });

          setBadgePositions(scaled);
          return;
        }
      }

      // Fallback: build fresh positions
      setBadgePositions(buildInitial());
    } catch {
      setBadgePositions(buildInitial());
    }
  }, [badges, familyId, userId, w, h]);

  // Save positions (with bounds metadata) to localStorage whenever they change
  useEffect(() => {
    if (badgePositions.length > 0) {
      const payload = {
        width: w,
        height: h,
        positions: badgePositions,
      };
      localStorage.setItem(`badge-positions-${familyId}-${userId}`, JSON.stringify(payload));
    }
  }, [badgePositions, familyId, userId, w, h]);

  const getBadgePosition = (badgeId: string) => {
    const position = badgePositions.find(p => p.id === badgeId);
    if (!position) {
      const index = badges.findIndex(b => b.id === badgeId);
      const defaultPos = defaultPositions[index % defaultPositions.length];
      return { x: defaultPos.x, y: defaultPos.y };
    }
    return { x: position.x, y: position.y };
  };

  const handlePointerDown = (e: React.PointerEvent, badgeId: string) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const position = getBadgePosition(badgeId);
    
    setDragState({
      isDragging: true,
      badgeId,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging || !dragState.badgeId || !containerRef.current) return;

    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;

    const { x, y } = clampPosition(dragState.initialX + deltaX, dragState.initialY + deltaY);

    setBadgePositions(prev => {
      const updated = prev.filter(p => p.id !== dragState.badgeId);
      return [...updated, { id: dragState.badgeId!, x, y }];
    });
  };

  const handlePointerUp = () => {
    setDragState({
      isDragging: false,
      badgeId: null,
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
    });
  };

  if (badges.length === 0) return null;

  const isAbsolute = className?.includes('absolute') || className?.includes('fixed');

  return (
    <div 
      ref={containerRef}
      className={`${isAbsolute ? '' : 'relative'} ${className}`}
      style={isAbsolute ? undefined : { width: `${containerBounds.width}px`, height: `${containerBounds.height}px` }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {badges.map((badge) => {
        const position = getBadgePosition(badge.id);
        const isDragging = dragState.isDragging && dragState.badgeId === badge.id;
        
        return (
          <div
            key={badge.id}
            className={`absolute w-12 h-12 bg-gradient-to-br from-family-warm/20 to-family-celebration/20 rounded-full border-2 border-family-celebration/30 flex items-center justify-center transition-transform duration-200 cursor-grab active:cursor-grabbing select-none ${
              isDragging ? 'scale-110 z-10' : 'hover:scale-105'
            }`}
            style={{ 
              left: position.x, 
              top: position.y,
              touchAction: 'none',
            }}
            title={`${badge.name}: ${badge.description}`}
            onPointerDown={(e) => handlePointerDown(e, badge.id)}
          >
            <img
              src={badge.imagePath}
              alt={`${badge.name} badge (${badge.unlockStars} stars)`}
              className="w-8 h-8 object-contain pointer-events-none"
              draggable={false}
              onError={(e) => {
                const target = e.currentTarget;
                target.style.display = 'none';
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div className="w-8 h-8 bg-family-celebration/10 rounded-full border border-family-celebration/20 flex items-center justify-center text-xs font-bold text-family-celebration hidden pointer-events-none">
              {badge.unlockStars}
            </div>
          </div>
        );
      })}
    </div>
  );
}