import { useState, useEffect } from 'react';
import { FileText, ArrowRight, Layout, FileCode } from 'lucide-react';
import { parseDocumentToBlocks } from '../utils/documentParser';
import { Block } from './HtmlBuilder';

interface ConverterProps {
    fileContent: string;
    fileName: string;
    onConvertToBuilder: (blocks: Block[]) => void;
}

export function Converter({ fileContent, fileName, onConvertToBuilder }: ConverterProps) {
    const [previewBlocks, setPreviewBlocks] = useState<Block[]>([]);
    const [stats, setStats] = useState({ sections: 0, containers: 0, grids: 0 });

    useEffect(() => {
        if (fileContent) {
            const blocks = parseDocumentToBlocks(fileContent);
            setPreviewBlocks(blocks);

            // Calculate stats
            let s = 0, c = 0, g = 0;
            const traverse = (list: Block[]) => {
                list.forEach(b => {
                    if (b.type === 'section') s++;
                    if (b.type === 'container') c++;
                    if (b.type === 'row') g++;
                    if (b.children) traverse(b.children);
                });
            };
            traverse(blocks);
            setStats({ sections: s, containers: c, grids: g });
        }
    }, [fileContent]);

    const handleConvert = () => {
        onConvertToBuilder(previewBlocks);
    };

    if (!fileContent) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 bg-gray-950">
                <FileText size={48} className="mb-4 opacity-20" />
                <p>Select a text file (.txt, .md) to convert</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-950 text-white p-8">
            <div className="max-w-4xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <FileCode className="text-blue-500" />
                            Document Converter
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Standardize "{fileName}" into HTML Structure</p>
                    </div>
                    <button
                        onClick={handleConvert}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-semibold transition-colors"
                    >
                        Open in Builder <ArrowRight size={18} />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-8 h-[600px]">
                    {/* Source View */}
                    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex flex-col">
                        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Source Content</h3>
                        <textarea
                            readOnly
                            value={fileContent}
                            className="flex-1 bg-gray-950 border border-gray-800 rounded p-4 font-mono text-sm text-gray-300 resize-none focus:outline-none"
                        />
                    </div>

                    {/* Analysis View */}
                    <div className="bg-gray-900 rounded-lg border border-gray-800 p-4 flex flex-col">
                        <h3 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Structure Analysis</h3>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-gray-800 p-4 rounded text-center">
                                <div className="text-2xl font-bold text-blue-400">{stats.sections}</div>
                                <div className="text-xs text-gray-500">Sections</div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded text-center">
                                <div className="text-2xl font-bold text-purple-400">{stats.containers}</div>
                                <div className="text-xs text-gray-500">Containers</div>
                            </div>
                            <div className="bg-gray-800 p-4 rounded text-center">
                                <div className="text-2xl font-bold text-green-400">{stats.grids}</div>
                                <div className="text-xs text-gray-500">Grids</div>
                            </div>
                        </div>

                        <div className="flex-1 bg-gray-950 border border-gray-800 rounded p-4 overflow-y-auto">
                            <div className="space-y-2">
                                {previewBlocks.map((block, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                                        <Layout size={14} className={
                                            block.type === 'section' ? 'text-blue-500' :
                                                block.type === 'container' ? 'text-purple-500' :
                                                    block.type === 'row' ? 'text-green-500' : 'text-gray-600'
                                        } />
                                        <span className="capitalize">{block.type}</span>
                                        {block.content && <span className="text-gray-600 truncate">- {block.content}</span>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
