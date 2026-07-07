// The source markdown states each figure twice: once as an image whose alt
// text is "**Figure N — Title.** Caption", and once again as a duplicate
// italic paragraph right below it (kept for renderers that drop image alt
// text). This turns the pair into a single <figure>/<figcaption>.
function splitCaption(alt) {
  const match = alt.match(/^\*\*(.+?)\*\*\s*(.*)$/s);
  if (!match) return { lead: '', rest: alt };
  return { lead: match[1], rest: match[2] };
}

export function remarkFigures() {
  return (tree) => {
    const { children } = tree;
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const node = children[i];
      if (node.type !== 'paragraph' || node.children.length !== 1) continue;
      const [image] = node.children;
      if (image.type !== 'image') continue;

      const { lead, rest } = splitCaption(image.alt ?? '');

      const figcaption = {
        type: 'paragraph',
        data: { hName: 'figcaption' },
        children: [
          { type: 'strong', children: [{ type: 'text', value: lead }] },
          { type: 'text', value: rest ? ` ${rest}` : '' },
        ],
      };

      const figure = {
        type: 'paragraph',
        data: { hName: 'figure' },
        children: [
          { ...image, alt: lead, data: { hName: 'img' } },
          figcaption,
        ],
      };

      children[i] = figure;

      // Drop the duplicate "*Figure N — ...*" paragraph immediately after,
      // if present.
      const next = children[i + 1];
      if (
        next &&
        next.type === 'paragraph' &&
        next.children[0]?.type === 'emphasis'
      ) {
        children.splice(i + 1, 1);
      }
    }
  };
}
