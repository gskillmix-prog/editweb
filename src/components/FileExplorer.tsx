import React, { useState } from 'react';
import { FolderOpen, File as FileIcon, Folder as FolderIcon, ChevronRight, ChevronDown } from 'lucide-react';
import { FileNode, FileSystemDirectoryHandle } from '../types';
import { clsx } from 'clsx';

interface FileExplorerProps {
    onFileSelect: (file: FileNode) => void;
    onFilesLoaded?: (root: FileNode) => void;
    selectedFileId?: string;
}

export function FileExplorer({ onFileSelect, onFilesLoaded, selectedFileId }: FileExplorerProps) {
    const [root, setRoot] = useState<FileNode | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const handleOpenDirectory = async () => {
        try {
            const dirHandle = await (window as any).showDirectoryPicker();
            const rootNode = await readDirectory(dirHandle, '');
            setRoot(rootNode);
            setExpandedFolders(new Set([rootNode.id]));
            onFilesLoaded?.(rootNode);
        } catch (err) {
            console.error('Error opening directory:', err);
        }
    };

    const readDirectory = async (dirHandle: FileSystemDirectoryHandle, path: string): Promise<FileNode> => {
        const children: FileNode[] = [];
        const currentPath = path ? `${path}/${dirHandle.name}` : dirHandle.name;

        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                if (entry.name.endsWith('.md') || entry.name.endsWith('.html') || entry.name.endsWith('.txt')) {
                    children.push({
                        id: `${currentPath}/${entry.name}`,
                        name: entry.name,
                        kind: 'file',
                        handle: entry,
                        path: `${currentPath}/${entry.name}`,
                    });
                }
            } else if (entry.kind === 'directory') {
                const childNode = await readDirectory(entry as FileSystemDirectoryHandle, currentPath);
                children.push(childNode);
            }
        }

        // Sort: Directories first, then files
        children.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
        });

        return {
            id: currentPath,
            name: dirHandle.name,
            kind: 'directory',
            handle: dirHandle,
            children,
            path: currentPath,
        };
    };

    const toggleFolder = (folderId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newExpanded = new Set(expandedFolders);
        if (newExpanded.has(folderId)) {
            newExpanded.delete(folderId);
        } else {
            newExpanded.add(folderId);
        }
        setExpandedFolders(newExpanded);
    };

    const renderNode = (node: FileNode, depth: number = 0) => {
        const isExpanded = expandedFolders.has(node.id);
        const isSelected = node.id === selectedFileId;

        return (
            <div key={node.id}>
                <div
                    className={clsx(
                        'flex items-center py-1 px-2 cursor-pointer hover:bg-gray-800 transition-colors text-sm',
                        isSelected && 'bg-blue-900 text-blue-100',
                        depth > 0 && 'ml-4'
                    )}
                    onClick={() => node.kind === 'file' ? onFileSelect(node) : toggleFolder(node.id, {} as any)}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                >
                    {node.kind === 'directory' && (
                        <span
                            className="mr-1 p-0.5 hover:bg-gray-700 rounded"
                            onClick={(e) => toggleFolder(node.id, e)}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    )}
                    {node.kind === 'directory' ? (
                        <FolderIcon size={16} className="mr-2 text-yellow-500" />
                    ) : (
                        <FileIcon size={16} className="mr-2 text-blue-400" />
                    )}
                    <span className="truncate">{node.name}</span>
                </div>
                {node.kind === 'directory' && isExpanded && node.children && (
                    <div>
                        {node.children.map(child => renderNode(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-gray-950 border-r border-gray-800 w-64">
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <h2 className="font-semibold text-gray-200">Files</h2>
                <button
                    onClick={handleOpenDirectory}
                    className="p-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white transition-colors"
                    title="Open Folder"
                >
                    <FolderOpen size={18} />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
                {root ? (
                    renderNode(root)
                ) : (
                    <div className="text-center text-gray-500 mt-10 text-sm px-4">
                        Click the folder icon to open a directory
                    </div>
                )}
            </div>
        </div>
    );
}
