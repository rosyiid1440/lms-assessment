import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code, Heading1, Heading2, Table as TableIcon } from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('URL Image:');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const addLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);
    
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  const MenuBar = () => {
    return (
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-300 bg-gray-50 rounded-t-md">
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><Heading1 size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><Heading2 size={16} /></button>
        <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded ${editor.isActive('bold') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><Bold size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded ${editor.isActive('italic') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><Italic size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded ${editor.isActive('underline') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><UnderlineIcon size={16} /></button>
        <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded ${editor.isActive('bulletList') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><List size={16} /></button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded ${editor.isActive('orderedList') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><ListOrdered size={16} /></button>
        <div className="w-px h-6 bg-gray-300 mx-1 self-center"></div>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={`p-1.5 rounded ${editor.isActive('codeBlock') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><Code size={16} /></button>
        <button type="button" onClick={addLink} className={`p-1.5 rounded ${editor.isActive('link') ? 'bg-gray-200' : 'hover:bg-gray-200'}`}><LinkIcon size={16} /></button>
        <button type="button" onClick={addImage} className="p-1.5 rounded hover:bg-gray-200"><ImageIcon size={16} /></button>
        <button type="button" onClick={addTable} className="p-1.5 rounded hover:bg-gray-200"><TableIcon size={16} /></button>
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded-md overflow-hidden bg-white focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500">
      <MenuBar />
      <EditorContent 
        editor={editor} 
        className="p-3 min-h-[150px] max-h-[400px] overflow-y-auto prose max-w-none text-sm" 
      />
    </div>
  );
};
