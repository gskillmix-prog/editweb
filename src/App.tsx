import { useState } from 'react';
import { FileExplorer } from './components/FileExplorer';
import { MarkdownViewer } from './components/MarkdownViewer';
import { ConceptGraph } from './components/ConceptGraph';
import { Editor } from './components/Editor';
import { HtmlBuilder, Block } from './components/HtmlBuilder';
import { Converter } from './components/Converter';
import { FileNode, FileSystemFileHandle } from './types';
import { buildGraphData, GraphData } from './utils/graphUtils';
import { Layout, FileText, Network, Edit3, FileCode } from 'lucide-react';
import { clsx } from 'clsx';

function App() {
    const [activeTab, setActiveTab] = useState<'view' | 'graph' | 'editor' | 'html' | 'converter'>('view');
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [htmlBuilderContent, setHtmlBuilderContent] = useState<string>(''); // Stores generated HTML
    const [htmlBuilderBlocks, setHtmlBuilderBlocks] = useState<Block[]>([]); // Stores structured blocks for Builder
    const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
    const [allFiles, setAllFiles] = useState<FileNode | null>(null);

    const handleFileSelect = async (file: FileNode) => {
        setSelectedFile(file);
        try {
            const fileData = await (file.handle as FileSystemFileHandle).getFile();
            const text = await fileData.text();
            setFileContent(text);

            // Auto-switch tab based on file type
            if (file.name.endsWith('.html')) {
                setActiveTab('html');
                setHtmlBuilderContent(text); // Load HTML content
            } else if (file.name.endsWith('.md')) {
                setActiveTab('view');
            } else if (file.name.endsWith('.txt')) {
                setActiveTab('converter');
            }
        } catch (err) {
            console.error('Error reading file:', err);
        }
    };

    const handleFilesLoaded = async (root: FileNode) => {
        setAllFiles(root);
        updateGraph(root);
    };

    const updateGraph = async (root: FileNode) => {
        const flatten = (node: FileNode): FileNode[] => {
            let res: FileNode[] = [node];
            if (node.children) {
                node.children.forEach(c => res = res.concat(flatten(c)));
            }
            return res;
        };
        const flatFiles = flatten(root);
        const data = await buildGraphData(flatFiles);
        setGraphData(data);
    };

    const handleNodeClick = (nodeId: string) => {
        const findNode = (node: FileNode): FileNode | null => {
            if (node.id === nodeId) return node;
            if (node.children) {
                for (const child of node.children) {
                    const found = findNode(child);
                    if (found) return found;
                }
            }
            return null;
        };

        if (allFiles) {
            const targetNode = findNode(allFiles);
            if (targetNode) {
                handleFileSelect(targetNode);
            }
        }
    };

    const handleSave = async () => {
        if (!selectedFile) return;

        try {
            const writable = await (selectedFile.handle as any).createWritable();

            let contentToSave = fileContent;
            if (activeTab === 'editor') {
                // contentToSave is already updated via onChange in Editor
            } else if (activeTab === 'html') {
                contentToSave = htmlBuilderContent;
            }

            await writable.write(contentToSave);
            await writable.close();

            // Update graph if needed
            if (allFiles) {
                updateGraph(allFiles);
            }
            alert('File saved successfully!');
        } catch (err) {
            console.error('Error saving file:', err);
            alert('Failed to save file.');
        }
    };

    const handleConvertToBuilder = (blocks: Block[]) => {
        setHtmlBuilderBlocks(blocks);
        setActiveTab('html');
    };

    return (
        <div className="flex h-screen bg-gray-950 text-gray-100 overflow-hidden">
            <FileExplorer
                onFileSelect={handleFileSelect}
                onFilesLoaded={handleFilesLoaded}
                selectedFileId={selectedFile?.id}
            />

            <div className="flex-1 flex flex-col min-w-0">
                {/* Tab Navigation */}
                <div className="flex items-center border-b border-gray-800 bg-gray-900 px-4">
                    <button
                        onClick={() => setActiveTab('view')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'view' ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
                        )}
                    >
                        <FileText size={16} /> Viewer
                    </button>
                    <button
                        onClick={() => setActiveTab('editor')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'editor' ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
                        )}
                    >
                        <Edit3 size={16} /> Editor
                    </button>
                    <button
                        onClick={() => setActiveTab('html')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'html' ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
                        )}
                    >
                        <Layout size={16} /> HTML Builder
                    </button>
                    <button
                        onClick={() => setActiveTab('converter')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'converter' ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
                        )}
                    >
                        <FileCode size={16} /> Converter
                    </button>
                    <button
                        onClick={() => setActiveTab('graph')}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                            activeTab === 'graph' ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-200"
                        )}
                    >
                        <Network size={16} /> Graph View
                    </button>

                    <div className="ml-auto flex items-center gap-2">
                        <span className="text-xs text-gray-500 mr-2">{selectedFile?.name}</span>
                        <button
                            onClick={handleSave}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-bold"
                        >
                            Save
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'view' && (
                        <div className="h-full overflow-y-auto p-8">
                            <MarkdownViewer content={fileContent} />
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <Editor initialValue={fileContent} onChange={setFileContent} onSave={handleSave} />
                    )}

                    {activeTab === 'html' && (
                        <HtmlBuilder
                            initialContent={htmlBuilderContent}
                            onChange={setHtmlBuilderContent}
                            onSave={handleSave}
                            importedBlocks={htmlBuilderBlocks}
                        />
                    )}

                    {activeTab === 'converter' && (
                        <Converter
                            fileContent={fileContent}
                            fileName={selectedFile?.name || ''}
                            onConvertToBuilder={handleConvertToBuilder}
                        />
                    )}

                    {activeTab === 'graph' && (
                        <ConceptGraph data={graphData} onNodeClick={handleNodeClick} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default App;
