import { useState, useEffect } from 'react';
import { Plus, Layout, Type, Box, Trash2, Image as ImageIcon, Link as LinkIcon, List, Download, Upload, FileCode, Columns, LayoutGrid } from 'lucide-react';
import { clsx } from 'clsx';
import { parseDocumentToBlocks } from '../utils/documentParser';

interface HtmlBuilderProps {
    initialContent: string;
    onChange: (content: string) => void;
    onSave: () => void;
    importedBlocks?: Block[];
}

interface BlockStyle {
    backgroundColor?: string;
    backgroundImage?: string;
    backgroundGradient?: string;
    backgroundSize?: 'cover' | 'contain' | 'auto';
    color?: string;
    padding?: string;
    margin?: string;
    fontSize?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    border?: string;
    borderRadius?: string;
    width?: string;
    height?: string;
    display?: string;
    flexDirection?: string;
    justifyContent?: string;
    alignItems?: string;
    gap?: string;
    flex?: string; // For column to take available space
    minWidth?: string; // For column to prevent shrinking
    gridTemplateColumns?: string; // For grid row
    gridColumnSpan?: number; // For grid column (1-12)
}

export interface Block {
    id: string;
    type: 'section' | 'container' | 'row' | 'column' | 'heading' | 'paragraph' | 'image' | 'link' | 'list';
    content?: string;
    src?: string; // For images
    href?: string; // For links
    items?: string[]; // For lists
    children?: Block[];
    style?: BlockStyle;
}

