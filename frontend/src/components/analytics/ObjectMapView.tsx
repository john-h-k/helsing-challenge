import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { GeoObject } from "../../types/Event";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibmV1cm9kaXZlcmdlbnRzZXJpZXMiLCJhIjoiY20zenhkeWkyMmF1ejJsc2Z6dTRlaXhlYiJ9.h6MGz9q6p0T65MQK7A91lg";
mapboxgl.accessToken = MAPBOX_TOKEN;

interface ObjectMapViewProps {
  objects: GeoObject[];
  onClose: () => void;
}

const ObjectMapView: React.FC<ObjectMapViewProps> = ({ objects, onClose }) => {
  const [selectedObject, setSelectedObject] = useState<GeoObject | null>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const popup = useRef<mapboxgl.Popup | null>(null);

  const typeColors = {
    military: "#ef4444",
    economic: "#10b981",
    political: "#3b82f6",
    infrastructure: "#f59e0b",
    facility: "#8b5cf6",
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [objects[0]?.longitude || 0, objects[0]?.latitude || 0],
      zoom: 2,
    });

    // Add navigation control
    map.current.addControl(new mapboxgl.NavigationControl());

    // Create hover popup but don't add to map yet
    const hoverPopup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: "!bg-gray-900/95 !backdrop-blur-sm !border-white/10",
    });

    // Add markers
    objects.forEach((object) => {
      // Create marker element
      const markerEl = document.createElement("div");
      markerEl.className =
        "relative group cursor-pointer transition-transform duration-200 hover:scale-125";

      const glow = document.createElement("div");
      glow.className =
        "absolute -inset-3 rounded-full opacity-20 blur-md transition-opacity";
      glow.style.backgroundColor = typeColors[object.type];

      const dot = document.createElement("div");
      dot.className = "w-3 h-3 rounded-full relative";
      dot.style.backgroundColor = typeColors[object.type];

      markerEl.appendChild(glow);
      markerEl.appendChild(dot);

      // Create and store marker
      const marker = new mapboxgl.Marker(markerEl)
        .setLngLat([object.longitude, object.latitude])
        .addTo(map.current);

      // Add hover handlers
      markerEl.addEventListener("mouseenter", () => {
        const popupContent = `
          <div class="p-2">
            <div class="flex items-center gap-2 mb-1">
              <div class="w-2 h-2 rounded-full" style="background-color: ${
                typeColors[object.type]
              }"></div>
              <h3 class="text-sm font-medium text-white/90">${object.name}</h3>
            </div>
            <p class="text-xs text-white/70">${object.description}</p>
          </div>
        `;

        hoverPopup
          .setLngLat([object.longitude, object.latitude])
          .setHTML(popupContent)
          .addTo(map.current!);
      });

      markerEl.addEventListener("mouseleave", () => {
        hoverPopup.remove();
      });

      // Add click handler
      markerEl.addEventListener("click", () => {
        // Remove existing popup
        if (popup.current) popup.current.remove();

        // Create popup content
        const popupContent = `
          <div class="p-2">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-2 h-2 rounded-full" style="background-color: ${
                typeColors[object.type]
              }"></div>
              <h3 class="text-sm font-medium text-white/90">${object.name}</h3>
            </div>
            <p class="text-xs text-white/70 mb-2">${object.description}</p>
            <div class="flex flex-wrap gap-1">
              ${object.countries
                .map(
                  (country) => `
                <span class="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/70">
                  ${country}
                </span>
              `
                )
                .join("")}
            </div>
          </div>
        `;

        // Create and show popup
        popup.current = new mapboxgl.Popup({
          className: "!bg-gray-900/95 !backdrop-blur-sm !border-white/10",
        })
          .setLngLat([object.longitude, object.latitude])
          .setHTML(popupContent)
          .addTo(map.current!);
      });

      markers.current.push(marker);
    });

    // Cleanup
    return () => {
      markers.current.forEach((marker) => marker.remove());
      if (popup.current) popup.current.remove();
      hoverPopup.remove();
      map.current?.remove();
    };
  }, [objects]);

  return (
    <div className="relative w-full h-[400px] rounded-lg border border-white/10 overflow-hidden">
      {/* Legend and close button */}
      <div className="absolute top-3 right-3 z-10 flex gap-3">
        <div className="bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/10 p-3">
          <div className="space-y-1.5">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-white/70 capitalize">
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-8 px-3 bg-gray-900/90 backdrop-blur-md hover:bg-white/10 rounded-lg 
            border border-white/10 text-white/90 text-xs transition-all duration-200"
        >
          Close
        </button>
      </div>
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};

export default ObjectMapView;
