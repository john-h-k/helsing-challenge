import React, { useState, useMemo } from "react";
import { Event } from "../../types/Event";
import EventsPane from "./EventsPane";
import DecisionPane from "./DecisionPane";
import { useSearchParams } from "react-router-dom";
import { checkEventInPolygon } from "../../utils/geometry";
import { ReactFlowProvider } from "reactflow";

interface AnalyticsTabProps {
  events: Event[];
  loading: boolean;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ events, loading }) => {
  const [searchParams] = useSearchParams();
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [selectedDecision, setSelectedDecision] = useState<Decision | null>(
    null
  );

  const filteredEvents = useMemo(() => {
    const polygonParam = searchParams.get("polygon");
    if (!polygonParam) return events;

    try {
      const polygon = JSON.parse(decodeURIComponent(polygonParam));
      return events.filter((event) => checkEventInPolygon(event, polygon));
    } catch (e) {
      console.error("Failed to parse polygon parameter:", e);
      return events;
    }
  }, [events, searchParams]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Events Pane */}
      <div className="w-1/3 border-r border-white/5 bg-gradient-to-b from-gray-900/95 to-gray-800/95">
        <EventsPane
          events={filteredEvents}
          selectedEvent={selectedEvent}
          onEventSelect={setSelectedEvent}
          loading={loading}
        />
      </div>

      {/* Decision Making Pane */}
      <div className="flex-1 bg-gradient-to-b from-gray-900/90 to-gray-800/90">
        <ReactFlowProvider>
          <DecisionPane
            event={selectedEvent}
            selectedDecision={selectedDecision}
            onDecisionSelect={setSelectedDecision}
          />
        </ReactFlowProvider>
      </div>
    </div>
  );
};

export default AnalyticsTab;
