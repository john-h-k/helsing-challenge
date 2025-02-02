import React, { useState, useMemo } from "react";
import { Event } from "../../types/Event";
import EventsPane from "./EventsPane";
import DecisionPane from "./DecisionPane";
import { useSearchParams, useNavigate } from "react-router-dom"; // Add useNavigate
import { checkEventInPolygon } from "../../utils/geometry";
import { ReactFlowProvider } from "reactflow";

interface AnalyticsTabProps {
  events: Event[];
  loading: boolean;
}

const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ events, loading }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Add this
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
    <div className="flex flex-col h-[calc(100vh-64px)]">
      {/* Add Back Button */}
      <div className="p-4 border-b border-white/5 bg-gray-900/95">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 text-white/70 hover:text-white/90 transition-colors group"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="transform transition-transform group-hover:-translate-x-0.5"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Back to Dashboard</span>
        </button>
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
