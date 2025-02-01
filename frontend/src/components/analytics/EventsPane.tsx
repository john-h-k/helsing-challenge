import React from 'react';
import { Event } from '../../types/Event';

interface EventsPaneProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventSelect: (event: Event) => void;
}

const EventsPane: React.FC<EventsPaneProps> = ({ events, selectedEvent, onEventSelect }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          Events
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {events.map(event => (
            <button
              key={event.id}
              onClick={() => onEventSelect(event)}
              className={`w-full text-left p-4 rounded-lg border transition-all duration-200
                ${selectedEvent?.id === event.id 
                  ? 'bg-white/10 border-white/20' 
                  : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
            >
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-white/90">{event.title}</h3>
                <span className={`px-2 py-1 rounded-full text-xs font-medium
                  ${event.severity === 'high' ? 'bg-red-500/20 text-red-400' :
                    event.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'}`}>
                  {event.severity}
                </span>
              </div>
              <p className="mt-2 text-sm text-white/60">{event.description}</p>
              {selectedEvent?.id === event.id && (
                <div className="mt-4 space-y-2 text-sm text-white/70">
                  <p>Source: {event.source}</p>
                  <p>Location: {event.location}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EventsPane;
