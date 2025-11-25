
import { FileNode, FileSystemFileHandle } from '../types';

export interface GraphNode {
    id: string;
    name: string;
    val: number; // Size/importance
}

export interface GraphLink {
    source: string;
    target: string;
}

export interface GraphData {
    nodes: GraphNode[];
    links: GraphLink[];
}

// Regex for [[wiki-style links]]
const WIKI_LINK_REGEX = /\[\[(.*?)\]\]/g;
// Regex for [standard links](url)
const MD_LINK_REGEX = /\[(.*?)\]\((.*?)\)/g;

export async function buildGraphData(files: FileNode[]): Promise<GraphData> {
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];
    const fileMap = new Map<string, string>(); // Name -> ID (path)

    // First pass: Create nodes and map names to IDs
    // We need to traverse recursively if files is a tree, but here we assume flattened list or we traverse
    // The FileExplorer returns a tree. We need to flatten it or traverse it.

    const traverse = (node: FileNode) => {
        if (node.kind === 'file') {
            nodes.push({
                id: node.id,
                name: node.name,
                val: 1,
            });
            // Store mapping from filename (without extension) to ID
            // This is a simplification; duplicates might exist.
            const nameNoExt = node.name.replace(/\.md$/i, '');
            fileMap.set(nameNoExt, node.id);
            fileMap.set(node.name, node.id); // Also map full name
        } else if (node.children) {
            node.children.forEach(traverse);
        }
    };

    files.forEach(traverse);

    // Second pass: Parse content and find links
    // Note: Reading ALL files might be slow. We should probably do this on demand or show a "Generate Graph" button.
    // For now, let's assume the user wants to see the graph of the loaded folder.
    // We will read files one by one.

    const processNode = async (node: FileNode) => {
        if (node.kind === 'file') {
            try {
                const fileHandle = node.handle as FileSystemFileHandle;
                const file = await fileHandle.getFile();
                const text = await file.text();

                // Find Wiki Links
                let match;
                while ((match = WIKI_LINK_REGEX.exec(text)) !== null) {
                    const targetName = match[1];
                    const targetId = fileMap.get(targetName);
                    if (targetId) {
                        links.push({ source: node.id, target: targetId });
                    }
                }

                // Find Standard Links
                while ((match = MD_LINK_REGEX.exec(text)) !== null) {
                    const targetPath = match[2];
                    // This is harder because it might be a relative path.
                    // For now, let's check if the target filename exists in our map.
                    // We extract the filename from the path.
                    const targetName = targetPath.split('/').pop()?.replace(/\.md$/i, '') || '';
                    const targetId = fileMap.get(targetName);
                    if (targetId && targetId !== node.id) {
                        links.push({ source: node.id, target: targetId });
                    }
                }
            } catch (err) {
                console.error(`Error reading file ${node.name}:`, err);
            }
        } else if (node.children) {
            for (const child of node.children) {
                await processNode(child);
            }
        }
    };

    for (const file of files) {
        await processNode(file);
    }

    return { nodes, links };
}
