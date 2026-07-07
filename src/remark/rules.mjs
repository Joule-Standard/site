import { visit } from 'unist-util-visit';

// The "**C-1.** **Title.** Body text" convention (constitution rules C-1..C5,
// ordering rules O-1..O4) — each is its own paragraph:
// [strong("C-1."), text(" "), strong("Title."), ...body inline nodes].
const CODE = /^([A-Z]-\d+)\.$/;

function flattenText(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(flattenText).join('');
  return '';
}

export function remarkRules() {
  return (tree) => {
    visit(tree, 'paragraph', (node) => {
      const [codeNode, , titleNode, ...rest] = node.children;
      if (codeNode?.type !== 'strong' || titleNode?.type !== 'strong') return;

      const codeMatch = flattenText(codeNode).match(CODE);
      if (!codeMatch) return;

      if (rest[0]?.type === 'text') {
        rest[0] = { ...rest[0], value: rest[0].value.replace(/^\s+/, '') };
      }

      node.data = { hName: 'div', hProperties: { className: ['rule'] } };
      node.children = [
        {
          type: 'paragraph',
          data: { hName: 'div', hProperties: { className: ['r-num'] } },
          children: [{ type: 'text', value: codeMatch[1] }],
        },
        {
          type: 'paragraph',
          data: { hName: 'div', hProperties: { className: ['r-body'] } },
          children: [
            { ...titleNode, data: { hName: 'b' } },
            { type: 'text', value: ' ' },
            { type: 'paragraph', data: { hName: 'span' }, children: rest },
          ],
        },
      ];
    });
  };
}
