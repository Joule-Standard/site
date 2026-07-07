import { visit } from 'unist-util-visit';

// Turns "> 🔹 **In plain terms:** ..." and "> 📜 **Lineage:** ..." blockquotes
// (the convention used in the spec/manifesto source) into <div class="plain">
// / <div class="lineage"> blocks with a leading tag, matching the design.
const MARKERS = [
  { emoji: '🔹', label: 'In plain terms', className: 'plain' },
  { emoji: '📜', label: 'Lineage', className: 'lineage' },
];

function flattenText(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(flattenText).join('');
  return '';
}

export function remarkCallouts() {
  return (tree) => {
    visit(tree, 'blockquote', (node) => {
      const firstParagraph = node.children.find((c) => c.type === 'paragraph');
      if (!firstParagraph) return;

      const text = flattenText(firstParagraph);
      const marker = MARKERS.find((m) => text.trimStart().startsWith(m.emoji));
      if (!marker) return;

      const children = firstParagraph.children;
      // Expected shape: [text("🔹 "), strong("In plain terms:"), text(" rest...")]
      const strongIndex = children.findIndex((c) => c.type === 'strong');
      if (strongIndex === -1) return;

      const rest = children.slice(strongIndex + 1);
      if (rest.length && rest[0].type === 'text') {
        rest[0] = { ...rest[0], value: rest[0].value.replace(/^[:\s]+/, '') };
      }
      firstParagraph.children = rest;

      const tagNode = {
        type: 'paragraph',
        data: { hName: 'div', hProperties: { className: ['tag'] } },
        children: [{ type: 'text', value: marker.label }],
      };

      node.children = [tagNode, ...node.children];
      node.data = { hName: 'div', hProperties: { className: [marker.className] } };
    });
  };
}
