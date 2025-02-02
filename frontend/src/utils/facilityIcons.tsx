import React from 'react';
import { ObjectType } from '../types/Event';

export const facilityIcons: Record<ObjectType, React.ReactNode> = {
  economic: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18H3V3z"/>
      <path d="M7 7h2v10H7V7z"/>
      <path d="M11 7h2v10h-2V7z"/>
      <path d="M15 7h2v10h-2V7z"/>
    </svg>
  ),
  infrastructure: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 4v16h16V4H4z"/>
      <path d="M9 4v16"/>
      <path d="M15 4v16"/>
      <path d="M4 9h16"/>
      <path d="M4 15h16"/>
    </svg>
  ),
  facility: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3L2 12h3v8h14v-8h3L12 3z"/>
      <path d="M9 15h6"/>
      <path d="M9 11h6"/>
    </svg>
  ),
  // Keep these but they won't be used for Amazon facilities
  military: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
  ),
  political: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0-4.4-3.6-8-8-8s-8 3.6-8 8h4v10h8V10h4zm-6 6h-4"/>
    </svg>
  ),
};

// Add descriptive labels for each type
export const facilityTypeLabels: Record<ObjectType, string> = {
  economic: 'Logistics & Distribution',
  infrastructure: 'AWS & Operations',
  facility: 'Research & Development',
  military: 'Military',
  political: 'Political'
};