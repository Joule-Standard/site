// The source marks each Part's opening paragraph as its "lede" implicitly —
// it's simply the paragraph that comes immediately after an h2 with nothing
// between them. Sections that go straight from h2 into an h3 (no lede) are
// left untouched.
export function remarkLede() {
  return (tree) => {
    const { children } = tree;
    for (let i = 0; i < children.length - 1; i += 1) {
      const node = children[i];
      if (node.type !== 'heading' || node.depth !== 2) continue;

      const next = children[i + 1];
      if (next?.type !== 'paragraph') continue;

      next.data = {
        ...next.data,
        hProperties: {
          ...next.data?.hProperties,
          className: [...(next.data?.hProperties?.className ?? []), 'lede'],
        },
      };
    }
  };
}
