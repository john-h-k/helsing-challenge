import React, { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import { ThemeProvider, createTheme } from "@mui/material";
import styled from "@emotion/styled";
import Navbar from "./components/Navbar";
import Timeline from "./components/Timeline";
import EventPopup from "./components/EventPopup";
import AnalyticsTab from "./components/analytics/AnalyticsTab";
import { generateMockEvents, getRealEvents } from "./utils/mockDataGenerator";
import { Event } from "./types/Event";
import "mapbox-gl/dist/mapbox-gl.css";
import EventsPane from "components/analytics/EventsPane";

// Add new styled component for marker animations
const markerStyles = `
  @keyframes pulseGlow {
    0% { transform: scale(1); opacity: 0.3; }
    50% { transform: scale(1.5); opacity: 0.1; }
    100% { transform: scale(1); opacity: 0.3; }
  }
`;

// Add style tag to head
const styleSheet = document.createElement("style");
styleSheet.innerText = markerStyles;
document.head.appendChild(styleSheet);

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  background-color: #000;
  position: relative;
`;

const GlobeContainer = styled.div`
  height: calc(100vh - 64px);
  width: 100%;
`;

const Legend = styled.div`
  position: absolute;
  top: 84px; // Adjusted from 20px to account for navbar height (64px) + padding
  right: 20px;
  background: rgb(17, 24, 39); // Solid dark blue color
  padding: 16px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  z-index: 1;
  min-width: 160px;
`;

const SearchButton = styled.button`
  position: absolute;
  bottom: 40px;
  right: 20px;
  background: rgb(17, 24, 39); // Solid dark blue color
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  z-index: 2;

  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgb(24, 31, 46); // Slightly lighter on hover
  }
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
  const polygonFillSource = useRef<any>(null);

  // Add state for visible events
  const [visibleEvents, setVisibleEvents] = useState<Event[]>(events);

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
    if (!isDrawingRef.current) return;

    const coordinates = [e.lngLat.lng, e.lngLat.lat];
    polygonPoints.current.push(coordinates);

    // Update the line string source - only show drawn lines
    if (map.current) {
      // Just show the lines that have been drawn, no closing
      map.current.getSource("drawing-line").setData({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: polygonPoints.current,
        },
      });

      // Update points visualization
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

      if (polygonPoints.current.length >= 4) {
        // Now we can close the polygon
        const finalPoints = [
          ...polygonPoints.current,
          polygonPoints.current[0],
        ];
        map.current.getSource("drawing-line").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: finalPoints,
          },
        });

        setSearchCoordinates([finalPoints]);
        isDrawingRef.current = false;
        setIsDrawing(false);

        // Calculate and set area
        const area = calculateArea(polygonPoints.current);
        setAreaInSquareMeters(Math.round(area * 100) / 100);

        // Reset cursor and cleanup
        map.current.getCanvas().style.cursor = "";
        map.current.off("click", handleMapClick);
        map.current.off("mousemove", handleMouseMove);
        map.current.getSource("preview-line").setData({
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        });

        // Update the polygon fill
        if (map.current) {
          map.current.getSource("polygon-fill").setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [finalPoints],
            },
          });
        }
      }
    }
  };

  const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
    if (!isDrawingRef.current || polygonPoints.current.length === 0) return;

    // Show only the preview line from last point to current mouse position
    const coordinates = [
      polygonPoints.current[polygonPoints.current.length - 1],
      [e.lngLat.lng, e.lngLat.lat],
    ];

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

  // Add function to update visible events based on map bounds
  const updateVisibleEvents = useCallback(() => {
    if (!map.current) return;

    const bounds = map.current.getBounds();
    const visible = events.filter((event) => {
      if (event.longitude == null || event.latitude == null) return false;
      return bounds.contains([event.longitude, event.latitude]);
    });

    setVisibleEvents(visible);
  }, [events]);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 0],
      zoom: 1.5,
      projection: "globe",
    });

    // Create markers immediately after map initialization
    const createMarkers = () => {
      events.forEach((event) => {
        if (event.longitude == null || event.latitude == null) return;

        const markerEl = document.createElement("div");
        markerEl.className = "relative group";

        // Glow effect
        const glow = document.createElement("div");
        glow.className = `absolute -inset-4 rounded-full blur-md transition-opacity duration-300
          ${
            event === selectedEvent
              ? "opacity-30"
              : "opacity-0 group-hover:opacity-20"
          }`;
        glow.style.background = `radial-gradient(circle, ${
          event.severity === "high"
            ? "#ef4444"
            : event.severity === "medium"
            ? "#f59e0b"
            : "#10b981"
        }66, transparent)`;

        // Pulse animation
        const pulse = document.createElement("div");
        pulse.className = `absolute -inset-6 rounded-full
          ${
            event === selectedEvent
              ? ""
              : "group-hover:animate-[pulseGlow_2s_ease-in-out_infinite]"
          }`;
        pulse.style.background = `radial-gradient(circle, ${
          event.severity === "high"
            ? "#ef4444"
            : event.severity === "medium"
            ? "#f59e0b"
            : "#10b981"
        }33, transparent)`;

        // Main dot
        const dot = document.createElement("div");
        dot.className = `w-2.5 h-2.5 rounded-full transition-all duration-300 relative
          ${event === selectedEvent ? "scale-150" : "group-hover:scale-125"}
          ring-1 ring-white/20 shadow-lg`;
        dot.style.backgroundColor =
          event.severity === "high"
            ? "#ef4444"
            : event.severity === "medium"
            ? "#f59e0b"
            : "#10b981";

        markerEl.appendChild(pulse);
        markerEl.appendChild(glow);
        markerEl.appendChild(dot);

        const marker = new mapboxgl.Marker({
          element: markerEl,
          anchor: "center",
        })
          .setLngLat([event.longitude, event.latitude])
          .addTo(map.current!);

        // Reintroduce marker click to show popup
        markerEl.addEventListener("click", () => {
          if (popup.current) popup.current.remove();
          setSelectedEvent(event);

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
    };

    map.current.on("style.load", () => {
      // Set fog
      map.current!.setFog({
        color: "rgb(12, 12, 12)", // Darker fog
        "high-color": "rgb(12, 12, 12)",
        "horizon-blend": 0.2,
        "space-color": "rgb(8, 8, 8)",
        "star-intensity": 0.15,
      });

      // Remove country layers code block
      // We're not adding the countries-source and related layers anymore

      // Update heatmap configuration with more prominent values
      if (events.length > 0) {
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

        // Enhanced heatmap layer
        map.current!.addLayer({
          id: "events-heat",
          type: "heatmap",
          source: "events-heat",
          maxzoom: 15,
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["get", "severity"],
              0.3,
              0.5,
              0.6,
              0.8,
              1,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(16, 185, 129, 0)",
              0.2,
              "rgba(16, 185, 129, 0.4)",
              0.4,
              "rgba(245, 158, 11, 0.6)",
              0.6,
              "rgba(239, 68, 68, 0.6)",
              0.8,
              "rgba(239, 68, 68, 0.8)",
              1,
              "rgba(239, 68, 68, 0.9)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              60, // increased from 40
              15,
              250, // increased from 150
            ],
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              0.6, // Reduced from 0.8 to be less dominant
              15,
              0.4, // Reduced from 0.6 to be less dominant
            ],
          },
        });

        // Remove the event-points layer since we're using markers
        // Instead of the circle layer, create the markers
        createMarkers();
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

      // Add polygon fill source and layer
      map.current!.addSource("polygon-fill", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "Polygon",
            coordinates: [],
          },
        },
      });
      polygonFillSource.current = map.current!.getSource("polygon-fill");

      map.current!.addLayer({
        id: "polygon-fill-layer",
        type: "fill",
        source: "polygon-fill",
        paint: {
          "fill-color": "#f59e0b",
          "fill-opacity": 0.2,
        },
      });
    });

    map.current.on("moveend", updateVisibleEvents);
    map.current.on("zoomend", updateVisibleEvents);

    return () => {
      // Remove markers and popup then remove the map
      markers.current.forEach((marker) => marker.remove());
      if (popup.current) popup.current.remove();
      if (map.current) {
        map.current.remove();
        map.current.off("moveend", updateVisibleEvents);
        map.current.off("zoomend", updateVisibleEvents);
      }
    };
  }, [countries, events, updateVisibleEvents]); // Add dependencies

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

        // Clear the polygon fill
        if (map.current) {
          map.current.getSource("polygon-fill").setData({
            type: "Feature",
            properties: {},
            geometry: {
              type: "Polygon",
              coordinates: [],
            },
          });
        }

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

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Events Sidebar */}
      <div className="w-1/3 border-r border-white/5 bg-gradient-to-b from-gray-900/95 to-gray-800/95">
        <EventsPane
          events={visibleEvents}
          selectedEvent={selectedEvent}
          onEventSelect={(event) => {
            setSelectedEvent(event);
            if (
              event &&
              map.current &&
              event.longitude != null &&
              event.latitude != null
            ) {
              map.current.flyTo({
                center: [event.longitude, event.latitude],
                zoom: 4,
                duration: 1500,
              });
            }
          }}
        />
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="h-full" />
        <Legend>
          <h3 className="text-sm font-semibold text-white/90 mb-4">
            Event Severity
          </h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <div className="text-xs text-white/70">Low Impact</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <div className="text-xs text-white/70">Medium Impact</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="text-xs text-white/70">High Impact</div>
            </div>
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
      </div>
    </div>
  );
};

const USE_REAL = true

function App() {
  const mapContainer = useRef<HTMLDivElement>(null);
  // Updated state initialization for asynchronous events load
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [countries, setCountries] = useState([]);

  // Fetch events asynchronously

  let it;
  let k = 10;
  if (USE_REAL) {
    it = getRealEvents(k);
  } else {
    it = generateMockEvents(k);
  }

  useEffect(() => {
    const processNext = () => {
      it.next().then(({ value, done }) => {
        if (done) {
          setLoading(_ => false);
          return;
        }
        setEvents((prevEvents) => [value, ...prevEvents]);
        processNext(); // recursively process next item
      });
    };

    processNext();
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
          <Route path="/analytics" element={<AnalyticsTab events={events} loading={loading} />} />
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
