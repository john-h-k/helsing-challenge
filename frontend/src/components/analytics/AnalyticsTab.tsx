import React, { useState } from 'react';
import { Event } from '../../types/Event';
import EventsPane from './EventsPane';
import DecisionPane from './DecisionPane';

interface AnalyticsTabProps {
  events: Event[];
  loading: boolean
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ events, loading }) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(null);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Events Pane */}
      <div className="w-1/3 border-r border-white/5 bg-gradient-to-b from-gray-900/95 to-gray-800/95">
        <EventsPane 
          events={events}
          selectedEvent={selectedEvent}
          onEventSelect={setSelectedEvent}
          loading={loading}
        />
      </div>

      {/* Decision Making Pane */}
      <div className="flex-1 bg-gradient-to-b from-gray-900/90 to-gray-800/90">
        <DecisionPane
          event={selectedEvent}
          selectedDecision={selectedDecision}
          onDecisionSelect={setSelectedDecision}
        />
      </div>
    </div>
  );
};

export default AnalyticsTab;
