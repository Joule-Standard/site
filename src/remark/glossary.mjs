// Each glossary entry is a single paragraph, parsed by remark as
// [strong(term), text("\n: definition\n"), emphasis("(Plainly: ...)")]
// because there are no blank lines between the term/definition/aside lines
// in the source. Converts consecutive matching paragraphs after the
// "Glossary" heading into a single <dl>.
function flattenText(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(flattenText).join('');
  return '';
}

function matchEntry(node) {
  if (node?.type !== 'paragraph' || node.children.length !== 3) return null;
  const [term, def, aside] = node.children;
  if (term.type !== 'strong' || def.type !== 'text' || aside.type !== 'emphasis') return null;
  if (!/^\s*:/.test(def.value)) return null;

  const definition = def.value.replace(/^\s*:\s*/, '').trim();
  const asideText = flattenText(aside).trim();
  const plainly = asideText.match(/^\(Plainly:\s*(.+?)\)$/s)?.[1] ?? asideText;

  return { term: flattenText(term).trim(), definition, plainly };
}

export function remarkGlossary() {
  return (tree) => {
    const { children } = tree;
    const next = [];

    for (let i = 0; i < children.length; i += 1) {
      const node = children[i];
      const isGlossaryHeading =
        node.type === 'heading' && node.depth === 2 && flattenText(node).trim() === 'Glossary';

      if (!isGlossaryHeading) {
        next.push(node);
        continue;
      }

      next.push(node);
      const dtDdChildren = [];
      let j = i + 1;
      while (j < children.length) {
        const entry = matchEntry(children[j]);
        if (!entry) break;

        dtDdChildren.push({
          type: 'paragraph',
          data: { hName: 'dt' },
          children: [{ type: 'text', value: entry.term }],
        });
        dtDdChildren.push({
          type: 'paragraph',
          data: { hName: 'dd' },
          children: [
            { type: 'text', value: `${entry.definition} ` },
            {
              type: 'paragraph',
              data: { hName: 'span', hProperties: { className: ['lay'] } },
              children: [{ type: 'text', value: `Plainly: ${entry.plainly}` }],
            },
          ],
        });
        j += 1;
      }

      if (dtDdChildren.length) {
        next.push({ type: 'paragraph', data: { hName: 'dl' }, children: dtDdChildren });
      }
      i = j - 1;
    }

    tree.children = next;
  };
}
