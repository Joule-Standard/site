// The document divides into parts marked by standalone italic paragraphs
// ("*Abstract*", "*Part I — Why*", "*Appendix A*") with a "---" thematic
// break on either side. This drops the (purely structural, never meant to
// render) thematic breaks, turns each marker into a .part-mark eyebrow, and
// wraps everything up to the next marker (or the end of the doc) in
// <section class="part">. Content before the first marker (the document's
// own title/masthead) is left alone.
function flattenText(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(flattenText).join('');
  return '';
}

function matchPartMark(node) {
  if (node?.type !== 'paragraph' || node.children.length !== 1) return null;
  // Already claimed by remarkMasthead (the standfirst paragraph has the same
  // single-emphasis-child shape as a "*Part label*" marker).
  if (node.data?._masthead) return null;
  const [only] = node.children;
  if (only.type !== 'emphasis') return null;
  return flattenText(only).trim();
}

export function remarkParts() {
  return (tree) => {
    const withoutBreaks = tree.children.filter((node) => node.type !== 'thematicBreak');

    const next = [];
    let current = null;

    for (const node of withoutBreaks) {
      const label = matchPartMark(node);
      if (label) {
        if (current) next.push(current);
        current = {
          type: 'paragraph',
          data: { hName: 'section', hProperties: { className: ['part'] } },
          children: [
            {
              type: 'paragraph',
              data: { hName: 'div', hProperties: { className: ['part-mark'] } },
              children: [{ type: 'text', value: label }],
            },
          ],
        };
        continue;
      }

      if (current) {
        current.children.push(node);
      } else {
        next.push(node);
      }
    }
    if (current) next.push(current);

    tree.children = next;
  };
}
