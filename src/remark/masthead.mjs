// Turns the leading run of nodes every doc starts with — a title heading,
// an optional subtitle heading, an optional italic standfirst paragraph, and
// (for the spec only) a bold "Spec v0.1.0 · Status · Licence · Home" meta
// line — into the masthead markup. The animated pulse-line is only added
// when a doc-meta line was actually found, since that's the spec-shaped
// convention (the manifesto doesn't have one, or the line).
function flattenText(node) {
  if (node.type === 'text') return node.value;
  if (node.children) return node.children.map(flattenText).join('');
  return '';
}

const PULSE_LINE_HTML = `<div class="pulse-line masthead-end" aria-hidden="true">
  <svg viewBox="0 0 760 46" role="img" aria-label="A stylised electrical load curve">
    <path d="M0 34 H120 L150 34 160 10 172 40 184 22 196 34 H340 L352 34 362 8 376 42 388 20 400 34 H560 L572 34 582 12 594 38 606 24 618 34 H760" fill="none" stroke="#D98E14" stroke-width="2" class="flow"/>
    <path d="M0 34 H760" fill="none" stroke="#DCDCD2" stroke-width="1"/>
  </svg>
</div>`;

export function remarkMasthead() {
  return (tree) => {
    const { children } = tree;
    if (children[0]?.type !== 'heading' || children[0].depth !== 1) return;

    let i = 1;
    children[0].data = { ...children[0].data, _masthead: true, hProperties: { className: ['title'] } };
    let lastMastheadNode = children[0];
    let sawHeadingSubtitle = false;

    // Optional subtitle heading, e.g. "### Money you can redeem for a kilowatt-hour".
    if (children[i]?.type === 'heading') {
      children[i].data = { ...children[i].data, _masthead: true, hName: 'p', hProperties: { className: ['subtitle'] } };
      lastMastheadNode = children[i];
      sawHeadingSubtitle = true;
      i += 1;
    }

    // Optional italic standfirst paragraph, e.g. "*An open protocol for...*".
    // If there was no subtitle heading, this line carries the subtitle
    // styling instead; otherwise it's left as a plain paragraph. Either way
    // it's tagged _masthead so remarkParts doesn't mistake it for a "*Part
    // label*" marker later — both share the single-emphasis-child shape.
    const standfirst = children[i];
    if (standfirst?.type === 'paragraph' && standfirst.children.length === 1 && standfirst.children[0].type === 'emphasis') {
      standfirst.data = { ...standfirst.data, _masthead: true };
      if (!sawHeadingSubtitle) {
        standfirst.data.hProperties = { className: ['subtitle'] };
      }
      lastMastheadNode = standfirst;
      i += 1;
    }

    const metaCandidate = children[i];
    const isMeta =
      metaCandidate?.type === 'paragraph' &&
      metaCandidate.children[0]?.type === 'strong' &&
      /Licence|Status:|joulestandard\.org/i.test(flattenText(metaCandidate));

    if (isMeta) {
      metaCandidate.data = { ...metaCandidate.data, _masthead: true, hProperties: { className: ['doc-meta'] } };
      children.splice(i + 1, 0, { type: 'html', value: PULSE_LINE_HTML });
    } else {
      lastMastheadNode.data = {
        ...lastMastheadNode.data,
        hProperties: {
          ...lastMastheadNode.data?.hProperties,
          className: [...(lastMastheadNode.data?.hProperties?.className ?? []), 'masthead-end'],
        },
      };
    }
  };
}
