'use client';

import { EditorContent, useEditor } from '@tiptap/react';
import { Document } from '@tiptap/extension-document';
import { Paragraph } from '@tiptap/extension-paragraph';
import { Text } from '@tiptap/extension-text';
import { RichTextProvider } from 'reactjs-tiptap-editor';
import { Bold, RichTextBold } from 'reactjs-tiptap-editor/bold';
import { Italic, RichTextItalic } from 'reactjs-tiptap-editor/italic';
import { History, RichTextUndo, RichTextRedo } from 'reactjs-tiptap-editor/history';
import 'reactjs-tiptap-editor/style.css';

const extensions = [Document, Paragraph, Text, Bold, Italic, History];

interface TextEditorProps {
  dark?: boolean;
}

export default function TextEditor({ dark = true }: TextEditorProps) {
  const editor = useEditor({
    extensions,
    content: '<p>Select some text and try the toolbar.</p>',
    immediatelyRender: false,
  });

  if (!editor) return null;

  return (
    <div className={dark ? 'dark' : undefined}>
      <RichTextProvider editor={editor} dark={dark}>
        <div className="overflow-hidden border border-neutral-800 bg-neutral-950 text-neutral-100">
          <div
            role="toolbar"
            aria-label="Text formatting"
            className="flex flex-wrap gap-1 border-b border-neutral-800 bg-neutral-900 p-2"
          >
            <RichTextUndo />
            <RichTextRedo />
            <RichTextBold />
            <RichTextItalic />
          </div>
          <EditorContent
  editor={editor}
  className="
    text-neutral-100 caret-neutral-100
    selection:bg-blue-500/40 selection:text-white
    [&_.ProseMirror]:!p-3
    [&_.ProseMirror]:min-h-32
    [&_.ProseMirror]:outline-none
    [&_.ProseMirror_*::selection]:bg-blue-500/40
    [&_.ProseMirror_*::selection]:text-white
  "
/>
        </div>
      </RichTextProvider>
    </div>
  );
}