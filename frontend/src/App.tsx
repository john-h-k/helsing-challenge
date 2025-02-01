import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Globe from "globe.gl";
import { ThemeProvider, createTheme } from "@mui/material";
import styled from "@emotion/styled";
import Navbar from "./components/Navbar";
import Timeline from "./components/Timeline";
import EventPopup from "./components/EventPopup";
import AnalyticsTab from "./components/analytics/AnalyticsTab";
import { generateMockEvents } from "./utils/mockDataGenerator";
import { Event } from "./types/Event";

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

const Dashboard = ({ events, globeRef, selectedEvent, setSelectedEvent, popupPosition, setPopupPosition, countries }) => {
  useEffect(() => {
    if (!globeRef.current) return;

    const globe = Globe()
      .globeImageUrl(
        "//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
      )
      // Points configuration
      .pointsData(events)
      .pointLat((d) => (d as Event).latitude)
      .pointLng((d) => (d as Event).longitude)
      .pointColor((d) => {
        const event = d as Event;
        return event.severity === "high"
          ? "rgba(255, 68, 68, 0.8)"
          : event.severity === "medium"
          ? "rgba(255, 170, 0, 0.8)"
          : "rgba(0, 170, 0, 0.8)";
      })
      .pointAltitude((d) => {
        const event = d as Event;
        const timeDiff = Math.abs(
          event.date.getTime() - (selectedEvent?.date.getTime() || 0)
        );
        return timeDiff < 86400000 ? 0.1 : 0.01; // Elevate active events
      })
      .pointRadius((d) => {
        const event = d as Event;
        const timeDiff = Math.abs(
          event.date.getTime() - (selectedEvent?.date.getTime() || 0)
        );
        return timeDiff < 86400000 ? 0.5 : 0.3; // Larger radius for active events
      })
      .pointResolution(64)
      // Polygon (country) configuration
      .polygonsData(countries)
      .polygonCapColor(() => "rgba(255, 255, 255, 0.03)")
      .polygonSideColor(() => "rgba(255, 255, 255, 0.05)")
      .polygonStrokeColor(() => "rgba(255, 255, 255, 0.1)")
      .polygonAltitude(0.01)
      .polygonsTransitionDuration(1000)
      // Atmosphere configuration
      .atmosphereColor("rgb(30,30,50)")
      .atmosphereAltitude(0.1)
      // Interaction handlers
      .onPointClick((point, event) => {
        const evt = point as Event;
        setSelectedEvent(evt);
        setPopupPosition({ x: event.x, y: event.y });
      })
      .polygonLabel(
        ({ properties: d }) => `
        <div style="
          background-color: rgba(0, 0, 0, 0.75);
          color: white;
          padding: 8px;
          border-radius: 4px;
          font-size: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        ">
          ${d.ADMIN} (${d.ISO_A2})
        </div>
      `
      );

    globe(globeRef.current);

    // Handle window resize
    const handleResize = () => {
      globe.width(window.innerWidth);
      globe.height(window.innerHeight - 64);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, [events, countries, selectedEvent]);

  return (
    <>
      <GlobeContainer ref={globeRef} />
      <Timeline
        events={events}
        onEventClick={(event) => {
          setSelectedEvent(event);
          const lat = event.latitude;
          const lng = event.longitude;
          setPopupPosition({
            x: ((lng + 180) * window.innerWidth) / 360,
            y: ((-lat + 90) * (window.innerHeight - 64)) / 180,
          });
        }}
      />
      {selectedEvent && (
        <EventPopup event={selectedEvent} position={popupPosition} />
      )}
    </>
  );
};

function App() {
  const globeRef = useRef<HTMLDivElement>(null);
  const [events] = useState<Event[]>(() => generateMockEvents(100));
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
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
                globeRef={globeRef}
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
                popupPosition={popupPosition}
                setPopupPosition={setPopupPosition}
                countries={countries}
              />
            } 
          />
          <Route 
            path="/analytics" 
            element={<AnalyticsTab events={events} />} 
          />
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
