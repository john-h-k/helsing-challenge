import React, { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { Event, Decision, Effect } from "../../types/Event";

// Custom node component
const EffectNode = ({ data }) => {
  const orderColors = {
    1: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    2: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    3: "from-pink-500/20 to-pink-600/20 border-pink-500/30",
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-gradient-to-br ${
        orderColors[data.order]
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/30" />
      <div className="min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full ${
              data.order === 1
                ? "bg-blue-500"
                : data.order === 2
                ? "bg-purple-500"
                : "bg-pink-500"
            }`}
          />
          <h3 className="font-medium text-white/90 text-sm">{data.name}</h3>
        </div>
        <p className="text-xs text-white/70 mb-2">{data.description}</p>
        {Object.entries(data.p_given_parent).map(([parent, prob]) => (
          <div key={parent} className="text-xs text-white/50">
            P({data.name}|{parent}): {(prob * 100).toFixed(1)}%
          </div>
        ))}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-white/30"
      />
    </div>
  );
};

const nodeTypes = {
  effect: EffectNode,
};

// Convert effects to nodes and edges
const createFlowElements = (effects: Effect[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  effects.forEach((effect, index) => {
    // Create node
    nodes.push({
      id: effect.name,
      type: "effect",
      data: effect,
      position: {
        x: 250,
        y: index * 150,
      },
    });

    // Create edges
    if (effect.parent !== "root") {
      (effect.parent as string[]).forEach((parentId) => {
        edges.push({
          id: `${parentId}->${effect.name}`,
          source: parentId,
          target: effect.name,
          style: { stroke: "#ffffff20" },
          animated: true,
        });
      });
    }
  });

  return { nodes, edges };
};

interface DecisionPaneProps {
  event: Event | null;
  selectedDecision: Decision | null;
  onDecisionSelect: (decision: Decision | null) => void;
}

const FlowChart: React.FC<{
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
}> = ({ nodes, edges, onNodesChange, onEdgesChange }) => {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      className="bg-gray-900/30"
      minZoom={0.2}
      maxZoom={1.5}
      defaultViewport={{ zoom: 0.8, x: 0, y: 0 }}
    >
      <Background color="#ffffff10" />
      <Controls className="!bg-gray-900/50 !border-white/5" />
    </ReactFlow>
  );
};

const DecisionPane: React.FC<DecisionPaneProps> = ({
  event,
  selectedDecision,
  onDecisionSelect,
}) => {
  const [inputText, setInputText] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Update flow when decision changes
  React.useEffect(() => {
    if (selectedDecision) {
      const { nodes: newNodes, edges: newEdges } = createFlowElements(
        selectedDecision.effects
      );
      setNodes(newNodes);
      setEdges(newEdges);
    }
  }, [selectedDecision, setNodes, setEdges]);

  const renderFlow = () => (
    <div className="h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-900/30"
        minZoom={0.2}
        maxZoom={1.5}
        defaultViewport={{ zoom: 0.8, x: 0, y: 0 }}
      >
        <Background color="#ffffff10" />
        <Controls className="!bg-gray-900/50 !border-white/5" />
      </ReactFlow>
    </div>
  );

  const renderContent = () => {
    if (!event) {
      return (
        <div className="flex items-center justify-center h-full text-white/50">
          Click on an event to suggest decisions
        </div>
      );
    }

    if (selectedDecision) {
      return <ReactFlowProvider>{renderFlow()}</ReactFlowProvider>;
    }

    return (
      <div className="p-6">
        <h3 className="text-md font-medium text-white/90 mb-6">
          Potential Decisions
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {event.decisions?.map((decision) => (
            <button
              key={decision.id}
              onClick={() => onDecisionSelect(decision)}
              className="p-5 rounded-xl bg-emerald-950/30 border border-emerald-600/20 
                hover:bg-emerald-900/30 hover:border-emerald-500/30
                transition-all duration-300 text-left group relative overflow-hidden"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-emerald-50/90 group-hover:text-emerald-50 transition-colors">
                  {decision.title}
                </h3>
                <svg
                  className="w-5 h-5 text-emerald-400/40 group-hover:text-emerald-400/60 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-emerald-100/50 group-hover:text-emerald-100/70 transition-colors">
                {decision.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          {selectedDecision && (
            <button
              onClick={() => onDecisionSelect(null)}
              className="group p-1 -ml-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <svg
                className="w-5 h-5 text-white/70 transition-transform group-hover:-translate-x-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          )}
          <h2 className="text-lg font-semibold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
            {selectedDecision ? selectedDecision.title : "Decision Analysis"}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderContent()}</div>

      <div className="p-4 border-t border-white/5">
        <div className="flex gap-3">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Suggest a decision..."
            className="flex-1 bg-gray-900/40 border border-white/10 rounded-lg px-4 py-2.5 
              text-sm text-white/90 placeholder:text-white/30 
              focus:outline-none focus:border-white/20 transition-colors"
          />
          <button
            className="px-4 py-2 bg-gray-900/40 hover:bg-white/5 rounded-lg text-white/70 text-sm
              border border-white/10 hover:border-white/20 transition-all duration-200"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecisionPane;
