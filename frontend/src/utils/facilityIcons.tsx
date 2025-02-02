import React from 'react';
import { ObjectType } from '../types/Event';

export const facilityIcons: Record<ObjectType, React.ReactNode> = {
  military: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  economic: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
    </svg>
  ),
  political: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 10c0-4.4-3.6-8-8-8s-8 3.6-8 8h4v10h8V10h4zm-6 6h-4" />
    </svg>
  ),
  infrastructure: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22V2M2 12h20M17 7l-5-5-5 5M17 17l-5 5-5-5" />
    </svg>
  ),
  facility: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16M3 21h18M9 7h.01M9 11h.01M9 15h.01M13 7h2M13 11h2M13 15h2" />
    </svg>
  ),
};