import { GeoObject, ObjectType } from "../types/Event";

// Real Amazon locations data
const AMAZON_LOCATIONS = [/* paste the entire JSON array here */];

// Map Amazon's custom types to our ObjectType
const TYPE_MAPPING: { [key: string]: ObjectType } = {
  corporate_office: "infrastructure",
  data_center: "infrastructure",
  fulfillment_center: "economic",
  delivery_hub: "economic",
  research_lab: "facility",
  retail_store: "economic",
  sustainability_site: "infrastructure",
  engineering_office: "facility",
  robotics: "facility"
};

export function generateMockLocations(count: number): GeoObject[] {
  // Instead of generating random locations, use the real data
  return AMAZON_LOCATIONS.map(location => ({
    id: location.id,
    name: location.name,
    type: TYPE_MAPPING[location.type] || "facility", // Default to facility if type not mapped
    description: location.description,
    latitude: location.latitude,
    longitude: location.longitude,
    countries: location.countries,
    status: location.status as "active" | "inactive" | "unknown"
  }));
}
