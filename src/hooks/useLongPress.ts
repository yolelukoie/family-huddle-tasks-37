import { useCallback, useEffect, useRef, useState } from 'react';
import type React from 'react';

interface UseLongPressOptions {
  onLongPress: () => void;
  onClick?: () => void;
  delayMs?: number;
  movementThresholdPx?: number;
  pressVisualDelayMs?: number;
  disabled?: boolean;
}

export function useLongPress({
  onLongPress,
  onClick,
  delayMs = 1000,
  movementThresholdPx = 10,
  pressVisualDelayMs = 280,
  disabled = false,
}: UseLongPressOptions) {
  const [isPressing, setIsPressing] = useState(false);

  const longPressTimerRef = useRef<number | null>(null);
  const visualTimerRef = useRef<number | null>(null);
  const startCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const longPressFiredRef = useRef(false);
  const canceledRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (visualTimerRef.current !== null) {
      window.clearTimeout(visualTimerRef.current);
      visualTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    startCoordsRef.current = null;
    pointerIdRef.current = null;
    longPressFiredRef.current = false;
    canceledRef.current = false;
    setIsPressing(false);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (disabled) return;
    reset();
    startCoordsRef.current = { x: e.clientX, y: e.clientY };
    pointerIdRef.current = e.pointerId;
    visualTimerRef.current = window.setTimeout(() => setIsPressing(true), pressVisualDelayMs);
    longPressTimerRef.current = window.setTimeout(() => {
      longPressFiredRef.current = true;
      setIsPressing(false);
      clearTimers();
      onLongPress();
    }, delayMs);
  }, [disabled, reset, clearTimers, onLongPress, delayMs, pressVisualDelayMs]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startCoordsRef.current || pointerIdRef.current !== e.pointerId) return;
    const dx = e.clientX - startCoordsRef.current.x;
    const dy = e.clientY - startCoordsRef.current.y;
    if (Math.sqrt(dx * dx + dy * dy) > movementThresholdPx) {
      canceledRef.current = true;
      clearTimers();
      setIsPressing(false);
    }
  }, [clearTimers, movementThresholdPx]);

  const onPointerUp = useCallback(() => {
    if (!longPressFiredRef.current && !canceledRef.current && onClick) {
      onClick();
    }
    reset();
  }, [reset, onClick]);

  const onPointerCancel = useCallback(() => reset(), [reset]);
  const onPointerLeave = useCallback((e: React.PointerEvent) => {
    if (pointerIdRef.current === e.pointerId) reset();
  }, [reset]);

  return {
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onPointerLeave },
    isPressing,
  };
}
