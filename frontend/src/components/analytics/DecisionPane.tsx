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
  MiniMap,
  MarkerType,
  useReactFlow,
} from "reactflow";
import Dagre from '@dagrejs/dagre';
import "reactflow/dist/style.css";
import { Event, Decision, Effect } from "../../types/Event";
import { forEachStreamJson } from "utils/stream";
import { Flipper, Flipped } from "react-flip-toolkit";

// Custom node component
const EffectNode = ({ data }) => {
  const orderColors = {
    1: "from-blue-500/20 to-blue-600/20 border-blue-500/30",
    2: "from-purple-500/20 to-purple-600/20 border-purple-500/30",
    3: "from-pink-500/20 to-pink-600/20 border-pink-500/30",
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border bg-gradient-to-br ${orderColors[data.order]
        } max-w-[300px] text-wrap break-words`}
    >
      <Handle type="target" position={Position.Top} className="!bg-white/30" />
      <div className="min-w-[50px]">
        <div className="flex items-center gap-2 mb-2">
          <div
            className={`w-2 h-2 rounded-full ${data.order === 1
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

const getLayoutedElements = (nodes, edges, options, reactFlowInstance) => {
  const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: options.direction, nodesep: 50, ranksep: 150 }); // spacing adjustments

  edges.forEach((edge) => g.setEdge(edge.source, edge.target));

  // measure node dimensions
  const measuredNodes = nodes.map((node) => {
    const domNode = reactFlowInstance?.getNode(node.id)?.domNode;
    const rect = domNode ? domNode.getBoundingClientRect() : { width: 220, height: 80 }; // default estimate

    return {
      ...node,
      measured: { width: Math.max(rect.width, 220), height: Math.max(rect.height, 80) }, // enforce min size
    };
  });

  measuredNodes.forEach((node) =>
    g.setNode(node.id, { width: node.measured.width, height: node.measured.height })
  );

  Dagre.layout(g);

  return {
    nodes: measuredNodes.map((node) => {
      const position = g.node(node.id);
      return {
        ...node,
        position: { x: position.x - node.measured.width / 2, y: position.y - node.measured.height / 2 },
      };
    }),
    edges,
  };
};

// Modify the createFlowElements helper to arrange effects by row instead of column
const createFlowElements = (effects: Effect[]) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Group effects by order
  const effectsByOrder: { [key: number]: Effect[] } = {};
  effects.forEach((effect) => {
    if (!effectsByOrder[effect.order]) {
      effectsByOrder[effect.order] = [];
    }
    effectsByOrder[effect.order].push(effect);
  });

  const LEVEL_VERTICAL_SPACING = 150;
  const HORIZONTAL_SPACING = 200;

  // Arrange nodes so that each effect level is a row (top to bottom)
  Object.entries(effectsByOrder).forEach(([order, orderEffects]) => {
    const orderNum = parseInt(order);
    // Y coordinate increases with level (order)
    const y = (orderNum - 1) * LEVEL_VERTICAL_SPACING;
    const count = orderEffects.length;
    // Center nodes horizontally in the row
    const startX = -((count - 1) * HORIZONTAL_SPACING) / 2;
    orderEffects.forEach((effect, index) => {
      const x = startX + index * HORIZONTAL_SPACING;
      nodes.push({
        id: effect.name,
        type: "effect",
        data: effect,
        position: { x, y },
        style:
          orderNum === 1
            ? {
              background: "rgba(59, 130, 246, 0.1)",
              borderRadius: "8px",
            }
            : undefined,
      });
    });
  });

  // Create edges with custom styling remains unchanged
  effects.forEach((effect) => {
    if (effect.parent !== "root") {
      (effect.parent as string[]).forEach((parentId) => {
        edges.push({
          id: `${parentId}->${effect.name}`,
          source: parentId,
          target: effect.name,
          type: "smoothstep",
          animated: true,
          style: { stroke: "#ffffff20", strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "#ffffff20" },
        });
      });
    }
  });

  // // Find nodes for initial viewport focus
  // const focusNodes = nodes.filter((node) => {
  //   const effect = node.data as Effect;
  //   return effect.order <= 2; // Only first two levels
  // });

  const layout = getLayoutedElements(nodes, edges, { direction: "TB" });

  // setNodes([...layouted.nodes]);
  // setEdges([...layouted.edges]);
  return { nodes: layout.nodes, edges: layout.edges };
};

