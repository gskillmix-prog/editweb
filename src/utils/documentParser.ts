import { Block } from '../components/HtmlBuilder';

export function parseDocumentToBlocks(text: string): Block[] {
    const lines = text.split('\n');
    const blocks: Block[] = [];

    let currentSection: Block | null = null;
    let currentContainer: Block | null = null;
    let currentRow: Block | null = null; // For H3 grid system

    // Helper to create a new block
    const createBlock = (type: Block['type'], content?: string): Block => ({
        id: Math.random().toString(36).substr(2, 9),
        type,
        content,
        children: [],
        style: { padding: '10px' }
    });

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('# ')) {
            // H1 -> New Section
            const content = trimmed.substring(2).trim();
            currentSection = createBlock('section');
            // Add heading to section
            const heading = createBlock('heading', content);
            currentSection.children?.push(heading);

            blocks.push(currentSection);
            currentContainer = null;
            currentRow = null;
        } else if (trimmed.startsWith('## ')) {
            // H2 -> New Container (Vertical Stack) inside current Section
            const content = trimmed.substring(3).trim();

            if (!currentSection) {
                // Create implicit section if none exists
                currentSection = createBlock('section');
                blocks.push(currentSection);
            }

            currentContainer = createBlock('container');
            // Add heading to container
            const heading = createBlock('heading', content);
            // Adjust heading style for H2
            heading.style = { ...heading.style, fontSize: '1.5rem' };

            currentContainer.children?.push(heading);
            currentSection.children?.push(currentContainer);
            currentRow = null;
        } else if (trimmed.startsWith('### ')) {
            // H3 -> New Grid Row (Horizontal) inside current Container
            const content = trimmed.substring(4).trim();

            if (!currentSection) {
                currentSection = createBlock('section');
                blocks.push(currentSection);
            }
            if (!currentContainer) {
                currentContainer = createBlock('container');
                currentSection.children?.push(currentContainer);
            }

            // Create a Row if we aren't in one or if we want a new logical grouping
            // For simplicity, let's say H3 starts a new Row and adds a Column with that heading
            // Or maybe H3 IS the column title?
            // Requirement: "H3: Creates a Grid Row/Column structure"
            // Let's interpret: H3 starts a new Row. Subsequent content goes into columns? 
            // Or maybe H3 defines a Column in the current Row?
            // Let's try: If we are not in a row, create one. Then add a column.

            if (!currentRow) {
                currentRow = createBlock('row');
                currentContainer.children?.push(currentRow);
            }

            // Create a column for this H3
            const column = createBlock('column');
            const heading = createBlock('heading', content);
            heading.style = { ...heading.style, fontSize: '1.25rem' };

            column.children?.push(heading);
            currentRow.children?.push(column);

            // Future content should go into this column until next H3 or higher
            // We need a way to track "current insertion point". 
            // For this simple parser, let's attach content to the last created container/column.
        } else {
            // Paragraph / Content
            const p = createBlock('paragraph', trimmed);

            // Determine where to attach
            if (currentRow && currentRow.children && currentRow.children.length > 0) {
                // Attach to last column of current row
                const lastCol = currentRow.children[currentRow.children.length - 1];
                lastCol.children?.push(p);
            } else if (currentContainer) {
                currentContainer.children?.push(p);
            } else if (currentSection) {
                currentSection.children?.push(p);
            } else {
                // No hierarchy, create implicit section/container or just add to root?
                // Let's add to root for safety, but ideally wrapped.
                // For now, add to root blocks list if no section, or create implicit section.
                if (blocks.length === 0 || blocks[blocks.length - 1].type !== 'section') {
                    const s = createBlock('section');
                    blocks.push(s);
                    currentSection = s;
                }
                currentSection?.children?.push(p);
            }
        }
    });

    return blocks;
}
