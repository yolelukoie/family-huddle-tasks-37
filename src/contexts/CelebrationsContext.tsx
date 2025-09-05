import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Badge, Goal } from '@/lib/types';

export type CelebrationItem = 
  | { type: 'badge'; badge: Badge }
  | { type: 'goal'; goal: Goal };

export interface CelebrationState {
  item: CelebrationItem;
  show: boolean;
}

interface CelebrationsContextType {
  currentCelebration: CelebrationState | null;
  addCelebration: (item: CelebrationItem) => void;
  completeCelebration: () => void;
}

const CelebrationsContext = createContext<CelebrationsContextType | null>(null);

export function CelebrationsProvider({ children }: { children: React.ReactNode }) {
  const [currentCelebration, setCurrentCelebration] = useState<CelebrationState | null>(null);
  const [celebrationQueue, setCelebrationQueue] = useState<CelebrationItem[]>([]);

  const addCelebration = useCallback((item: CelebrationItem) => {
    setCelebrationQueue(prev => [...prev, item]);
  }, []);

  const processCelebrationQueue = useCallback(() => {
    if (celebrationQueue.length > 0 && !currentCelebration) {
      const nextItem = celebrationQueue[0];
      setCelebrationQueue(prev => prev.slice(1));
      
      setCurrentCelebration({ item: nextItem, show: true });
      
      // Auto-dismiss after exactly 2 seconds
      setTimeout(() => {
        setCurrentCelebration(prev => prev ? { ...prev, show: false } : null);
        // Clear after fade animation
        setTimeout(() => setCurrentCelebration(null), 300);
      }, 2000);
    }
  }, [celebrationQueue, currentCelebration]);

  // Process celebration queue
  useEffect(() => {
    const timer = setTimeout(processCelebrationQueue, 100);
    return () => clearTimeout(timer);
  }, [processCelebrationQueue]);

  const completeCelebration = useCallback(() => {
    setCurrentCelebration(null);
  }, []);

  return (
    <CelebrationsContext.Provider value={{
      currentCelebration,
      addCelebration,
      completeCelebration,
    }}>
      {children}
    </CelebrationsContext.Provider>
  );
}

export function useCelebrations() {
  const context = useContext(CelebrationsContext);
  if (!context) {
    throw new Error('useCelebrations must be used within a CelebrationsProvider');
  }
  return context;
}