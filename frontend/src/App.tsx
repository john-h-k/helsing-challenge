import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import { ThemeProvider, createTheme } from "@mui/material";
import styled from "@emotion/styled";
import Navbar from "./components/Navbar";
import Timeline from "./components/Timeline";
import EventPopup from "./components/EventPopup";
import AnalyticsTab from "./components/analytics/AnalyticsTab";
import { generateMockEvents } from "./utils/mockDataGenerator";
import { Event } from "./types/Event";
import "mapbox-gl/dist/mapbox-gl.css";

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  background-color: #000;
  position: relative;
`;

const GlobeContainer = styled.div`
  height: calc(100vh - 64px);
  width: 100%;
  padding-bottom: 120px; // Add padding to prevent overlap with timeline
`;

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
});

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibmV1cm9kaXZlcmdlbnRzZXJpZXMiLCJhIjoiY20zenhkeWkyMmF1ejJsc2Z6dTRlaXhlYiJ9.h6MGz9q6p0T65MQK7A91lg";
mapboxgl.accessToken = MAPBOX_TOKEN;

const Dashboard = ({
  events,
  mapContainer,
  selectedEvent,
  setSelectedEvent,
}) => {
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const hoveredMarker = useRef<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 0],
      zoom: 1.5,
      projection: "globe",
    });

    map.current.on("style.load", () => {
      map.current!.setFog({
        color: "rgb(12, 12, 12)",
        "high-color": "rgb(16, 16, 16)",
        "horizon-blend": 0.2,
        "space-color": "rgb(8, 8, 8)",
        "star-intensity": 0.15,
      });
    });

    return () => {
      markers.current.forEach((marker) => marker.remove());
      if (popup.current) popup.current.remove();
      map.current?.remove();
    };
  }, []);

  // Update markers when events or selection changes
  useEffect(() => {
    if (!map.current) return;

    // Clear existing markers and popup
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];

    events.forEach((event) => {
      const markerEl = document.createElement("div");
      markerEl.className = "group";

      const dot = document.createElement("div");
      dot.className = `w-3 h-3 rounded-full transition-all duration-200
        ${event === selectedEvent ? "scale-150 shadow-lg" : "scale-100"}
        ${
          event.severity === "high"
            ? "bg-red-500"
            : event.severity === "medium"
            ? "bg-amber-500"
            : "bg-emerald-500"
        }`;

      const glow = document.createElement("div");
      glow.className = `absolute -inset-2 rounded-full opacity-30 blur transition-opacity
        ${
          event === selectedEvent
            ? "opacity-50"
            : "opacity-0 group-hover:opacity-30"
        }`;
      glow.style.backgroundColor =
        event.severity === "high"
          ? "#ef4444"
          : event.severity === "medium"
          ? "#f59e0b"
          : "#10b981";

      markerEl.appendChild(glow);
      markerEl.appendChild(dot);

      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: "center",
      })
        .setLngLat([event.longitude, event.latitude])
        .addTo(map.current);

      // Reintroduce marker click to show popup
      markerEl.addEventListener("click", () => {
        if (popup.current) popup.current.remove();
        setSelectedEvent(event);

        const popupContent = `
          <div class="p-4 min-w-[300px]">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-white/90">${event.title}</h3>
              <span class="px-2 py-1 text-[11px] rounded-full font-medium
                ${event.severity === 'high' 
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                  event.severity === 'medium' 
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }">
                ${event.severity.toUpperCase()}
              </span>
            </div>
            <p class="text-sm text-white/70 mb-4 leading-relaxed">${event.description}</p>
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                <span class="block text-white/50 mb-1">Source</span>
                <span class="text-white/90">${event.source}</span>
              </div>
              <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                <span class="block text-white/50 mb-1">Location</span>
                <span class="text-white/90">${event.location}</span>
              </div>
            </div>
          </div>
        `;

        popup.current = new mapboxgl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'dark-theme-popup',
          maxWidth: '400px'
        })
          .setLngLat([event.longitude, event.latitude])
          .setHTML(popupContent)
          .addTo(map.current!);

        map.current?.flyTo({
          center: [event.longitude, event.latitude],
          zoom: 4,
          duration: 1500,
        });
      });

      // Hover effect
      markerEl.addEventListener("mouseenter", () => {
        hoveredMarker.current = event.id;
        dot.style.transform = "scale(1.5)";
        glow.style.opacity = "0.5";
      });

      markerEl.addEventListener("mouseleave", () => {
        if (event !== selectedEvent) {
          dot.style.transform = "scale(1)";
          glow.style.opacity = "0";
        }
        hoveredMarker.current = null;
      });

      markers.current.push(marker);
    });
  }, [events, selectedEvent]);

  return (
    <>
      <div ref={mapContainer} className="h-full" />
      <Timeline
        events={events}
        selectedEvent={selectedEvent}
        onEventClick={(event) => {
          setSelectedEvent(event);
          // Fly to event location and show popup
          if (map.current) {
            map.current.flyTo({
              center: [event.longitude, event.latitude],
              zoom: 4,
              duration: 1500,
            });
            
            // Trigger click on corresponding marker
            const marker = markers.current.find(m => {
              const [lng, lat] = m.getLngLat().toArray();
              return lng === event.longitude && lat === event.latitude;
            });
            // Manually create and show popup here (instead of marker click listener)
            if (marker && popup.current) popup.current.remove();
            if (marker) {
              const popupContent = `
              <div class="p-4 min-w-[300px]">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-sm font-medium text-white/90">${event.title}</h3>
                  <span class="px-2 py-1 text-[11px] rounded-full font-medium
                    ${event.severity === 'high' 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                      event.severity === 'medium' 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }">
                    ${event.severity.toUpperCase()}
                  </span>
                </div>
                <p class="text-sm text-white/70 mb-4 leading-relaxed">${event.description}</p>
                <div class="grid grid-cols-2 gap-3 text-xs">
                  <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span class="block text-white/50 mb-1">Source</span>
                    <span class="text-white/90">${event.source}</span>
                  </div>
                  <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                    <span class="block text-white/50 mb-1">Location</span>
                    <span class="text-white/90">${event.location}</span>
                  </div>
                </div>
              </div>
            `;
              popup.current = new mapboxgl.Popup({
                closeButton: true,
                closeOnClick: false,
                className: 'dark-theme-popup',
                maxWidth: '400px'
              })
                .setLngLat([event.longitude, event.latitude])
                .setHTML(popupContent)
                .addTo(map.current!);
            }
          }
        }}
      />
    </>
  );
};

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [events] = useState<Event[]>(() => generateMockEvents(100));
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    // Fetch country data
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
    )
      .then((res) => res.json())
      .then(({ features }) => setCountries(features));
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <Container>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <Dashboard
                events={events}
                mapContainer={mapContainer}
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
              />
            }
          />
          <Route path="/analytics" element={<AnalyticsTab events={events} />} />
          <Route
            path="/reports"
            element={
              <div className="h-[calc(100vh-64px)] flex items-center justify-center text-white/50">
                Reports Coming Soon
              </div>
            }
          />
          <Route
            path="/settings"
            element={
              <div className="h-[calc(100vh-64px)] flex items-center justify-center text-white/50">
                Settings Coming Soon
              </div>
            }
          />
        </Routes>
      </Container>
    </ThemeProvider>
  );
}

export default App;
