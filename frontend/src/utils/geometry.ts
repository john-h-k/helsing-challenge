export function isPointInPolygon(
  point: [number, number],
  polygon: number[][]
): boolean {
  // Ray casting algorithm
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

// Memoize the results for performance
const memoizedResults = new Map<string, boolean>();

export function checkEventInPolygon(event: Event, polygonCoords: number[][]) {
  if (!event.latitude || !event.longitude) return false;
  
  const key = `${event.id}-${JSON.stringify(polygonCoords)}`;
  if (memoizedResults.has(key)) {
    return memoizedResults.get(key);
  }
  
  const result = isPointInPolygon([event.longitude, event.latitude], polygonCoords);
  memoizedResults.set(key, result);
  return result;
}