export function HtmlBuilder({ initialContent, onChange, onSave, importedBlocks }: HtmlBuilderProps) {
    const [blocks, setBlocks] = useState<Block[]>([]);
    const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const [layoutInput, setLayoutInput] = useState(''); // For Grid Layout Input

    useEffect(() => {
        if (importedBlocks && importedBlocks.length > 0) {
            setBlocks(importedBlocks);
            updateHtml(importedBlocks);
        } else if (!initialContent) {
            setBlocks([]);
        }
    }, [importedBlocks]);

    const addBlock = (type: Block['type'], parentId?: string) => {
        const newBlock: Block = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            content: type === 'heading' ? 'New Heading' : type === 'paragraph' ? 'New Paragraph' : type === 'link' ? 'Link Text' : undefined,
            src: type === 'image' ? 'https://via.placeholder.com/150' : undefined,
            href: type === 'link' ? '#' : undefined,
            items: type === 'list' ? ['Item 1', 'Item 2', 'Item 3'] : undefined,
            children: type === 'section' || type === 'container' || type === 'row' || type === 'column' ? [] : undefined,
            style: { padding: '10px' }
        };

        if (type === 'row') {
            // Default to 12-column grid
            newBlock.style = { ...newBlock.style, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '10px', width: '100%' };
        }
        if (type === 'column') {
            // Default span 12 (full width) if added manually, or logic will handle it
            newBlock.style = { ...newBlock.style, gridColumnSpan: 12, minWidth: '0' };
        }

        if (parentId) {
            const updateChildren = (list: Block[]): Block[] => {
                return list.map(b => {
                    if (b.id === parentId) {
                        return { ...b, children: [...(b.children || []), newBlock] };
                    }
                    if (b.children) return { ...b, children: updateChildren(b.children) };
                    return b;
                });
            };
            const newBlocks = updateChildren(blocks);
            setBlocks(newBlocks);
            updateHtml(newBlocks);
        } else {
            const newBlocks = [...blocks, newBlock];
            setBlocks(newBlocks);
            updateHtml(newBlocks);
        }
        setSelectedBlockId(newBlock.id);
    };

    const updateBlock = (id: string, updates: Partial<Block>) => {
        const update = (list: Block[]): Block[] => {
            return list.map(b => {
                if (b.id === id) return { ...b, ...updates };
                if (b.children) return { ...b, children: update(b.children) };
                return b;
            });
        };
        const newBlocks = update(blocks);
        setBlocks(newBlocks);
        updateHtml(newBlocks);
    };

    const deleteBlock = (id: string) => {
        const remove = (list: Block[]): Block[] => {
            return list.filter(b => b.id !== id).map(b => {
                if (b.children) return { ...b, children: remove(b.children) };
                return b;
            });
        };
        const newBlocks = remove(blocks);
        setBlocks(newBlocks);
        setSelectedBlockId(null);
        updateHtml(newBlocks);
    };

    const handleImport = () => {
        const parsedBlocks = parseDocumentToBlocks(importText);
        setBlocks(parsedBlocks);
        updateHtml(parsedBlocks);
        setShowImportModal(false);
        setImportText('');
    };

    const handleExportDeploy = () => {
        const html = generateCleanHtml(blocks);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'deploy.html';
        a.click();
        URL.revokeObjectURL(url);
    };

    const applyGridLayout = (blockId: string, layoutStr: string) => {
        // Parse layout string like "5:7", "3:2:7", "3"
        let ratios: number[] = [];
        if (layoutStr.includes(':')) {
            ratios = layoutStr.split(':').map(Number);
        } else {
            const count = parseInt(layoutStr);
            if (!isNaN(count) && count > 0) {
                const span = Math.floor(12 / count);
                ratios = Array(count).fill(span);
                // Distribute remainder? For now simple equal split.
            }
        }

        if (ratios.length === 0) return;

        // Find the block and update its children
        const update = (list: Block[]): Block[] => {
            return list.map(b => {
                if (b.id === blockId && (b.type === 'row' || b.type === 'container')) {
                    const isContainer = b.type === 'container';

                    // Create new columns based on ratios
                    const newChildren: Block[] = ratios.map((span, index) => {
                        let children: Block[] = [];

                        // If converting Container -> Row, move ALL original children to the FIRST column
                        if (isContainer) {
                            if (index === 0) children = b.children || [];
                        } else {
                            // If Row -> Row (re-layout), try to keep existing columns' content
                            if (b.children && b.children[index]) {
                                children = b.children[index].children || [];
                            }
                        }

                        return {
                            id: Math.random().toString(36).substr(2, 9),
                            type: 'column',
                            children: children,
                            style: { gridColumnSpan: span, minWidth: '0' }
                        };
                    });

                    return {
                        ...b,
                        type: 'row', // Force type to row
                        style: {
                            ...b.style,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(12, 1fr)',
                            gap: '10px',
                            width: '100%'
                        },
                        children: newChildren
                    };
                }
                if (b.children) return { ...b, children: update(b.children) };
                return b;
            });
        };

        const newBlocks = update(blocks);
        setBlocks(newBlocks);
        updateHtml(newBlocks);
        setLayoutInput('');
    };

    const styleToString = (style?: BlockStyle) => {
        if (!style) return '';
        const s: any = { ...style };

        // Convert custom props to CSS
        if (s.gridColumnSpan) {
            s.gridColumn = `span ${s.gridColumnSpan} / span ${s.gridColumnSpan}`;
            delete s.gridColumnSpan;
        }
        if (s.backgroundGradient) {
            s.backgroundImage = s.backgroundGradient;
            delete s.backgroundGradient;
        }
        if (s.backgroundImage && !s.backgroundImage.startsWith('linear-gradient') && !s.backgroundImage.startsWith('url')) {
            s.backgroundImage = `url(${s.backgroundImage})`;
        }

        return Object.entries(s).map(([k, v]) => `${k.replace(/[A-Z]/g, m => '-' + m.toLowerCase())}: ${v}`).join('; ');
    };

    const generateCleanHtml = (list: Block[]): string => {
        const bodyContent = list.map(b => {
            const style = `style="${styleToString(b.style)}"`;
            if (b.type === 'section') return `<section ${style}>${generateCleanHtml(b.children || [])}</section>`;
            if (b.type === 'container') return `<div class="container mx-auto" ${style}>${generateCleanHtml(b.children || [])}</div>`;
            if (b.type === 'row') return `<div class="grid grid-cols-12" ${style}>${generateCleanHtml(b.children || [])}</div>`;
            if (b.type === 'column') return `<div ${style}>${generateCleanHtml(b.children || [])}</div>`;
            if (b.type === 'heading') return `<h2 ${style}>${b.content}</h2>`;
            if (b.type === 'paragraph') return `<p ${style}>${b.content}</p>`;
            if (b.type === 'image') return `<img src="${b.src}" alt="Image" ${style} />`;
            if (b.type === 'link') return `<a href="${b.href}" ${style}>${b.content}</a>`;
            if (b.type === 'list') return `<ul ${style}>${b.items?.map(i => `<li>${i}</li>`).join('')}</ul>`;
            return '';
        }).join('');

        return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Exported Document</title>
</head>
<body class="bg-gray-900 text-white p-8">
${bodyContent}
</body>
</html>`;
    };

    const updateHtml = (currentBlocks: Block[]) => {
        onChange(generateCleanHtml(currentBlocks));
    };

    const renderPropertiesPanel = () => {
        if (!selectedBlockId) return <div className="p-4 text-gray-500 text-center">Select an element to edit properties</div>;

        const findBlock = (list: Block[]): Block | null => {
            for (const b of list) {
                if (b.id === selectedBlockId) return b;
                if (b.children) {
                    const found = findBlock(b.children);
                    if (found) return found;
                }
            }
            return null;
        };

        const block = findBlock(blocks);
        if (!block) return null;

        return (
            <div className="p-4 space-y-4">
                <div className="font-bold text-lg border-b border-gray-700 pb-2 mb-4 flex justify-between items-center">
                    <span className="capitalize">{block.type} Properties</span>
                    <button onClick={() => deleteBlock(block.id)} className="text-red-500 hover:text-red-400"><Trash2 size={16} /></button>
                </div>

                {/* Grid Layout Configurator for Row AND Container */}
                {(block.type === 'row' || block.type === 'container') && (
                    <div className="bg-gray-800 p-3 rounded mb-4 border border-purple-500/30">
                        <label className="block text-xs text-purple-400 mb-1 font-bold">Grid Layout (12 Columns)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={layoutInput}
                                onChange={(e) => setLayoutInput(e.target.value)}
                                className="flex-1 bg-gray-900 border border-gray-700 rounded p-2 text-sm"
                                placeholder='e.g. "5:7" or "3"'
                            />
                            <button
                                onClick={() => applyGridLayout(block.id, layoutInput)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-3 rounded text-sm"
                            >
                                Apply
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">
                            {block.type === 'container' ? 'Converts Container to Row.' : 'Updates Row columns.'}
                        </p>
                    </div>
                )}

                {/* Content Fields */}
                {(block.type === 'heading' || block.type === 'paragraph' || block.type === 'link') && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Content</label>
                        <textarea
                            value={block.content || ''}
                            onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            rows={3}
                        />
                    </div>
                )}

                {block.type === 'image' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Image URL</label>
                        <input
                            type="text"
                            value={block.src || ''}
                            onChange={(e) => updateBlock(block.id, { src: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                        />
                    </div>
                )}

                {block.type === 'link' && (
                    <div>
                        <label className="block text-xs text-gray-400 mb-1">Link URL (Href)</label>
                        <input
                            type="text"
                            value={block.href || ''}
                            onChange={(e) => updateBlock(block.id, { href: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                        />
                    </div>
                )}

                {/* Style Fields */}
                <div className="pt-4 border-t border-gray-700">
                    <h4 className="font-bold mb-2 text-sm text-gray-300">Styles</h4>

                    {/* Background Controls */}
                    <div className="mb-4">
                        <label className="block text-xs text-gray-400 mb-1">Background</label>
                        <div className="grid grid-cols-2 gap-2 mb-2">
                            <div>
                                <label className="text-[10px] text-gray-500">Color</label>
                                <input
                                    type="color"
                                    value={block.style?.backgroundColor || '#000000'}
                                    onChange={(e) => updateBlock(block.id, { style: { ...block.style, backgroundColor: e.target.value } })}
                                    className="w-full h-8 bg-gray-800 rounded cursor-pointer"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-500">Image URL</label>
                                <input
                                    type="text"
                                    value={block.style?.backgroundImage || ''}
                                    onChange={(e) => updateBlock(block.id, { style: { ...block.style, backgroundImage: e.target.value } })}
                                    className="w-full h-8 bg-gray-800 border border-gray-700 rounded px-2 text-xs"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500">Gradient (CSS)</label>
                            <input
                                type="text"
                                value={block.style?.backgroundGradient || ''}
                                onChange={(e) => updateBlock(block.id, { style: { ...block.style, backgroundGradient: e.target.value } })}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                                placeholder="linear-gradient(to right, #333, #000)"
                            />
                        </div>
                    </div>

                    {/* Flexbox Controls for Container/Column */}
                    {(block.type === 'container' || block.type === 'column') && (
                        <div className="mb-4 border-t border-gray-700 pt-2">
                            <label className="block text-xs text-gray-400 mb-1">Flex Layout</label>
                            <div className="flex items-center gap-2 mb-2">
                                <input
                                    type="checkbox"
                                    checked={block.style?.display === 'flex'}
                                    onChange={(e) => updateBlock(block.id, { style: { ...block.style, display: e.target.checked ? 'flex' : 'block' } })}
                                />
                                <span className="text-sm">Enable Flexbox</span>
                            </div>
                            {block.style?.display === 'flex' && (
                                <div className="space-y-2">
                                    <select
                                        value={block.style?.flexDirection || 'row'}
                                        onChange={(e) => updateBlock(block.id, { style: { ...block.style, flexDirection: e.target.value } })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-xs"
                                    >
                                        <option value="row">Row (Horizontal)</option>
                                        <option value="column">Column (Vertical)</option>
                                    </select>
                                    <select
                                        value={block.style?.justifyContent || 'flex-start'}
                                        onChange={(e) => updateBlock(block.id, { style: { ...block.style, justifyContent: e.target.value } })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-xs"
                                    >
                                        <option value="flex-start">Justify: Start</option>
                                        <option value="center">Justify: Center</option>
                                        <option value="flex-end">Justify: End</option>
                                        <option value="space-between">Justify: Space Between</option>
                                    </select>
                                    <select
                                        value={block.style?.alignItems || 'stretch'}
                                        onChange={(e) => updateBlock(block.id, { style: { ...block.style, alignItems: e.target.value } })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-1 text-xs"
                                    >
                                        <option value="stretch">Align: Stretch</option>
                                        <option value="flex-start">Align: Start</option>
                                        <option value="center">Align: Center</option>
                                        <option value="flex-end">Align: End</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Text Color</label>
                            <input
                                type="color"
                                value={block.style?.color || '#ffffff'}
                                onChange={(e) => updateBlock(block.id, { style: { ...block.style, color: e.target.value } })}
                                className="w-full h-8 bg-gray-800 rounded cursor-pointer"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-400 mb-1">Font Size</label>
                            <input
                                type="text"
                                value={block.style?.fontSize || ''}
                                onChange={(e) => updateBlock(block.id, { style: { ...block.style, fontSize: e.target.value } })}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-xs"
                                placeholder="16px"
                            />
                        </div>
                    </div>

                    <div className="mt-2">
                        <label className="block text-xs text-gray-400 mb-1">Padding</label>
                        <input
                            type="text"
                            value={block.style?.padding || ''}
                            onChange={(e) => updateBlock(block.id, { style: { ...block.style, padding: e.target.value } })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            placeholder="e.g. 10px"
                        />
                    </div>

                    <div className="mt-2">
                        <label className="block text-xs text-gray-400 mb-1">Margin</label>
                        <input
                            type="text"
                            value={block.style?.margin || ''}
                            onChange={(e) => updateBlock(block.id, { style: { ...block.style, margin: e.target.value } })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            placeholder="e.g. 10px auto"
                        />
                    </div>

                    <div className="mt-2">
                        <label className="block text-xs text-gray-400 mb-1">Text Align</label>
                        <select
                            value={block.style?.textAlign || 'left'}
                            onChange={(e) => updateBlock(block.id, { style: { ...block.style, textAlign: e.target.value as any } })}
                            className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-white"
                        >
                            <option value="left">Left</option>
                            <option value="center">Center</option>
                            <option value="right">Right</option>
                        </select>
                    </div>

                    {(block.type === 'row' || block.type === 'column') && (
                        <div className="mt-2">
                            <label className="block text-xs text-gray-400 mb-1">Gap</label>
                            <input
                                type="text"
                                value={block.style?.gap || ''}
                                onChange={(e) => updateBlock(block.id, { style: { ...block.style, gap: e.target.value } })}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                placeholder="e.g. 10px"
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderBlock = (block: Block) => {
        const isSelected = selectedBlockId === block.id;

        const commonClasses = clsx(
            "relative group transition-all cursor-pointer",
            isSelected ? "ring-2 ring-blue-500 z-10" : "hover:ring-1 hover:ring-gray-600"
        );

        const handleClick = (e: React.MouseEvent) => {
            e.stopPropagation();
            setSelectedBlockId(block.id);
        };

        const handleDelete = (e: React.MouseEvent) => {
            e.stopPropagation();
            deleteBlock(block.id);
        };

        // Convert style object for React
        const blockStyle = { ...block.style } as any;
        if (blockStyle.gridColumnSpan) {
            blockStyle.gridColumn = `span ${blockStyle.gridColumnSpan} / span ${blockStyle.gridColumnSpan}`;
        }
        if (blockStyle.backgroundGradient) {
            blockStyle.backgroundImage = blockStyle.backgroundGradient;
        }

        const deleteButton = isSelected && (
            <div className="absolute top-1 right-1 z-50">
                <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white p-1 rounded shadow-lg" title="Delete">
                    <Trash2 size={14} />
                </button>
            </div>
        );

        if (block.type === 'section') {
            return (
                <div key={block.id} className={clsx(commonClasses, "p-4 border border-dashed border-gray-700 my-2 min-h-[100px] bg-gray-900/50")} style={blockStyle} onClick={handleClick}>
                    <div className="absolute top-0 left-0 bg-gray-800 text-xs px-2 py-1 text-gray-400 rounded-br opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">Section</div>
                    {deleteButton}
                    {block.children?.map(renderBlock)}
                    {isSelected && (
                        <div className="flex justify-center mt-2 gap-2">
                            <button onClick={(e) => { e.stopPropagation(); addBlock('container', block.id); }} className="text-xs bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-700">+ Container</button>
                        </div>
                    )}
                </div>
            );
        }

        if (block.type === 'container') {
            return (
                <div key={block.id} className={clsx(commonClasses, "p-2 border border-blue-900/30 my-1 min-h-[50px] bg-blue-900/5")} style={blockStyle} onClick={handleClick}>
                    <div className="absolute top-0 right-0 text-xs text-blue-500 px-1 opacity-0 group-hover:opacity-100 pointer-events-none">Container</div>
                    {deleteButton}
                    {block.children?.map(renderBlock)}
                    {isSelected && (
                        <div className="flex justify-center mt-2 gap-2 opacity-50 hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); addBlock('row', block.id); }} className="text-xs bg-purple-600 px-2 py-1 rounded text-white hover:bg-purple-700">+ Row</button>
                            <button onClick={(e) => { e.stopPropagation(); addBlock('heading', block.id); }} className="text-xs bg-gray-700 px-2 py-1 rounded text-white hover:bg-gray-600">+ Text</button>
                        </div>
                    )}
                </div>
            );
        }

        if (block.type === 'row') {
            return (
                <div key={block.id} className={clsx(commonClasses, "p-2 border border-purple-900/30 my-1 min-h-[50px] bg-purple-900/5 grid grid-cols-12")} style={blockStyle} onClick={handleClick}>
                    <div className="absolute top-0 right-0 text-xs text-purple-500 px-1 opacity-0 group-hover:opacity-100 pointer-events-none">Row (Grid)</div>
                    {deleteButton}
                    {block.children?.map(renderBlock)}
                    {isSelected && (
                        <div className="absolute bottom-0 right-0 flex gap-1 opacity-50 hover:opacity-100 z-20">
                            <button onClick={(e) => { e.stopPropagation(); addBlock('column', block.id); }} className="text-xs bg-purple-600 px-2 py-1 rounded text-white hover:bg-purple-700">+ Col</button>
                        </div>
                    )}
                </div>
            );
        }

        if (block.type === 'column') {
            return (
                <div key={block.id} className={clsx(commonClasses, "p-2 border border-green-900/30 my-1 min-h-[50px] bg-green-900/5")} style={blockStyle} onClick={handleClick}>
                    <div className="absolute top-0 right-0 text-xs text-green-500 px-1 opacity-0 group-hover:opacity-100 pointer-events-none">Col {block.style?.gridColumnSpan ? `(${block.style.gridColumnSpan})` : ''}</div>
                    {deleteButton}
                    {block.children?.map(renderBlock)}
                    {isSelected && (
                        <div className="flex justify-center mt-2 gap-2 opacity-50 hover:opacity-100">
                            <button onClick={(e) => { e.stopPropagation(); addBlock('container', block.id); }} className="text-xs bg-blue-600 px-2 py-1 rounded text-white hover:bg-blue-700">+ Cont</button>
                            <button onClick={(e) => { e.stopPropagation(); addBlock('paragraph', block.id); }} className="text-xs bg-gray-700 px-2 py-1 rounded text-white hover:bg-gray-600">+ Para</button>
                        </div>
                    )}
                </div>
            );
        }

        if (block.type === 'image') {
            return (
                <div key={block.id} className={clsx(commonClasses, "inline-block")} onClick={handleClick} style={blockStyle}>
                    {deleteButton}
                    <img src={block.src} alt="User content" className="max-w-full h-auto" />
                </div>
            );
        }

        if (block.type === 'list') {
            return (
                <div key={block.id} className={clsx(commonClasses, "relative")} onClick={handleClick} style={blockStyle}>
                    {deleteButton}
                    <ul className="list-disc list-inside">
                        {block.items?.map((item, idx) => <li key={idx}>{item}</li>)}
                    </ul>
                </div>
            );
        }

        // Text based blocks
        const Tag = block.type === 'heading' ? 'h2' : block.type === 'link' ? 'a' : 'p';
        return (
            <div key={block.id} className={clsx(commonClasses, "relative")} onClick={handleClick} style={blockStyle}>
                {deleteButton}
                <Tag className={clsx(block.type === 'heading' ? "text-2xl font-bold" : block.type === 'link' ? "text-blue-400 underline" : "")}>
                    {block.content}
                </Tag>
            </div>
        );
    };

    return (
        <div className="h-full flex bg-gray-950 text-white" onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                onSave();
            }
        }}>

            {/* Left Toolbar */}
            <div className="w-16 border-r border-gray-800 flex flex-col items-center py-4 gap-4 bg-gray-900">
                <div className="text-xs text-gray-500 font-bold mb-2">ADD</div>
                <button onClick={() => addBlock('section')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Section">
                    <Layout size={20} />
                </button>
                <button onClick={() => addBlock('container')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Container">
                    <Box size={20} />
                </button>
                <button onClick={() => addBlock('row')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Row (Grid)">
                    <LayoutGrid size={20} />
                </button>
                <button onClick={() => addBlock('column')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Column">
                    <Columns size={20} />
                </button>
                <div className="w-8 h-px bg-gray-700 my-1"></div>
                <button onClick={() => addBlock('heading')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Heading">
                    <Type size={20} />
                </button>
                <button onClick={() => addBlock('paragraph')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Paragraph">
                    <div className="font-serif font-bold text-lg">P</div>
                </button>
                <button onClick={() => addBlock('image')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Image">
                    <ImageIcon size={20} />
                </button>
                <button onClick={() => addBlock('link')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add Link">
                    <LinkIcon size={20} />
                </button>
                <button onClick={() => addBlock('list')} className="p-2 bg-gray-800 hover:bg-gray-700 rounded text-gray-300 hover:text-white transition-colors" title="Add List">
                    <List size={20} />
                </button>

                <div className="mt-auto flex flex-col gap-4">
                    <button onClick={() => setShowImportModal(true)} className="p-2 bg-blue-900/30 hover:bg-blue-800 rounded text-blue-300 hover:text-white transition-colors" title="Import Text Structure">
                        <Upload size={20} />
                    </button>
                    <button onClick={handleExportDeploy} className="p-2 bg-green-900/30 hover:bg-green-800 rounded text-green-300 hover:text-white transition-colors" title="Export Deployment HTML">
                        <Download size={20} />
                    </button>
                </div>
            </div>

            {/* Center Canvas */}
            <div className="flex-1 overflow-y-auto bg-gray-950 p-8" onClick={() => setSelectedBlockId(null)}>
                <div className="max-w-4xl mx-auto bg-black min-h-[800px] shadow-2xl p-8 rounded-lg border border-gray-800" onClick={(e) => e.stopPropagation()}>
                    {blocks.length === 0 ? (
                        <div className="text-center text-gray-600 mt-20">
                            <p className="mb-4">Click items in the toolbar or Import to start</p>
                            <Plus size={48} className="mx-auto opacity-20" />
                        </div>
                    ) : (
                        blocks.map(renderBlock)
                    )}
                </div>
            </div>

            {/* Right Properties Panel */}
            <div className="w-80 border-l border-gray-800 bg-gray-900 overflow-y-auto">
                {renderPropertiesPanel()}
            </div>

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 w-[600px] shadow-2xl">
                        <h3 className="text-xl font-bold mb-4 flex items-center"><FileCode className="mr-2" /> Import Document Structure</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            Paste your text document below. The parser will automatically generate the structure:
                            <br />- <b># Heading 1</b>: New Section
                            <br />- <b>## Heading 2</b>: New Container (Vertical)
                            <br />- <b>### Heading 3</b>: New Grid Row/Column
                        </p>
                        <textarea
                            value={importText}
                            onChange={(e) => setImportText(e.target.value)}
                            className="w-full h-64 bg-gray-950 border border-gray-800 rounded p-4 font-mono text-sm mb-4 focus:border-blue-500 outline-none"
                            placeholder="# My Section&#10;## My Container&#10;### My Grid Column&#10;Content here..."
                        />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowImportModal(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                            <button onClick={handleImport} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">Import & Build</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
