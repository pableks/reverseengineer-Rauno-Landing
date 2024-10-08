import React, { useState, useRef, useEffect, useCallback } from 'react';

const IOSVolumeSlider = ({ value, onChange, min = 0, max = 1, step = 0.01 }) => {
  const sliderRef = useRef(null);
  const isDraggingRef = useRef(false);
  const [localValue, setLocalValue] = useState(value);
  const rectRef = useRef(null);
  const animationFrameRef = useRef(null);

  const updateValue = useCallback((clientX) => {
    if (rectRef.current) {
      const x = clientX - rectRef.current.left;
      const newValue = Math.max(min, Math.min(max, min + (x / rectRef.current.width) * (max - min)));
      const roundedValue = Math.round(newValue / step) * step;
      setLocalValue(roundedValue);
      onChange(roundedValue);
    }
  }, [min, max, step, onChange]);

  const handleStart = useCallback((clientX) => {
    rectRef.current = sliderRef.current.getBoundingClientRect();
    isDraggingRef.current = true;
    updateValue(clientX);
    e.stopPropagation();
  }, [updateValue]);

  const handleMove = useCallback((clientX) => {
    
    if (isDraggingRef.current) {
      if (animationFrameRef.current === null) {
        animationFrameRef.current = requestAnimationFrame(() => {
          updateValue(clientX);
          animationFrameRef.current = null;
        });
      }
    }
  }, [updateValue]);

  const handleEnd = useCallback(() => {
    isDraggingRef.current = false;
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const handleMouseMove = (e) => handleMove(e.clientX);
    const handleTouchMove = (e) => handleMove(e.touches[0].clientX);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [handleMove, handleEnd]);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const percentage = ((localValue - min) / (max - min)) * 100;

  return (
    <div className="w-full mx-auto">
      <div className="relative pt-1">
        <div
          ref={sliderRef}
          className="h-4 mb-4 rounded-lg bg-gray-200 cursor-pointer"
          onMouseDown={(e) => handleStart(e.clientX)}
          onTouchStart={(e) => handleStart(e.touches[0].clientX)}
        >
          <div
            style={{ width: `${percentage}%` }}
            className="h-full rounded-lg bg-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

export default React.memo(IOSVolumeSlider);