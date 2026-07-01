import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import MarkdownPreview from '@uiw/react-markdown-preview';
import { useState } from 'react';
import './index.less';

const KanbanBoard = () => {
  const [value, setValue] = useState('');

  return (
    <div className="kanban-board">
      <CodeMirror
        className="code-editor"
        value={value}
        onChange={setValue}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
        ]}
        height="100%"
      />
      <MarkdownPreview
        source={value}
        className="markdown-preview"
        rehypeRewrite={(node: any, _: number, parent: any) => {
          if (
            node.tagName === 'a' &&
            parent &&
            /^h(1|2|3|4|5|6)/.test(parent.tagName)
          ) {
            parent.children = parent.children.slice(1);
          }
        }}
      />
    </div>
  );
};

export default KanbanBoard;
