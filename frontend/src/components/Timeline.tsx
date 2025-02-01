import React, { useState, useEffect, useCallback } from 'react';
import { Event } from '../types/Event';
import { format } from 'date-fns';

interface TimelineProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventClick: (event: Event) => void;
}

const Timeline: React.FC<TimelineProps> = ({ events, selectedEvent, onEventClick }) => {
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
      {/* Remove this highlight overlay */}
      {/* <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-48 
        bg-gradient-to-t from-gray-900/90 to-transparent" /> */}

      <div className="fixed bottom-0 left-0 right-0 pb-8 pt-12 px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white/90">
              {format(currentTime, 'MMMM d, yyyy')}
            </h3>
            
            <button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="w-10 h-10 rounded-full bg-gray-900/50 hover:bg-white/10 
                border border-white/10 backdrop-blur-sm transition-all duration-200 
                flex items-center justify-center group"
            >
              {isPlaying ? (
                <svg className="w-4 h-4 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-4 h-4 text-white/90" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>
          </div>

          <div className="relative h-1 bg-gray-900/50 rounded-full backdrop-blur-sm 
            border border-white/5">
            <div 
              className="absolute left-0 top-0 h-full bg-blue-500/30 
                rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
            
            {events.map(event => {
              const active = event === selectedEvent || isEventActive(event.date);
              const position = getPosition(event.date);
              
              return (
                <button
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 
                    transition-all duration-300 hover:scale-150 group`}
                  style={{ left: `${position}%` }}
                >
                  <div className={`w-2 h-2 rounded-full 
                    ${event.severity === 'high' ? 'bg-red-500' :
                      event.severity === 'medium' ? 'bg-amber-500' :
                      'bg-emerald-500'}
                    ${active ? 'scale-150' : 'scale-100'}
                    transition-transform duration-300`}
                  />
                  <div className={`absolute -inset-2 rounded-full blur 
                    ${event.severity === 'high' ? 'bg-red-500' :
                      event.severity === 'medium' ? 'bg-amber-500' :
                      'bg-emerald-500'}
                    opacity-0 group-hover:opacity-30 transition-opacity duration-300
                    ${active ? 'opacity-30' : ''}`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
};

export default Timeline;
