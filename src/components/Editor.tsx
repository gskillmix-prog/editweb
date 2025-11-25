import { useRef, useEffect } from 'react';
import '@toast-ui/editor/dist/toastui-editor.css';
import '@toast-ui/editor/dist/theme/toastui-editor-dark.css';
import { Editor as ToastEditor } from '@toast-ui/react-editor';

interface EditorProps {
    initialValue: string;
    onChange: (value: string) => void;
    onSave: () => void;
}

export function Editor({ initialValue, onChange, onSave }: EditorProps) {
    const editorRef = useRef<ToastEditor>(null);

    useEffect(() => {
        if (editorRef.current) {
            const instance = editorRef.current.getInstance();
            instance.setMarkdown(initialValue);
        }
    }, [initialValue]);

    const handleChange = () => {
        if (editorRef.current) {
            const instance = editorRef.current.getInstance();
            onChange(instance.getMarkdown());
        }
    };

    return (
        <div
            className="h-full [&_.toastui-editor-defaultUI]:border-0 [&_.toastui-editor-defaultUI]:bg-transparent"
            onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                    e.preventDefault();
                    onSave();
                }
            }}
        >
            <ToastEditor
                ref={editorRef}
                initialValue={initialValue}
                previewStyle="vertical"
                height="100%"
                initialEditType="wysiwyg"
                useCommandShortcut={true}
                theme="dark"
                onChange={handleChange}
                toolbarItems={[
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task', 'indent', 'outdent'],
                    ['table', 'image', 'link'],
                    ['code', 'codeblock'],
                    ['scrollSync'],
                ]}
            />
        </div>
    );
}
