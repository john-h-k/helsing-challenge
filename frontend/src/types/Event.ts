export interface Event {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  date: Date;
  severity: 'low' | 'medium' | 'high';
  potentialEvents?: PotentialEvent[];
}

export interface PotentialEvent {
  id: string;
  title: string;
  probability: number;
  impact: number;
  description: string;
}
