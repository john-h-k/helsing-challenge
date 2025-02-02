import React from 'react';

const LoadingDots: React.FC = () => {
  return (
    <div className="p-4 rounded-xl bg-gray-900/40 border border-white/10 animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-white/20" />
          {/* Title placeholder */}
          <div className="h-4 w-32 bg-white/20 rounded-md" />
        </div>
        {/* Severity badge placeholder */}
        <div className="w-16 h-5 bg-white/10 rounded-full" />
      </div>
      {/* Description lines */}
      <div className="space-y-2 pl-5">
        <div className="h-3 w-full bg-white/10 rounded-md" />
        <div className="h-3 w-4/5 bg-white/10 rounded-md" />
      </div>
      {/* Location info */}
      <div className="mt-3 pl-5 flex items-center gap-2">
        <div className="h-3 w-14 bg-white/20 rounded-md" />
        <div className="h-3 w-28 bg-white/10 rounded-md" />
      </div>
    </div>
  );
};

// Add to your global styles or add directly in component
const shimmerAnimation = `
  @keyframes shimmer {
    0% { opacity: 0.5; }
    50% { opacity: 0.8; }
    100% { opacity: 0.5; }
  }
`;

// Add style tag to head
const styleSheet = document.createElement("style");
styleSheet.textContent = shimmerAnimation;
document.head.appendChild(styleSheet);

export default LoadingDots;
