import React, { useState } from 'react';
import { Event, Decision, Effect } from '../../types/Event';

interface DecisionPaneProps {
  event: Event | null;
  selectedDecision: Decision | null;
  onDecisionSelect: (decision: Decision | null) => void;
}

const DecisionPane: React.FC<DecisionPaneProps> = ({ event, selectedDecision, onDecisionSelect }) => {
  const [inputText, setInputText] = useState('');

  const renderEffectTree = (effects: Effect[], level = 0) => {
    return effects.map(effect => (
      <div key={effect.name} style={{ marginLeft: level * 20 }} className="mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            effect.order === 1 ? 'bg-blue-500' :
            effect.order === 2 ? 'bg-purple-500' :
            'bg-pink-500'
          }`} />
          <span className="font-medium text-white/90">{effect.name}</span>
          <span className="text-sm text-white/50">Order: {effect.order}</span>
        </div>
        <p className="mt-1 ml-4 text-sm text-white/70">{effect.description}</p>
        {effect.p_given_parent && Object.entries(effect.p_given_parent).map(([parent, prob]) => (
          <p key={parent} className="ml-4 text-sm text-white/50">
            P({effect.name}|{parent}): {(prob * 100).toFixed(1)}%
          </p>
        ))}
      </div>
    ));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          Decision Analysis
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {!event ? (
          <div className="flex items-center justify-center h-full text-white/50">
            Click on an event to suggest decisions
          </div>
        ) : selectedDecision ? (
          <div className="space-y-6">
            <div className="p-6 rounded-lg bg-white/5 border border-white/10">
              <h3 className="text-lg font-medium text-white/90">{selectedDecision.title}</h3>
              <p className="mt-2 text-white/70">{selectedDecision.description}</p>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-white/90">Effects Analysis:</h4>
              {renderEffectTree(selectedDecision.effects)}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {event.decisions?.map(decision => (
              <button
                key={decision.id}
                onClick={() => onDecisionSelect(decision)}
                className="w-full p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 
                  transition-all duration-200 text-left"
              >
                <h3 className="font-medium text-white/90">{decision.title}</h3>
                <p className="mt-2 text-sm text-white/70">{decision.description}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-gray-900/95">
        <div className="flex gap-4">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Suggest a decision..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white/90 
              placeholder:text-white/30 focus:outline-none focus:border-white/20"
          />
          <button
            className="px-4 py-2 bg-blue-500/80 hover:bg-blue-500 rounded-lg text-white/90 
              transition-all duration-200"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionPane;
