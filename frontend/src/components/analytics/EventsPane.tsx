import React, { useState, useMemo } from "react";
import { Flipper, Flipped } from "react-flip-toolkit";
import { Event, GeoObject } from "../../types/Event";
import { format } from "date-fns";
import ObjectMapView from "./ObjectMapView";
import LoadingDots from "components/LoadingDots";

interface EventsPaneProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventSelect: (event: Event | null) => void;
  loading: boolean;
  title?: string; // Add this
}

const ObjectCard: React.FC<{ object: GeoObject }> = ({ object }) => (
  <div
    className="p-4 rounded-lg bg-gray-900/40 border border-white/10 
    hover:border-white/20 transition-all duration-300 mb-4"
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div
          className={`w-2 h-2 rounded-full ${
            object.type === "military"
              ? "bg-red-400"
              : object.type === "economic"
              ? "bg-emerald-400"
              : object.type === "political"
              ? "bg-blue-400"
              : object.type === "infrastructure"
              ? "bg-amber-400"
              : "bg-purple-400"
          }`}
        />
        <h4 className="font-medium text-white/90 text-sm">{object.name}</h4>
      </div>
      <span
        className={`px-2.5 py-1 text-[11px] font-medium rounded-full
        ${
          object.status === "active"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : object.status === "inactive"
            ? "bg-red-500/10 text-red-400 border border-red-500/20"
            : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
        }`}
      >
        {object.status}
      </span>
    </div>
    <p className="text-sm text-white/60 mb-3 leading-relaxed">
      {object.description}
    </p>
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-[70px] font-medium">Type</span>
        <span className="text-white/70 capitalize">{object.type}</span>
      </div>
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-[70px] font-medium">Location</span>
        <span className="text-white/70 font-mono">
          {object.latitude.toFixed(2)}, {object.longitude.toFixed(2)}
        </span>
      </div>
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-[70px] font-medium">Countries</span>
        <div className="flex flex-wrap gap-1">
          {object.countries.map((country) => (
            <span
              key={country}
              className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/70 border border-white/10"
            >
              {country}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <div className="flex items-center gap-3">
    <button
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-300
        focus:outline-none bg-gray-700"
    >
      <span className="sr-only">Toggle view</span>
      <span
        className={`${
          checked
            ? "translate-x-5 bg-emerald-500"
            : "translate-x-0.5 bg-white/80"
        } inline-block h-4 w-4 transform rounded-full transition-transform duration-300 ease-in-out`}
      />
    </button>
    <span className="text-xs font-medium text-white/60">
      {checked ? "Map View" : "List View"}
    </span>
  </div>
);

// Add this helper function at the top level
const formatCoordinates = (
  lat: number | undefined,
  lng: number | undefined
) => {
  if (lat === undefined || lng === undefined) return "Location unknown";
  return `${lat.toFixed(3)}°N, ${lng.toFixed(3)}°E`;
};

// Add this helper function at the top level
const getCategoryColor = (category: string) => {
  switch (category) {
    case "military":
      return "from-red-500/20 to-red-600/20 border-red-500/30";
    case "economic":
      return "from-emerald-500/20 to-emerald-600/20 border-emerald-500/30";
    case "political":
      return "from-blue-500/20 to-blue-600/20 border-blue-500/30";
    case "infrastructure":
      return "from-amber-500/20 to-amber-600/20 border-amber-500/30";
    default:
      return "from-purple-500/20 to-purple-600/20 border-purple-500/30";
  }
};

const getCategoryDot = (category: string) => {
  switch (category) {
    case "military":
      return "bg-red-400";
    case "economic":
      return "bg-emerald-400";
    case "political":
      return "bg-blue-400";
    case "infrastructure":
      return "bg-amber-400";
    default:
      return "bg-purple-400";
  }
};

const EventsPane: React.FC<EventsPaneProps> = ({
  events,
  selectedEvent,
  onEventSelect,
  loading,
  title = "Events", // Default to "Events" if not provided
}) => {
  const [showMap, setShowMap] = useState(false);

  // Group events by category
  const groupedEvents = useMemo(() => {
    const groups = events.reduce((acc, event) => {
      const category = event.type || 'other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(event);
      return acc;
    }, {} as Record<string, Event[]>);

    // Sort categories
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          {selectedEvent && (
            <button
              onClick={() => onEventSelect(null)}
              className="group p-1 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg
                className="w-5 h-5 text-white/70 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            {title}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {selectedEvent ? (
            <div>
              <div className="mb-6">
                <div className="relative p-6 rounded-xl bg-gray-900/40 border border-white/10 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">
                      {selectedEvent.title}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium
                      ${
                        selectedEvent.severity === "high"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : selectedEvent.severity === "medium"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      }`}
                    >
                      {selectedEvent.possibility
                        ? "?"
                        : selectedEvent.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed mb-4">
                    {selectedEvent.description}
                  </p>
                  {selectedEvent.reasoning && (
                    <>
                      <div className="my-4 border-t border-white/10" />
                      <div className="text-sm text-white/60 leading-relaxed p-4 rounded-lg bg-white/5">
                        <div className="font-medium text-white/70 mb-2">
                          Reasoning:
                        </div>
                        {selectedEvent.reasoning}
                      </div>
                      <div className="my-4 border-t border-white/10" />
                    </>
                  )}
                  {selectedEvent.possibility && (
                    <p className="text-white/70 mb-4 leading-relaxed">
                      <div className="flex gap-4">
                        {selectedEvent.questions?.map((q) => (
                          <a href={q.url} target="_blank">
                            <div
                              key={q.market}
                              className="flex items-center gap-2 bg-white/10 p-3 rounded-lg"
                            >
                              <img
                                src={`${q.market}.${
                                  {
                                    manifold: "jpg",
                                    metaculus: "jpeg",
                                    polymarket: "png",
                                  }[q.market]
                                }`}
                                alt={q.market}
                                className="w-10 h-10 rounded-md"
                              />
                              <span className="text-lg font-medium">
                                {Math.round(q.p * 100)}%
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-white/40 block mb-1">Type</span>
                      <span className="text-white/90">
                        {selectedEvent.type}
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-white/40 block mb-1">Date</span>
                      <span className="text-white/90">
                        {format(selectedEvent.date, "PPP")}
                      </span>
                    </div>
                    <div className="col-span-2 p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-white/40 block mb-1">Location</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white/90 font-mono">
                          {selectedEvent.location}
                          {/* {formatCoordinates(
                             selectedEvent.latitude,
                             selectedEvent.longitude
                          )} */}
                        </span>
                        {selectedEvent.location && (
                          <span className="text-white/50">
                            ({selectedEvent.location})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-medium text-white/90">
                    Nearby Objects
                  </h3>
                  <Toggle checked={showMap} onChange={setShowMap} />
                </div>

                {showMap ? (
                  <ObjectMapView
                    objects={selectedEvent.objects}
                    onClose={() => setShowMap(false)}
                  />
                ) : (
                  selectedEvent.objects.map((obj) => (
                    <ObjectCard key={obj.id} object={obj} />
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {loading && events.length === 0 && <LoadingDots />}
              {groupedEvents.map(([category, categoryEvents]) => (
                <div key={category} className="space-y-2">
                  <div className="flex items-center gap-3 px-2 mb-4">
                    <div className={`w-2 h-2 rounded-full ${getCategoryDot(category)}`} />
                    <h3 className="text-sm font-medium text-white/80 uppercase">
                      {category}
                    </h3>
                  </div>
                  <Flipper flipKey={categoryEvents.map((event) => event.id).join(",")}>
                    <ul className="space-y-2">
                      {categoryEvents.map((event) => (
                        <Flipped key={event.id} flipId={event.id}>
                          <li>
                            <button
                              onClick={() => onEventSelect(event)}
                              className="group w-full text-left p-4 rounded-xl bg-gray-900/40 border border-white/10 
                                transition-all duration-300 hover:border-white/20"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`w-2 h-2 rounded-full ${
                                      event.severity === "high"
                                        ? "bg-red-400"
                                        : event.severity === "medium"
                                        ? "bg-amber-400"
                                        : "bg-emerald-400"
                                    }`}
                                  />
                                  <h3 className="font-medium text-white/90">
                                    {event.title}
                                  </h3>
                                </div>
                                <span
                                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium
                                  ${
                                    event.severity === "high"
                                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                      : event.severity === "medium"
                                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  }`}
                                >
                                  {event.possibility ? "?" : event.severity.toUpperCase()}
                                </span>
                              </div>
                              <p className="mt-2 text-sm text-white/60 leading-relaxed pl-5 mb-2">
                                {event.description}
                              </p>
                              {event.reasoning && (
                                <>
                                  <div className="my-3 border-t border-white/10" />
                                  <div className="text-sm text-white/60 leading-relaxed p-3 rounded-lg bg-white/5 mx-5">
                                    <div className="font-medium text-white/70 mb-2">
                                      Reasoning:
                                    </div>
                                    {event.reasoning}
                                  </div>
                                  <div className="my-3 border-t border-white/10" />
                                </>
                              )}
                              <div className="mt-3 pl-5 flex items-center gap-2 text-xs">
                                <span className="text-white/40">Location:</span>
                                <span className="font-mono text-white/60">
                                  {event.location || formatCoordinates(event.latitude, event.longitude)}
                                </span>
                              </div>
                            </button>
                          </li>
                        </Flipped>
                      ))}
                    </ul>
                  </Flipper>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventsPane;
