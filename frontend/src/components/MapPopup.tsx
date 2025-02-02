import { Event, GeoObject } from '../types/Event';

interface PopupContentProps {
  item: Event | GeoObject;
  type: 'event' | 'location';
}

export const PopupContent: React.FC<PopupContentProps> = ({ item, type }) => {
  if (type === 'event') {
    const event = item as Event;
    return (
      <div className="p-4 min-w-[300px]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white/90">{event.title}</h3>
          <span className={`
            px-2 py-1 text-[11px] rounded-full font-medium
            ${event.severity === "high"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : event.severity === "medium"
                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            }`}>
            {event.severity.toUpperCase()}
          </span>
        </div>
        <p className="text-sm text-white/70 mb-4 leading-relaxed">{event.description}</p>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="block text-white/50 mb-1">Source</span>
            <span className="text-white/90">{event.source}</span>
          </div>
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <span className="block text-white/50 mb-1">Location</span>
            <span className="text-white/90">{event.location}</span>
          </div>
        </div>
      </div>
    );
  }

  const location = item as GeoObject;
  return (
    <div className="p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-white/90">{location.name}</h3>
        <span className={`
          px-2 py-1 text-[11px] rounded-full font-medium
          ${location.status === "active"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : location.status === "inactive"
              ? "bg-red-500/10 text-red-400 border border-red-500/20"
              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
          }`}>
          {location.status.toUpperCase()}
        </span>
      </div>
      <p className="text-sm text-white/70 mb-4 leading-relaxed">{location.description}</p>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <span className="block text-white/50 mb-1">Type</span>
          <span className="text-white/90">{location.type}</span>
        </div>
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <span className="block text-white/50 mb-1">Country</span>
          <span className="text-white/90">{location.countries.join(", ")}</span>
        </div>
      </div>
    </div>
  );
};
