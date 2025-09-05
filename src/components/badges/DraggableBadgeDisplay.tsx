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

  // Default scattered positions for initial badge placement
  const defaultPositions = [
    { x: 15, y: 32 },    // top-left
    { x: 85, y: 16 },    // top-right  
    { x: 5, y: 96 },     // left-mid
    { x: 95, y: 80 },    // right-mid
    { x: 20, y: 160 },   // left-lower
    { x: 80, y: 144 },   // right-lower
    { x: 10, y: 224 },   // bottom-left
    { x: 90, y: 240 },   // bottom-right
    { x: 45, y: 8 },     // top-center
    { x: 55, y: 280 },   // bottom-center
  ];

  // Load saved positions from localStorage on mount
  useEffect(() => {
    const savedPositions = localStorage.getItem(`badge-positions-${familyId}-${userId}`);
    if (savedPositions) {
      setBadgePositions(JSON.parse(savedPositions));
    } else {
      // Initialize with default positions
      const initialPositions = badges.map((badge, index) => {
        const defaultPos = defaultPositions[index % defaultPositions.length];
        return {
          id: badge.id,
          x: defaultPos.x,
          y: defaultPos.y,
        };
      });
      setBadgePositions(initialPositions);
    }
  }, [badges, familyId, userId]);

  // Save positions to localStorage whenever they change
  useEffect(() => {
    if (badgePositions.length > 0) {
      localStorage.setItem(`badge-positions-${familyId}-${userId}`, JSON.stringify(badgePositions));
    }
  }, [badgePositions, familyId, userId]);

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

    const rect = containerRef.current.getBoundingClientRect();
    const deltaX = e.clientX - dragState.startX;
    const deltaY = e.clientY - dragState.startY;
    
    // Calculate new position relative to container
    const newX = Math.max(0, Math.min(containerBounds.width - 48, dragState.initialX + deltaX));
    const newY = Math.max(0, Math.min(containerBounds.height - 48, dragState.initialY + deltaY));

    setBadgePositions(prev => {
      const updated = prev.filter(p => p.id !== dragState.badgeId);
      return [...updated, { id: dragState.badgeId!, x: newX, y: newY }];
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

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{ width: containerBounds.width, height: containerBounds.height }}
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