const FlowChart: React.FC<{
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
}> = ({ nodes, edges, onNodesChange, onEdgesChange }) => {
  const reactFlowInstance = useReactFlow();


  const onInit = useCallback(
    (instance) => {
      const level1Nodes = nodes.filter(
        (node) => (node.data as Effect).order === 1
      );

      setTimeout(() => {
        instance.fitView({
          padding: 0.2,
          maxZoom: 1,
          // minZoom: 2,
          duration: 800,
          nodes: level1Nodes,
        });

        // Get current viewport state and only modify the zoom
        // const { x, y } = reactFlowInstance.getViewport();
        // reactFlowInstance.setViewport(
        //   {
        //     x,
        //     y,
        //     zoom: reactFlowInstance.getViewport().zoom * 0.8
        //   },
        //   { duration: 400 }
        // );
      }, 50);
    },
    [nodes, edges]
  );

  React.useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.2, duration: 800, maxZoom: 1 });
      }, 100);
    }
  }, [nodes, reactFlowInstance]);

  return (
    <ReactFlow
      onInit={onInit}
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView={false} // Disable automatic fit view
      className="bg-gray-900/30"
      minZoom={0.2}
      maxZoom={1.5}
    >
      <Background color="#ffffff10" />
      <Controls className="!bg-gray-900/50 !border-white/5" />
      <MiniMap
        style={{
          backgroundColor: "rgba(17, 24, 39, 0.9)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
        nodeColor={(node) => {
          const effect = node.data as Effect;
          return effect.order === 1
            ? "#3b82f6"
            : effect.order === 2
              ? "#8b5cf6"
              : "#ec4899";
        }}
      />
    </ReactFlow>
  );
};

interface DecisionPaneProps {
  event: Event | null;
  // companyContext: string;
  selectedDecision: Decision | null;
  onDecisionSelect: (decision: Decision | null) => void;
}

const reorderDecisions = (decisions) => {
  const reordered = [...decisions];

  // alternate insertion order: top-left, top-right, middle-left, middle-right
  const sorted = [];
  for (let i = 0; i < reordered.length; i += 2) {
    if (reordered[i]) sorted.push(reordered[i]);
    if (reordered[i + 1]) sorted.push(reordered[i + 1]);
  }

  return sorted;
};


const DecisionPane: React.FC<DecisionPaneProps> = ({
  event,
  // companyContext,
  selectedDecision,
  onDecisionSelect,
}) => {
  const companyContext = "UK manufacturing company";

  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [decisions, setDecisions] = useState<Decision[]>([])

  React.useEffect(() => {
    if (event) {
      let body = { company_context: companyContext, event: event.title + "\n\n" + event.description }
      fetch(
        "http://localhost:8080/decisions",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      ).then(res =>
        forEachStreamJson<Decision>(res, (decision) => setDecisions(prev => [...prev, decision]), () => setLoading(_ => false))
      );
    } else {
      setDecisions(_ => [])
      onDecisionSelect(null)
    }
  }, [event])

  // Update flow when decision changes
  React.useEffect(() => {
    if (selectedDecision) {
      setNodes([]);
      setEdges([]);

      let body = { company_context: companyContext, decision: selectedDecision.description }
      fetch(
        "http://localhost:8080/effects",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      ).then(res => {
        let effects = []
        forEachStreamJson<Decision>(res, (effect) => {
          console.log(effect)
          effects.push(effect)
          setTimeout(() => { // ensure React Flow renders before layout
            const { nodes: newNodes, edges: newEdges } = createFlowElements(
              effects
            );
            // setNodes(prev => [prev, ...newNodes]);
            // setEdges(prev => [...prev, ...newEdges]);
            setNodes(newNodes)
            setEdges(newEdges)
          }, 10);
        }, () => { })
      });
    }
  }, [selectedDecision, setNodes, setEdges]);

  const renderFlow = () => (
    <div className="h-full">
      <FlowChart
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
      />
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
        <Flipper flipKey={decisions?.map((decision) => decision.id).join(",")}>
          <div className="grid grid-cols-2 gap-4">
            {reorderDecisions(decisions).map((decision) => (
              <Flipped key={decision.id} flipId={decision.id} stagger>
                <div>
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
                </div>
              </Flipped>
            ))}

          </div>
        </Flipper>
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
