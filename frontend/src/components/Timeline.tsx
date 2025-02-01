import React, { useState } from "react";
import styled from "@emotion/styled";
import { Event } from "../types/Event";
import { format } from "date-fns";

const TimelineContainer = styled.div`
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.85);
  padding: 15px;
  border-radius: 15px;
  width: 90%;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const TimelineTrack = styled.div`
  position: relative;
  height: 2px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.05) 0%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(255, 255, 255, 0.05) 100%
  );
  border-radius: 1px;
  margin: 20px 0;
`;

interface EventDotProps {
  position: number;
  severity: string;
  isHovered: boolean;
}

const EventDot = styled.div<EventDotProps>`
  position: absolute;
  left: ${(props) => props.position}%;
  top: 50%;
  transform: translate(-50%, -50%)
    scale(${(props) => (props.isHovered ? 1.5 : 1)});
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${(props) =>
    props.severity === "high"
      ? "rgba(255, 68, 68, 0.9)"
      : props.severity === "medium"
      ? "rgba(255, 170, 0, 0.9)"
      : "rgba(0, 170, 0, 0.9)"};
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 0 10px
    ${(props) =>
      props.severity === "high"
        ? "rgba(255, 68, 68, 0.5)"
        : props.severity === "medium"
        ? "rgba(255, 170, 0, 0.5)"
        : "rgba(0, 170, 0, 0.5)"};

  &:hover {
    transform: translate(-50%, -50%) scale(1.5);
  }
`;

const DateLabel = styled.div`
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
`;

interface TimelineProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const Timeline: React.FC<TimelineProps> = ({ events, onEventClick }) => {
  const timeRange = events.reduce(
    (acc, event) => ({
      min: Math.min(acc.min, event.date.getTime()),
      max: Math.max(acc.max, event.date.getTime()),
    }),
    { min: Infinity, max: -Infinity }
  );

  const getPosition = (date: Date) =>
    ((date.getTime() - timeRange.min) / (timeRange.max - timeRange.min)) * 100;

  return (
    <TimelineContainer>
      <TimelineTrack>
        {events.map((event) => (
          <React.Fragment key={event.id}>
            <EventDot
              position={getPosition(event.date)}
              severity={event.severity}
              isHovered={false}
              onClick={() => onEventClick(event)}
              onMouseEnter={() => {
                /* Add hover state handling if needed */
              }}
            />
            <DateLabel style={{ left: `${getPosition(event.date)}%` }}>
              {format(event.date, "MMM d")}
            </DateLabel>
          </React.Fragment>
        ))}
      </TimelineTrack>
    </TimelineContainer>
  );
};

export default Timeline;
