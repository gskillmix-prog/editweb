import { useEffect, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { GraphData, GraphNode } from '../utils/graphUtils';

interface ConceptGraphProps {
    data: GraphData;
    onNodeClick: (nodeId: string) => void;
}

export function ConceptGraph({ data, onNodeClick }: ConceptGraphProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight,
                });
            }
        };

        window.addEventListener('resize', updateDimensions);
        updateDimensions();

        return () => window.removeEventListener('resize', updateDimensions);
    }, []);

    return (
        <div ref={containerRef} className="w-full h-full bg-gray-900">
            <ForceGraph2D
                width={dimensions.width}
                height={dimensions.height}
                graphData={data}
                nodeLabel="name"
                nodeColor={() => '#60a5fa'} // blue-400
                linkColor={() => '#4b5563'} // gray-600
                backgroundColor="#111827" // gray-900
                onNodeClick={(node) => onNodeClick((node as GraphNode).id)}
                nodeRelSize={6}
            />
        </div>
    );
}
