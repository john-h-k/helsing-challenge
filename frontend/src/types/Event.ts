export type ObjectType =
  | "military"
  | "economic"
  | "political"
  | "infrastructure"
  | "facility";

export interface GeoObject {
  id: string;
  name: string;
  type: ObjectType;
  description: string;
  latitude: number;
  longitude: number;
  countries: string[];
  status: "active" | "inactive" | "unknown";
}

export interface Question {
  id: string
  title: string
  description: string
  market: "polymarket" | "kalshi" | "metaculus" | "manifold"
}

export interface Event {
  id: string;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  date: Date;
  possibility: boolean;
  severity: "low" | "medium" | "high";
  potentialEvents?: PotentialEvent[];
  source?: string;
  location?: string;
  decisions?: Decision[];
  questions: Question[];
  objects: GeoObject[];
}

export interface PotentialEvent {
  id: string;
  title: string;
  probability: number;
  impact: number;
  description: string;
}

export interface Effect {
  name: string;
  order: number;
  parent: "root" | string[];
  description: string;
  p_given_parent: { [key: string]: number };
}

export interface Decision {
  id: string;
  title: string;
  description: string;
  // effects: Effect[];
}
