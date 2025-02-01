import React, { useState, useEffect, useCallback } from 'react';
import { Event } from '../types/Event';
import { format } from 'date-fns';

interface TimelineProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const Timeline: React.FC<TimelineProps> = ({ events, onEventClick }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState<Date>(events[0]?.date || new Date());
  const [progress, setProgress] = useState(0);

  const timeRange = events.reduce(
    (acc, event) => ({
      min: Math.min(acc.min, event.date.getTime()),
      max: Math.max(acc.max, event.date.getTime()),
    }),
    { min: Infinity, max: -Infinity }
  );

  const getPosition = useCallback((date: Date) => 
    ((date.getTime() - timeRange.min) / (timeRange.max - timeRange.min)) * 100,
  [timeRange]);

  const isEventActive = useCallback((eventDate: Date) => {
    return Math.abs(eventDate.getTime() - currentTime.getTime()) < 86400000; // Within 24 hours
  }, [currentTime]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (isPlaying) {
      intervalId = setInterval(() => {
        setCurrentTime(prevTime => {
          const newTime = new Date(prevTime.getTime() + 86400000);
          if (newTime.getTime() > timeRange.max) {
            setIsPlaying(false);
            return new Date(timeRange.min);
          }
          return newTime;
        });
      }, 100);
    }

    return () => clearInterval(intervalId);
  }, [isPlaying, timeRange]);

  useEffect(() => {
    setProgress(getPosition(currentTime));
  }, [currentTime, getPosition]);

  return (
    <>
      {/* Background gradient overlay */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/80 to-transparent" />
      
      {/* Timeline container */}
      <div className="fixed bottom-0 left-0 right-0 pb-6 pt-12 px-8">
        {/* Main content */}
        <div className="max-w-7xl mx-auto">
          {/* Date and Controls row */}
          <div className="flex items-center justify-between mb-6">
            {/* Date Display */}
            <h3 className="text-lg font-medium text-white/90">
              {format(currentTime, 'MMMM d, yyyy')}
            </h3>
            
            {/* Controls */}
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm
                transition-all duration-200 flex items-center justify-center group"
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/90" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>

          {/* Timeline Track */}
          <div className="relative h-1 bg-white/5 rounded-full">
            {/* Progress Bar */}
            <div 
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500/60 to-blue-400/60 rounded-full 
                transition-all duration-300 ease-out backdrop-blur-sm"
              style={{ width: `${progress}%` }}
            />
            
            {/* Event Dots */}
            {events.map(event => {
              const active = isEventActive(event.date);
              const position = getPosition(event.date);
              
              const severityColor = event.severity === 'high' 
                ? 'bg-red-500/80' 
                : event.severity === 'medium'
                  ? 'bg-amber-500/80'
                  : 'bg-emerald-500/80';
              
              const severityGlow = event.severity === 'high'
                ? 'shadow-red-500/30'
                : event.severity === 'medium'
                  ? 'shadow-amber-500/30'
                  : 'shadow-emerald-500/30';

              return (
                <button
                  key={event.id}
                  onClick={() => {
                    onEventClick(event);
                    setCurrentTime(event.date);
                  }}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-2 rounded-full 
                    ${severityColor} ${severityGlow}
                    transition-all duration-300 hover:scale-150 backdrop-blur-sm
                    ${active ? 'scale-150 shadow-lg z-20' : 'shadow-md z-10'}
                  `}
                  style={{ left: `${position}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Timeline;
