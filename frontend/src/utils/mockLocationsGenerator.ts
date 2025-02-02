import { GeoObject, ObjectType } from "../types/Event";

const FACILITY_TYPES: { [K in ObjectType]: string[] } = {
  military: [
    "Naval Base",
    "Air Force Base",
    "Training Facility",
    "Command Center",
    "Ammunition Depot",
  ],
  economic: [
    "Financial Center",
    "Trade Hub",
    "Industrial Park",
    "Manufacturing Plant",
    "Distribution Center",
  ],
  political: [
    "Government Complex",
    "Embassy",
    "Administrative Center",
    "Diplomatic Mission",
    "Policy Institute",
  ],
  infrastructure: [
    "Power Plant",
    "Water Treatment",
    "Transportation Hub",
    "Communications Center",
    "Logistics Base",
  ],
  facility: [
    "Research Lab",
    "Storage Facility",
    "Processing Plant",
    "Assembly Plant",
    "Testing Ground",
  ],
};

const COUNTRIES = [
  { name: "United Kingdom", bounds: { lat: [49, 59], lng: [-8, 2] } },
  { name: "Germany", bounds: { lat: [47, 55], lng: [5, 15] } },
  { name: "France", bounds: { lat: [41, 51], lng: [-5, 10] } },
  // Add more as needed
];

function generateRandomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function generateMockLocations(count: number): GeoObject[] {
  const locations: GeoObject[] = [];
  
  for (let i = 0; i < count; i++) {
    const type = Object.keys(FACILITY_TYPES)[
      Math.floor(Math.random() * Object.keys(FACILITY_TYPES).length)
    ] as ObjectType;
    
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    
    const facility = FACILITY_TYPES[type][
      Math.floor(Math.random() * FACILITY_TYPES[type].length)
    ];

    locations.push({
      id: `facility-${i}`,
      name: `${facility} ${String.fromCharCode(65 + i)}`,
      type,
      description: `Strategic ${type} facility located in ${country.name}`,
      latitude: generateRandomInRange(country.bounds.lat[0], country.bounds.lat[1]),
      longitude: generateRandomInRange(country.bounds.lng[0], country.bounds.lng[1]),
      countries: [country.name],
      status: Math.random() > 0.8 ? "inactive" : Math.random() > 0.9 ? "unknown" : "active",
    });
  }

  return locations;
}
