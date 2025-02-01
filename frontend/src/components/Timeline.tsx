import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { Event } from '../types/Event';
import { format } from 'date-fns';

const TimelineContainer = styled.div`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.95) 0%, rgba(10, 10, 10, 0.95) 100%);
  padding: 20px;
  border-radius: 20px;
  width: 90%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const PlayButton = styled.button<{ isPlaying: boolean }>`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  color: white;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.05);
  }

  svg {
    width: 20px;
    height: 20px;
    fill: currentColor;
  }
`;

const TimelineTrack = styled.div`
  position: relative;
  height: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.05) 100%);
  border-radius: 2px;
  margin: 20px 0;
`;

const Progress = styled.div<{ width: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${props => props.width}%;
  background: linear-gradient(90deg, rgba(64,156,255,0.5), rgba(64,156,255,0.8));
  border-radius: 2px;
  transition: width 0.3s ease;
`;

const EventDot = styled.div<{ position: number; severity: string; active: boolean }>`
  position: absolute;
  left: ${props => props.position}%;
  top: 50%;
  transform: translate(-50%, -50%) scale(${props => props.active ? 1.5 : 1});
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: ${props => 
    props.severity === 'high' ? 'rgba(255, 68, 68, 0.9)' : 
    props.severity === 'medium' ? 'rgba(255, 170, 0, 0.9)' : 
    'rgba(0, 170, 0, 0.9)'};
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 20px ${props => 
    props.severity === 'high' ? 'rgba(255, 68, 68, 0.5)' : 
    props.severity === 'medium' ? 'rgba(255, 170, 0, 0.5)' : 
    'rgba(0, 170, 0, 0.5)'};
  z-index: ${props => props.active ? 2 : 1};

  &:hover {
    transform: translate(-50%, -50%) scale(1.5);
  }
`;

const DateDisplay = styled.div`
  text-align: center;
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 12px;
  letter-spacing: 0.5px;
`;

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
          const newTime = new Date(prevTime.getTime() + 86400000); // Add one day
          if (newTime.getTime() > timeRange.max) {
            setIsPlaying(false);
            return new Date(timeRange.min);
          }
          return newTime;
        });
      }, 100); // Speed of playback
    }

    return () => clearInterval(intervalId);
  }, [isPlaying, timeRange]);

  useEffect(() => {
    setProgress(getPosition(currentTime));
  }, [currentTime, getPosition]);

  return (
    <TimelineContainer>
      <DateDisplay>
        {format(currentTime, 'MMMM d, yyyy')}
      </DateDisplay>
      
      <Controls>
        <PlayButton 
          isPlaying={isPlaying} 
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? (
            <svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          )}
        </PlayButton>
      </Controls>

      <TimelineTrack>
        <Progress width={progress} />
        {events.map(event => (
          <EventDot
            key={event.id}
            position={getPosition(event.date)}
            severity={event.severity}
            active={isEventActive(event.date)}
            onClick={() => {
              onEventClick(event);
              setCurrentTime(event.date);
            }}
          />
        ))}
      </TimelineTrack>
    </TimelineContainer>
  );
};

export default Timeline;
