import React, { useEffect, useState, useRef } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import { ThemeProvider, createTheme } from "@mui/material";
import styled from "@emotion/styled";
import Navbar from "./components/Navbar";
import Timeline from "./components/Timeline";
import EventPopup from "./components/EventPopup";
import AnalyticsTab from "./components/analytics/AnalyticsTab";
import { getRealEvents, generateMockEvents } from "./utils/mockDataGenerator";
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

const Legend = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.75);
  padding: 10px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 1;
`;

const SearchButton = styled.button`
  position: absolute;
  bottom: 40px;
  right: 20px;
  background: rgba(0, 0, 0, 0.75);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 2;

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: rgba(255, 255, 255, 0.2);
  }
`;

const CalculationBox = styled.div`
  height: 75px;
  width: 150px;
  position: absolute;
  bottom: 40px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.75);
  padding: 15px;
  text-align: center;
  color: white;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  countries, // Added prop
}: {
  events: Event[];
  mapContainer: React.RefObject<HTMLDivElement>;
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  countries: any[]; // Adjust type if available
}) => {
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popup = useRef<mapboxgl.Popup | null>(null);
  const hoveredMarker = useRef<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [areaInSquareMeters, setAreaInSquareMeters] = useState<number | null>(
    null
  );
  const [searchCoordinates, setSearchCoordinates] = useState<
    number[][][] | null
  >(null);

  // New refs for polygon drawing
  const polygonPoints = useRef<number[][]>([]);
  const lineStringSource = useRef<any>(null);
  const pointsSource = useRef<any>(null);
  const isDrawingRef = useRef(false); // Add this ref to track drawing state
  const previewLineSource = useRef<any>(null);

  // Function to calculate polygon area (simplified version)
  const calculateArea = (points: number[][]) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i][0] * points[j][1];
      area -= points[j][0] * points[i][1];
    }
    return (Math.abs(area) * 111319.9 * 111319.9) / 2;
  };

  const handleMapClick = (e: mapboxgl.MapMouseEvent) => {
    if (!isDrawingRef.current) {
      return;
    }

    const coordinates = [e.lngLat.lng, e.lngLat.lat];
    polygonPoints.current.push(coordinates);

    // Update the line string source - create a closed loop if we have enough points
    if (map.current) {
      const lineCoordinates = [...polygonPoints.current];
      if (polygonPoints.current.length >= 3) {
        // Add the first point again to close the polygon
        lineCoordinates.push(polygonPoints.current[0]);
      }

      map.current.getSource("drawing-line").setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: lineCoordinates,
        },
      });

      // Also update points visualization
      map.current.getSource("drawing-points").setData({
        type: "FeatureCollection",
        features: polygonPoints.current.map((coord) => ({
          type: "Feature",
          properties: {},
          geometry: {
            type: "Point",
            coordinates: coord,
          },
        })),
      });
    }

    if (polygonPoints.current.length >= 4) {
      // Complete the polygon
      const finalPoints = [...polygonPoints.current, polygonPoints.current[0]];
      setSearchCoordinates([finalPoints]);
      isDrawingRef.current = false;
      setIsDrawing(false);

      // Calculate and set area
      const area = calculateArea(polygonPoints.current);
      setAreaInSquareMeters(Math.round(area * 100) / 100);

      // Reset cursor
      if (map.current) {
        map.current.getCanvas().style.cursor = "";
        map.current.off("click", handleMapClick);
        map.current.off("mousemove", handleMouseMove);
        // Clear preview line
        map.current.getSource("preview-line").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        });
      }
    }
  };

  const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
    if (!isDrawingRef.current || polygonPoints.current.length === 0) return;

    const coordinates = [...polygonPoints.current];
    // Only add the current mouse position
    coordinates.push([e.lngLat.lng, e.lngLat.lat]);

    // Only add the closing point if we have 4 or more points
    if (polygonPoints.current.length >= 3) {
      coordinates.push(polygonPoints.current[0]);
    }

    if (map.current) {
      map.current.getSource("preview-line").setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: coordinates,
        },
      });
    }
  };

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
      // Set fog
      map.current!.setFog({
        color: "rgb(12, 12, 12)",
        "high-color": "rgb(16, 16, 16)",
        "horizon-blend": 0.2,
        "space-color": "rgb(8, 8, 8)",
        "star-intensity": 0.15,
      });

      // Initialize countries layers if data is available
      if (countries && countries.length > 0) {
        // Add countries source
        map.current!.addSource("countries-source", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: countries,
          },
        });

        // Add country layers
        map.current!.addLayer({
          id: "countries-base",
          type: "fill",
          source: "countries-source",
          paint: {
            "fill-color": "#627BC1",
            "fill-opacity": 0.2,
          },
        });

        map.current!.addLayer({
          id: "countries-hover",
          type: "fill",
          source: "countries-source",
          paint: {
            "fill-color": "#627BC1",
            "fill-opacity": [
              "case",
              ["boolean", ["feature-state", "hover"], false],
              0.7,
              0,
            ],
          },
        });

        map.current!.addLayer({
          id: "countries-borders",
          type: "line",
          source: "countries-source",
          paint: {
            "line-color": "#627BC1",
            "line-width": 1,
            "line-opacity": 0.8,
          },
        });

        // Add country interactions
        let hoveredStateId: number | string | null = null;

        map.current!.on("mousemove", "countries-base", (e) => {
          if (e.features && e.features[0]) {
            const feature = e.features[0];
            if (feature.id === undefined || feature.id === null) return; // Skip if no id
            if (hoveredStateId !== null) {
              map.current!.setFeatureState(
                { source: "countries-source", id: hoveredStateId },
                { hover: false }
              );
            }
            hoveredStateId = feature.id;
            map.current!.setFeatureState(
              { source: "countries-source", id: hoveredStateId },
              { hover: true }
            );
            map.current!.getCanvas().style.cursor = "pointer";
          }
        });

        map.current!.on("mouseleave", "countries-base", () => {
          if (hoveredStateId !== null) {
            // Only update state if an id exists.
            map.current!.setFeatureState(
              { source: "countries-source", id: hoveredStateId },
              { hover: false }
            );
            hoveredStateId = null;
            map.current!.getCanvas().style.cursor = "";
          }
        });
      }

      // Initialize heatmap if events data is available
      if (events.length > 0) {
        // Add events source
        map.current!.addSource("events-heat", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: events.map((event) => ({
              type: "Feature",
              properties: {
                severity:
                  event.severity === "high"
                    ? 1
                    : event.severity === "medium"
                    ? 0.6
                    : 0.3,
                severityColor:
                  event.severity === "high"
                    ? "#ef4444"
                    : event.severity === "medium"
                    ? "#f59e0b"
                    : "#10b981",
              },
              geometry: {
                type: "Point",
                coordinates: [event.longitude, event.latitude],
              },
            })),
          },
        });

        // Add heatmap layer with larger radii
        map.current!.addLayer({
          id: "events-heat",
          type: "heatmap",
          source: "events-heat",
          maxzoom: 15,
          paint: {
            // Weight by severity (unchanged)
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "severity"],
              0.3,
              0.3,
              0.6,
              0.6,
              1,
              1,
            ],
            // Increased intensity
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              5,
            ],
            // Updated color gradient from green to red
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(16, 185, 129, 0)", // emerald-500 transparent
              0.2,
              "rgba(16, 185, 129, 0.5)", // emerald-500 semi
              0.4,
              "rgba(245, 158, 11, 0.7)", // amber-500
              0.6,
              "rgba(239, 68, 68, 0.5)", // red-500 semi
              0.8,
              "rgba(239, 68, 68, 0.7)", // red-500 stronger
              1,
              "rgba(239, 68, 68, 1)", // red-500 full
            ],
            // Much larger radius
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              50, // minimum radius at zoom level 0
              15,
              200, // maximum radius at zoom level 15
            ],
            "heatmap-opacity": 0.7,
          },
        });

        // Add center points layer
        map.current!.addLayer({
          id: "event-points",
          type: "circle",
          source: "events-heat",
          paint: {
            "circle-radius": 4,
            "circle-color": ["get", "severityColor"],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
        });
      }

      // Add sources for polygon drawing
      map.current!.addSource("drawing-points", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });
      pointsSource.current = map.current!.getSource("drawing-points");

      map.current!.addSource("drawing-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });
      lineStringSource.current = map.current!.getSource("drawing-line");

      // Add layers for polygon drawing
      map.current!.addLayer({
        id: "drawing-line-layer",
        type: "line",
        source: "drawing-line",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 2,
          "line-opacity": 0.7,
        },
      });

      map.current!.addLayer({
        id: "drawing-points-layer",
        type: "circle",
        source: "drawing-points",
        paint: {
          "circle-radius": 5,
          "circle-color": "#f59e0b",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });

      // Add preview line source and layer
      map.current!.addSource("preview-line", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });
      previewLineSource.current = map.current!.getSource("preview-line");

      map.current!.addLayer({
        id: "preview-line-layer",
        type: "line",
        source: "preview-line",
        paint: {
          "line-color": "#f59e0b",
          "line-width": 2,
          "line-opacity": 0.5,
          "line-dasharray": [2, 1],
        },
      });
    });

    return () => {
      // Remove markers and popup then remove the map
      markers.current.forEach((marker) => marker.remove());
      if (popup.current) popup.current.remove();
      if (map.current) map.current.remove();
    };
  }, [countries, events]); // Add dependencies

  const toggleDraw = () => {
    if (!isDrawing) {
      setSearchCoordinates(null);
      setAreaInSquareMeters(null);
      polygonPoints.current = [];

      // Reset sources
      if (map.current) {
        map.current.getSource("drawing-points").setData({
          type: "FeatureCollection",
          features: [],
        });
        map.current.getSource("drawing-line").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        });

        // Bind click handler directly to map
        map.current.on("click", handleMapClick);
        map.current.getCanvas().style.cursor = "crosshair";
        console.log("Drawing mode enabled");
        // Add mousemove handler
        map.current.on("mousemove", handleMouseMove);
      }

      isDrawingRef.current = true; // Update ref
      setIsDrawing(true);
    } else {
      isDrawingRef.current = false; // Update ref
      setIsDrawing(false);
      if (map.current) {
        map.current.off("click", handleMapClick);
        map.current.getCanvas().style.cursor = "";
        console.log("Drawing mode disabled");
        map.current.off("mousemove", handleMouseMove);
        // Clear preview line
        map.current.getSource("preview-line").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        });
      }
    }
  };

  // Remove the separate country and heatmap effects
  // Keep the markers effect

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
                ${
                  event.severity === "high"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : event.severity === "medium"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }">
                ${event.severity.toUpperCase()}
              </span>
            </div>
            <p class="text-sm text-white/70 mb-4 leading-relaxed">${
              event.description
            }</p>
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
          className: "dark-theme-popup",
          maxWidth: "400px",
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
      {isDrawing && (
        <CalculationBox>
          <p className="text-xs text-white/70 m-0">
            Click the map to draw a polygon.
          </p>
          {areaInSquareMeters && (
            <div className="mt-2">
              <p className="text-sm font-medium text-white/90 m-0">
                {areaInSquareMeters}
              </p>
              <p className="text-xs text-white/70 m-0">square meters</p>
            </div>
          )}
        </CalculationBox>
      )}
      <Legend>
        <div className="text-xs font-medium text-white/90 mb-2">Severity</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500" />
          <div className="text-xs text-white/70">Low</div>
        </div>
        <div className="flex items-center gap-2 my-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <div className="text-xs text-white/70">Medium</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="text-xs text-white/70">High</div>
        </div>
      </Legend>
      <SearchButton onClick={toggleDraw}>
        {isDrawing ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            Cancel Search
          </>
        ) : searchCoordinates ? (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 3L2 21"></path>
              <path d="M17 3L2 16"></path>
              <path d="M12 3L2 11"></path>
              <path d="M7 3L2 6"></path>
            </svg>
            Active Search Area
          </>
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            Search Area
          </>
        )}
      </SearchButton>
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
            const marker = markers.current.find((m) => {
              const [lng, lat] = m.getLngLat().toArray();
              return lng === event.longitude && lat === event.latitude;
            });
            // Manually create and show popup here (instead of marker click listener)
            if (marker && popup.current) popup.current.remove();
            if (marker) {
              const popupContent = `
              <div class="p-4 min-w-[300px]">
                <div class="flex items-center justify-between mb-3">
                  <h3 class="text-sm font-medium text-white/90">${
                    event.title
                  }</h3>
                  <span class="px-2 py-1 text-[11px] rounded-full font-medium
                    ${
                      event.severity === "high"
                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                        : event.severity === "medium"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    }">
                    ${event.severity.toUpperCase()}
                  </span>
                </div>
                <p class="text-sm text-white/70 mb-4 leading-relaxed">${
                  event.description
                }</p>
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
                className: "dark-theme-popup",
                maxWidth: "400px",
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
  // Updated state initialization for asynchronous events load
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [countries, setCountries] = useState([]);

  // Fetch events asynchronously
  useEffect(() => {
    getRealEvents(10).then((fetchedEvents) => {
      setEvents(fetchedEvents);
    });
  }, []);

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
                countries={countries} // Pass countries prop
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
