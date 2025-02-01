import { Event, PotentialEvent } from "../types/Event";
import { addDays, subDays } from "date-fns";

const generateRandomCoordinate = () => {
  return Math.random() * 360 - 180;
};

const generatePotentialEvent = (): PotentialEvent => {
  return {
    id: Math.random().toString(36).substr(2, 9),
    title: `Potential Impact ${Math.floor(Math.random() * 100)}`,
    probability: Math.random(),
    impact: Math.random(),
    description: `This could lead to ${
      ["economic", "social", "political"][Math.floor(Math.random() * 3)]
    } consequences`,
  };
};

const EVENT_TITLES = [
  "Political Unrest",
  "Economic Summit",
  "Natural Disaster",
  "Technological Breakthrough",
  "Diplomatic Meeting",
  "Security Incident",
  "Trade Agreement",
  "Environmental Crisis",
];

const EVENT_DESCRIPTIONS = [
  "Major development with global implications",
  "Significant event affecting regional stability",
  "Critical situation requiring immediate attention",
  "Strategic occurrence with long-term impact",
  "Emerging situation with potential escalation",
];

const generateRandomEvent = (index: number): Event => ({
  id: Math.random().toString(36).substr(2, 9),
  title: EVENT_TITLES[Math.floor(Math.random() * EVENT_TITLES.length)],
  description:
    EVENT_DESCRIPTIONS[Math.floor(Math.random() * EVENT_DESCRIPTIONS.length)],
  latitude: Math.random() * 140 - 70 + Math.random() * 0.1, // Avoid poles
  longitude: Math.random() * 360 - 180,
  date: addDays(subDays(new Date(), 30), index),
  severity: ["low", "medium", "high"][Math.floor(Math.random() * 3)] as
    | "low"
    | "medium"
    | "high",
  potentialEvents: Array(Math.floor(Math.random() * 3) + 1)
    .fill(null)
    .map(() => generatePotentialEvent()),
});

export const generateMockEvents = (count: number): Event[] => {
  return Array.from({ length: count }, (_, i) => generateRandomEvent(i));
};
