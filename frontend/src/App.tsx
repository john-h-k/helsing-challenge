import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import mapboxgl from "mapbox-gl";
import { ThemeProvider, createTheme } from "@mui/material";
import styled from "@emotion/styled";
import Navbar from "./components/Navbar";
import Timeline from "./components/Timeline";
import EventPopup from "./components/EventPopup";
import AnalyticsTab from "./components/analytics/AnalyticsTab";
import { generateMockEvents, getRealEvents } from "./utils/mockDataGenerator";
import { Event, GeoObject } from "./types/Event";
import "mapbox-gl/dist/mapbox-gl.css";
import EventsPane from "components/analytics/EventsPane";
import { forEachStream, forEachStreamJson } from "utils/stream";
import { checkEventInPolygon } from "./utils/geometry";
import { generateMockLocations } from "utils/mockLocationsGenerator";
import { PopupContent } from "./components/MapPopup";
import { facilityIcons, facilityTypeLabels } from "./utils/facilityIcons";

// Add new styled component for marker animations
const markerStyles = `
  @keyframes pulseGlow {
    0% { transform: scale(1); opacity: 0.3; }
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

interface DashboardProps {
  events: Event[];
  mapContainer: React.RefObject<HTMLDivElement>;
  selectedEvent: Event | null;
  setSelectedEvent: (event: Event | null) => void;
  countries: any[]; // Adjust type if available
  locations: GeoObject[];
}

const Dashboard = ({
  events,
  mapContainer,
  selectedEvent,
  setSelectedEvent,
  countries, // Added prop
  locations,
}: DashboardProps) => {
  const navigate = useNavigate();
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

  // Add new state for managing deselected event types
  const [deselectedEventTypes, setDeselectedEventTypes] = useState<string[]>(
    []
  );

  // Get unique event types/sources from events
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((event) => event.type));
    return Array.from(types);
  }, [events]);

  // Filter events based on deselected types
  const filteredEvents = useMemo(() => {
    return events.filter((event) => !deselectedEventTypes.includes(event.type));
  }, [events, deselectedEventTypes]);

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
    const visible = filteredEvents.filter((event) => {
      if (event.longitude == null || event.latitude == null) return false;
      return bounds.contains([event.longitude, event.latitude]);
    });

    setVisibleEvents(visible);
  }, [filteredEvents]);

  const facilityIcons = {
    military: "🎯",
    economic: "💹",
    political: "🏛️",
    infrastructure: "🏗️",
    facility: "🏭",
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "#10B981";
      case "inactive":
        return "#EF4444";
      case "unknown":
        return "#F59E0B";
    }
  };

  // Modify the createMarkers function to store markers with their event IDs
  const markersByEventId = useRef<Map<string, mapboxgl.Marker>>(new Map());

  // Add this function to update marker visibility
  const updateMarkerVisibility = useCallback(() => {
    markersByEventId.current.forEach((marker, eventId) => {
      const event = events.find((e) => e.id === eventId);
      if (event && !deselectedEventTypes.includes(event.type)) {
        marker.addTo(map.current!);
      } else {
        marker.remove();
      }
    });
  }, [events, deselectedEventTypes]);

  const toggleEventType = (type: string) => {
    setDeselectedEventTypes((prev) => {
      const next = prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type];
      return next;
    });
  };

  // Add effect to update marker visibility when deselected types change
  useEffect(() => {
    if (map.current) {
      updateMarkerVisibility();
      updateVisibleEvents();
    }
  }, [deselectedEventTypes, updateMarkerVisibility, updateVisibleEvents]);

  // Modify the createMarkers function
  const createMarkers = () => {
    events.forEach((event) => {
      if (event.longitude == null || event.latitude == null) return;
      if (markersByEventId.current.has(event.id)) return;

      // Create marker (existing marker creation code)
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
      }).setLngLat([event.longitude, event.latitude]);

      // Store marker with event ID
      markersByEventId.current.set(event.id, marker);

      // Only add to map if event type is not deselected
      if (!deselectedEventTypes.includes(event.type)) {
        marker.addTo(map.current!);
      }

      // Reintroduce marker click to show popup
      markerEl.addEventListener("click", () => {
        if (popup.current) popup.current.remove();
        setSelectedEvent(event);

        const popupContent = `
          <div class="p-4 min-w-[300px]">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-white/90">${event.title}</h3>
              <span class="px-2 py-1 text-[11px] rounded-full font-medium ${
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
                <span class="text-white/90">${event.source || "N/A"}</span>
              </div>
              <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                <span class="block text-white/50 mb-1">Location</span>
                <span class="text-white/90">${event.location || "N/A"}</span>
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

  const createFacilityMarkers = () => {
    locations.forEach((location) => {
      const markerEl = document.createElement("div");
      markerEl.className = "facility-marker relative group";

      // Main container - made more circular
      const iconWrapper = document.createElement("div");
      iconWrapper.className = `
        w-8 h-8 rounded-full bg-gray-900/90 shadow-xl
        flex items-center justify-center
        border transition-all duration-300
        transform group-hover:scale-110
        group-hover:-translate-y-1
      `;
      iconWrapper.style.borderColor = getStatusColor(location.status);

      // Status indicator - moved inside the circle
      const statusIndicator = document.createElement("div");
      statusIndicator.className = "absolute inset-0 rounded-full";
      statusIndicator.style.background = `radial-gradient(circle at center, ${getStatusColor(
        location.status
      )}10, transparent 70%)`;

      // Create SVG element manually with adjusted styling
      const iconSvg = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      iconSvg.setAttribute("class", "w-4 h-4 relative z-10");
      iconSvg.setAttribute("viewBox", "0 0 24 24");
      iconSvg.setAttribute("fill", "none");
      iconSvg.setAttribute("stroke", "currentColor");
      iconSvg.setAttribute("stroke-width", "2");

      // Keep the same switch case for SVG paths
      switch (location.type) {
        case "military":
          iconSvg.innerHTML =
            '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>';
          break;
        case "economic":
          iconSvg.innerHTML =
            '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/>';
          break;
        case "political":
          iconSvg.innerHTML =
            '<path d="M2 20h20M4 20V4h16v16"/><path d="M7 8h.01M7 12h.01M7 16h.01M12 8h.01M12 12h.01M12 16h.01M17 8h.01M17 12h.01M17 16h.01"/>';
          break;
        case "infrastructure":
          iconSvg.innerHTML =
            '<path d="M12 22V2M2 12h20M17 7l-5-5-5 5M17 17l-5 5-5-5"/>';
          break;
        case "facility":
          iconSvg.innerHTML =
            '<path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16M3 21h18M9 7h.01M9 11h.01M9 15h.01M13 7h2M13 11h2M13 15h2"/>';
          break;
      }

      // Add icon container with updated styling
      const iconContainer = document.createElement("div");
      iconContainer.className = "text-white/90 relative z-10";
      iconContainer.appendChild(iconSvg);

      iconWrapper.appendChild(statusIndicator);
      iconWrapper.appendChild(iconContainer);
      markerEl.appendChild(iconWrapper);

      const marker = new mapboxgl.Marker({
        element: markerEl,
        anchor: "center",
      })
        .setLngLat([location.longitude, location.latitude])
        .addTo(map.current!);

      markerEl.addEventListener("click", () => {
        if (popup.current) popup.current.remove();

        const popupContent = `
          <div class="p-4 min-w-[300px]">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-medium text-white/90">${
                location.name
              }</h3>
              <span class="px-2 py-1 text-[11px] rounded-full font-medium
                ${
                  location.status === "active"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : location.status === "inactive"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }">
                ${location.status.toUpperCase()}
              </span>
            </div>
            <p class="text-sm text-white/70 mb-4 leading-relaxed">${
              location.description
            }</p>
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                <span class="block text-white/50 mb-1">Type</span>
                <span class="text-white/90">${location.type}</span>
              </div>
              <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                <span class="block text-white/50 mb-1">Country</span>
                <span class="text-white/90">${location.countries.join(
                  ", "
                )}</span>
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
          .setLngLat([location.longitude, location.latitude])
          .setHTML(popupContent)
          .addTo(map.current!);
      });

      markers.current.push(marker);
    });
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
                <span class="px-2 py-1 text-[11px] rounded-full font-medium ${
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
                  <span class="block text-white/50 mb-1">Type</span>
                  <span class="text-white/90">${event.type || "N/A"}</span>
                </div>
                <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                  <span class="block text-white/50 mb-1">Location</span>
                  <span class="text-white/90">${event.location || "N/A"}</span>
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

    const createFacilityMarkers = () => {
      locations.forEach((location) => {
        const markerEl = document.createElement("div");
        markerEl.className = "facility-marker relative group";

        // Main container - made more circular
        const iconWrapper = document.createElement("div");
        iconWrapper.className = `
          w-8 h-8 rounded-full bg-gray-900/90 shadow-xl
          flex items-center justify-center
          border transition-all duration-300
          transform group-hover:scale-110
          group-hover:-translate-y-1
        `;
        iconWrapper.style.borderColor = getStatusColor(location.status);

        // Status indicator - moved inside the circle
        const statusIndicator = document.createElement("div");
        statusIndicator.className = "absolute inset-0 rounded-full";
        statusIndicator.style.background = `radial-gradient(circle at center, ${getStatusColor(
          location.status
        )}10, transparent 70%)`;

        // Create SVG element manually with adjusted styling
        const iconSvg = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg"
        );
        iconSvg.setAttribute("class", "w-4 h-4 relative z-10");
        iconSvg.setAttribute("viewBox", "0 0 24 24");
        iconSvg.setAttribute("fill", "none");
        iconSvg.setAttribute("stroke", "currentColor");
        iconSvg.setAttribute("stroke-width", "2");

        // Keep the same switch case for SVG paths
        switch (location.type) {
          case "military":
            iconSvg.innerHTML =
              '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>';
            break;
          case "economic":
            iconSvg.innerHTML =
              '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/>';
            break;
          case "political":
            iconSvg.innerHTML =
              '<path d="M2 20h20M4 20V4h16v16"/><path d="M7 8h.01M7 12h.01M7 16h.01M12 8h.01M12 12h.01M12 16h.01M17 8h.01M17 12h.01M17 16h.01"/>';
            break;
          case "infrastructure":
            iconSvg.innerHTML =
              '<path d="M12 22V2M2 12h20M17 7l-5-5-5 5M17 17l-5 5-5-5"/>';
            break;
          case "facility":
            iconSvg.innerHTML =
              '<path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16M3 21h18M9 7h.01M9 11h.01M9 15h.01M13 7h2M13 11h2M13 15h2"/>';
            break;
        }

        // Add icon container with updated styling
        const iconContainer = document.createElement("div");
        iconContainer.className = "text-white/90 relative z-10";
        iconContainer.appendChild(iconSvg);

        iconWrapper.appendChild(statusIndicator);
        iconWrapper.appendChild(iconContainer);
        markerEl.appendChild(iconWrapper);

        const marker = new mapboxgl.Marker({
          element: markerEl,
          anchor: "center",
        })
          .setLngLat([location.longitude, location.latitude])
          .addTo(map.current!);

        markerEl.addEventListener("click", () => {
          if (popup.current) popup.current.remove();

          const popupContent = `
            <div class="p-4 min-w-[300px]">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-medium text-white/90">${
                  location.name
                }</h3>
                <span class="px-2 py-1 text-[11px] rounded-full font-medium
                  ${
                    location.status === "active"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : location.status === "inactive"
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }">
                  ${location.status.toUpperCase()}
                </span>
              </div>
              <p class="text-sm text-white/70 mb-4 leading-relaxed">${
                location.description
              }</p>
              <div class="grid grid-cols-2 gap-3 text-xs">
                <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                  <span class="block text-white/50 mb-1">Type</span>
                  <span class="text-white/90">${location.type}</span>
                </div>
                <div class="p-2 rounded-lg bg-white/5 border border-white/10">
                  <span class="block text-white/50 mb-1">Country</span>
                  <span class="text-white/90">${location.countries.join(
                    ", "
                  )}</span>
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
            .setLngLat([location.longitude, location.latitude])
            .setHTML(popupContent)
            .addTo(map.current!);
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
        createFacilityMarkers();
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
          "line-color": "#3b82f6", // Changed from #f59e0b to bright blue
          "line-width": 2,
          "line-opacity": 0.8, // Slightly increased opacity
        },
      });

      map.current!.addLayer({
        id: "drawing-points-layer",
        type: "circle",
        source: "drawing-points",
        paint: {
          "circle-radius": 5,
          "circle-color": "#3b82f6", // Changed from #f59e0b to match the blue
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
          "line-color": "#3b82f6", // Changed from #f59e0b to match
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
          "fill-color": "#3b82f6", // Changed from #f59e0b to match
          "fill-opacity": 0.15, // Adjusted for better visibility
        },
      });
    });

    map.current.on("moveend", updateVisibleEvents);
    map.current.on("zoomend", updateVisibleEvents);

    return () => {
      // Remove markers and popup then remove the map
      markersByEventId.current.forEach((marker) => marker.remove());
      markersByEventId.current.clear();
      if (popup.current) popup.current.remove();
      if (map.current) {
        map.current.remove();
        map.current.off("moveend", updateVisibleEvents);
        map.current.off("zoomend", updateVisibleEvents);
      }
    };
  }, [countries, events, updateVisibleEvents, locations]); // Add dependencies

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

  const selectedEvents = useMemo(() => {
    if (!searchCoordinates || !searchCoordinates[0]) return [];
    return events.filter((event) =>
      checkEventInPolygon(event, searchCoordinates[0])
    );
  }, [events, searchCoordinates]);

  const handleRemediate = () => {
    const polygonParam = searchCoordinates
      ? encodeURIComponent(JSON.stringify(searchCoordinates[0]))
      : "";
    navigate(`/analytics?polygon=${polygonParam}`);
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
          <div className="space-y-6">
            {/* Sources Section - Add this before Events section */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">
                Sources
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {eventTypes.map((type) => (
                  <div
                    key={type}
                    onClick={() => toggleEventType(type)}
                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 rounded px-2 py-1 transition-colors"
                  >
                    <div
                      className={`text-xs text-white/70 ${
                        deselectedEventTypes.includes(type)
                          ? "line-through opacity-50"
                          : ""
                      }`}
                    >
                      {type}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Existing Events Section */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">
                Events
              </h3>
              <div className="space-y-2">
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
            </div>

            {/* Facilities Section */}
            <div>
              <h3 className="text-sm font-semibold text-white/90 mb-3">
                Infrastructure
              </h3>
              <div className="space-y-2">
                {Object.entries(facilityIcons)
                  .filter(([type]) =>
                    ["economic", "infrastructure", "facility"].includes(type)
                  ) // Only show Amazon facility types
                  .map(([type, icon]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-gray-900 border border-white/10 flex items-center justify-center">
                        <div className="w-3 h-3 text-white/80">{icon}</div>
                      </div>
                      <div className="text-xs text-white/70">
                        {facilityTypeLabels[type as ObjectType]}
                      </div>
                    </div>
                  ))}
              </div>
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
            <div className="flex items-center gap-4 min-w-[300px]">
              <div className="text-white font-medium text-base">
                {selectedEvents.length} events selected
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemediate();
                }}
                className="ml-auto px-4 py-1.5 bg-blue-500/20 text-blue-300 rounded-lg 
                  hover:bg-blue-500/30 transition-colors border border-blue-500/30"
              >
                Remediate
              </button>
            </div>
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

const USE_REAL = true;

function App() {
  const companyContext = "UK manufacturing company";

  const mapContainer = useRef<HTMLDivElement>(null);
  // Updated state initialization for asynchronous events load
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [countries, setCountries] = useState([]);
  const [locations] = useState<GeoObject[]>(() => generateMockLocations(15));

  // Fetch events asynchronously

  let it: AsyncIterator<Event>;
  let k = 10;
  if (USE_REAL) {
    it = getRealEvents(companyContext, k);
  } else {
    it = generateMockEvents(k);
  }

  useEffect(() => {
    forEachStream(
      it,
      (value) => {
        if (value.possibility) {
          let body = { question: value.title, k: 3 };
          fetch("http://localhost:5050/get_questions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
            .then((res) => res.json())
            .then((qs) => {
              // let ps = qs.map(q => q.p).sort((a, b) => a - b)
              // const half = Math.floor(ps.length / 2);
              // let median = ps.length % 2
              //     ? ps[half]
              //     : (ps[half - 1] + ps[half]) / 2;

              // for (let q of qs) {
              //   q.p = median + ((Math.random() / 5 - 0.1) * median)
              // }

              value.questions = qs;
              setEvents((prevEvents) => [value, ...prevEvents]);
            });
        } else {
          setEvents((prevEvents) => [value, ...prevEvents]);
        }
      },
      () => setLoading((_) => false)
    );
  }, []);

  useEffect(() => {
    // Fetch country data
    fetch(
      "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson"
    )
      .then((res) => res.json())
      .then(({ features }) => setCountries(features));
  }, []);

  console.log(events);
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
                locations={locations}
              />
            }
          />
          <Route
            path="/analytics"
            element={<AnalyticsTab events={events} loading={loading} />}
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
