import { visit } from 'unist-util-visit';

// The "**FM-1 — Title**" / "**AO-1 — \"Quoted title.\"**" convention has no
// blank line between its header, body, and (for FM-N only) its
// "***Counter**text*" line, so remark merges all of it into a single
// paragraph: [strong(header), ...body inline nodes, emphasis(Counter)?].
// This turns each into a .fm card.
const CODE_TITLE = /^([A-Z]{1,4}-\d+)\s*—\s*(.+)$/su;

function flattenText(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(flattenText).join('');
  return '';
}

function isCounterNode(node) {
  if (node?.type !== 'emphasis') return false;
  const [first] = node.children;
  return first?.type === 'strong' && flattenText(first).trim() === 'Counter';
}

export function remarkFailureModes() {
  return (tree) => {
    visit(tree, 'paragraph', (node) => {
      const [header, ...rest] = node.children;
      if (header?.type !== 'strong' || rest.length === 0) return;

      const match = flattenText(header).match(CODE_TITLE);
      if (!match) return;
      const [, code, title] = match;

      const bodyChildren = [...rest];
      let counterChildren = null;
      if (isCounterNode(bodyChildren[bodyChildren.length - 1])) {
        counterChildren = bodyChildren.pop().children.slice(1);
      }
      if (bodyChildren[0]?.type === 'text') {
        bodyChildren[0] = { ...bodyChildren[0], value: bodyChildren[0].value.replace(/^\s+/, '') };
      }
      const last = bodyChildren[bodyChildren.length - 1];
      if (last?.type === 'text') {
        bodyChildren[bodyChildren.length - 1] = { ...last, value: last.value.replace(/\s+$/, '') };
      }

      const cardChildren = [
        {
          type: 'paragraph',
          data: { hName: 'div', hProperties: { className: ['fm-head'] } },
          children: [
            {
              type: 'paragraph',
              data: { hName: 'span', hProperties: { className: ['fm-num'] } },
              children: [{ type: 'text', value: code }],
            },
            { type: 'paragraph', data: { hName: 'h4' }, children: [{ type: 'text', value: title }] },
          ],
        },
        { type: 'paragraph', data: { hName: 'p' }, children: bodyChildren },
      ];

      if (counterChildren) {
        cardChildren.push({
          type: 'paragraph',
          data: { hName: 'p', hProperties: { className: ['fix'] } },
          children: [
            { type: 'strong', data: { hName: 'b' }, children: [{ type: 'text', value: 'Counter' }] },
            ...counterChildren,
          ],
        });
      }

      node.data = { hName: 'div', hProperties: { className: ['fm'] } };
      node.children = cardChildren;
    });
  };
}
