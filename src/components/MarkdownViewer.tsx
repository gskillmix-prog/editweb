import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownViewerProps {
    content: string;
}

export function MarkdownViewer({ content }: MarkdownViewerProps) {
    return (
        <div className="prose prose-invert max-w-none p-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {content}
            </ReactMarkdown>
        </div>
    );
}
