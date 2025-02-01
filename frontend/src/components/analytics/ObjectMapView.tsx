import React, { useState } from "react";
import Map, { Marker, Popup, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { GeoObject } from "../../types/Event";

const MAPBOX_TOKEN =
  "pk.eyJ1IjoibmV1cm9kaXZlcmdlbnRzZXJpZXMiLCJhIjoiY20zenhkeWkyMmF1ejJsc2Z6dTRlaXhlYiJ9.h6MGz9q6p0T65MQK7A91lg"; // Replace with your token

interface ObjectMapViewProps {
  objects: GeoObject[];
  onClose: () => void;
}

const ObjectMapView: React.FC<ObjectMapViewProps> = ({ objects, onClose }) => {
  const [selectedObject, setSelectedObject] = useState<GeoObject | null>(null);

  const initialViewState = {
    longitude: objects[0]?.longitude || 0,
    latitude: objects[0]?.latitude || 0,
    zoom: 2,
  };

  const typeColors = {
    military: "#ef4444",
    economic: "#10b981",
    political: "#3b82f6",
    infrastructure: "#f59e0b",
    facility: "#8b5cf6",
  };

  return (
    <div className="absolute inset-0 bg-gray-900/95 backdrop-blur-sm z-50">
      <div className="absolute top-4 right-4 z-10 flex gap-4">
        <div className="bg-gray-900/90 backdrop-blur-md rounded-lg border border-white/10 p-4">
          <h3 className="text-sm font-medium text-white/90 mb-3">
            Object Types
          </h3>
          <div className="space-y-2">
            {Object.entries(typeColors).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-white/70 capitalize">
                  {type}
                </span>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          className="h-10 px-4 bg-white/10 hover:bg-white/20 rounded-lg 
          border border-white/10 text-white/90 text-sm transition-all duration-200"
        >
          Close Map
        </button>
      </div>

      <Map
        initialViewState={initialViewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
      >
        <NavigationControl />

        {objects.map((object) => (
          <Marker
            key={object.id}
            longitude={object.longitude}
            latitude={object.latitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedObject(object);
            }}
          >
            <div className="relative group cursor-pointer">
              <div
                className="absolute -inset-3 rounded-full bg-current opacity-20 
              group-hover:opacity-30 blur-md transition-opacity"
                style={{ color: typeColors[object.type] }}
              />
              <div
                className="w-3 h-3 rounded-full relative"
                style={{ backgroundColor: typeColors[object.type] }}
              />
            </div>
          </Marker>
        ))}

        {selectedObject && (
          <Popup
            longitude={selectedObject.longitude}
            latitude={selectedObject.latitude}
            anchor="bottom"
            onClose={() => setSelectedObject(null)}
            className="!bg-gray-900/95 !backdrop-blur-sm !border-white/10"
            maxWidth="300px"
          >
            <div className="p-2">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: typeColors[selectedObject.type] }}
                />
                <h3 className="text-sm font-medium text-white/90">
                  {selectedObject.name}
                </h3>
              </div>
              <p className="text-xs text-white/70 mb-2">
                {selectedObject.description}
              </p>
              <div className="flex flex-wrap gap-1">
                {selectedObject.countries.map((country) => (
                  <span
                    key={country}
                    className="px-1.5 py-0.5 bg-white/5 rounded text-[10px] text-white/70"
                  >
                    {country}
                  </span>
                ))}
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
};

export default ObjectMapView;
