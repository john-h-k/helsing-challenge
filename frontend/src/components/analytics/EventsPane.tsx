import React, { useState } from 'react';
import { Event, GeoObject } from '../../types/Event';
import { format } from 'date-fns';
import ObjectMapView from './ObjectMapView';

interface EventsPaneProps {
  events: Event[];
  selectedEvent: Event | null;
  onEventSelect: (event: Event | null) => void;
}

const ObjectCard: React.FC<{ object: GeoObject }> = ({ object }) => (
  <div className="p-4 rounded-lg bg-gray-900/40 border border-white/10 
    hover:border-white/20 transition-all duration-300 mb-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${
          object.type === 'military' ? 'bg-red-400' :
          object.type === 'economic' ? 'bg-emerald-400' :
          object.type === 'political' ? 'bg-blue-400' :
          object.type === 'infrastructure' ? 'bg-amber-400' :
          'bg-purple-400'
        }`} />
        <h4 className="font-medium text-white/90 text-sm">{object.name}</h4>
      </div>
      <span className={`px-2.5 py-1 text-[11px] font-medium rounded-full
        ${object.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
        object.status === 'inactive' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
        'bg-gray-500/10 text-gray-400 border border-gray-500/20'}`}>
        {object.status}
      </span>
    </div>
    <p className="text-sm text-white/60 mb-3 leading-relaxed">{object.description}</p>
    <div className="space-y-2 text-xs">
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-[70px] font-medium">Type</span>
        <span className="text-white/70 capitalize">{object.type}</span>
      </div>
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-[70px] font-medium">Location</span>
        <span className="text-white/70 font-mono">{object.latitude.toFixed(2)}, {object.longitude.toFixed(2)}</span>
      </div>
      <div className="flex items-center gap-2 text-white/40">
        <span className="w-[70px] font-medium">Countries</span>
        <div className="flex flex-wrap gap-1">
          {object.countries.map(country => (
            <span key={country} 
              className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/70 border border-white/10">
              {country}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const EventsPane: React.FC<EventsPaneProps> = ({ events, selectedEvent, onEventSelect }) => {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            Events
          </h2>
          {selectedEvent && (
            <button
              onClick={() => setShowMap(true)}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 
                transition-all duration-200 text-white/70 text-sm border border-white/10
                hover:border-white/20 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6-3l5.447 2.724A1 1 0 0121 7.618v10.764a1 1 0 01-1.447.894L15 17m-6-3l6 3V7" />
              </svg>
              View Map
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {selectedEvent ? (
            <div>
              <div className="mb-6">
                <div className="relative p-6 rounded-xl bg-gradient-to-br from-white/[0.05] to-white/[0.1] 
                  backdrop-blur-sm border border-white/10 mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-white">{selectedEvent.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium
                      ${selectedEvent.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        selectedEvent.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {selectedEvent.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-white/70 mb-4 leading-relaxed">{selectedEvent.description}</p>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-white/40 block mb-1">Source</span>
                      <span className="text-white/90">{selectedEvent.source}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-white/40 block mb-1">Location</span>
                      <span className="text-white/90">{selectedEvent.location}</span>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-white/40 block mb-1">Date</span>
                      <span className="text-white/90">{format(selectedEvent.date, 'PPP')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-md font-medium text-white/90 mb-4 px-1">Related Objects</h3>
                {selectedEvent.objects.map(obj => (
                  <ObjectCard key={obj.id} object={obj} />
                ))}
              </div>

              <button
                onClick={() => onEventSelect(null)}
                className="w-full py-2.5 px-4 rounded-lg bg-white/5 hover:bg-white/10 
                  transition-all duration-200 text-white/70 text-sm border border-white/10
                  hover:border-white/20 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Events List
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <button
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="group w-full text-left p-4 rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.08]
                    backdrop-blur-sm border border-white/10 transition-all duration-300
                    hover:border-white/20 hover:from-white/[0.05] hover:to-white/[0.1]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        event.severity === 'high' ? 'bg-red-400' :
                        event.severity === 'medium' ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`} />
                      <h3 className="font-medium text-white/90">{event.title}</h3>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium
                      ${event.severity === 'high' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        event.severity === 'medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                      {event.severity.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-white/60 leading-relaxed pl-5">{event.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showMap && selectedEvent && (
        <ObjectMapView 
          objects={selectedEvent.objects} 
          onClose={() => setShowMap(false)} 
        />
      )}
    </div>
  );
};

export default EventsPane;
