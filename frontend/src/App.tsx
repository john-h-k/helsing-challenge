import React, { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material";
import Navbar from "./components/Navbar";
import AnalyticsTab from "./components/analytics/AnalyticsTab";
import { getRealEvents, generateMockEvents } from "./utils/mockDataGenerator";
import { Event } from "./types/Event";
import MapFeature from "./components/MapFeature";
import "mapbox-gl/dist/mapbox-gl.css";

const darkTheme = createTheme({
  palette: { mode: "dark" },
});

function App() {
  // Removed mapContainer ref and Dashboard component
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [countries, setCountries] = useState([]);

  useEffect(() => {
    getRealEvents(10).then((fetchedEvents) => {
      setEvents(fetchedEvents);
    });
  }, []);

  useEffect(() => {
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
    )
      .then((res) => res.json())
      .then(({ features }) => setCountries(features));
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <div /* ...existing Container styling... */>
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route
            path="/dashboard"
            element={
              <MapFeature
                events={events}
                selectedEvent={selectedEvent}
                setSelectedEvent={setSelectedEvent}
                countries={countries}
              />
            }
          />
          <Route path="/analytics" element={<AnalyticsTab events={events} />} />
          <Route path="/reports" element={<div>Reports Coming Soon</div>} />
          <Route path="/settings" element={<div>Settings Coming Soon</div>} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

export default App;
