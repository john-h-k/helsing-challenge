import React from 'react';

const LoadingDecision: React.FC<{ index: number }> = ({ index }) => {
  return (
    <div 
      className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-600/20 animate-pulse"
      style={{
        animation: `fadeInUp 0.6s ease-out forwards`,
        animationDelay: `${index * 0.1}s`,
        opacity: 0,
        transform: 'translateY(20px)',
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="h-5 w-40 bg-emerald-400/20 rounded-md" />
        <div className="w-5 h-5 bg-emerald-400/10 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-emerald-400/10 rounded-md" />
        <div className="h-3 w-4/5 bg-emerald-400/10 rounded-md" />
      </div>
    </div>
  );
};

// Add keyframe animation
const fadeInUpAnimation = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

// Add style tag to head
const styleSheet = document.createElement("style");
styleSheet.textContent = fadeInUpAnimation;
document.head.appendChild(styleSheet);

export default LoadingDecision;
