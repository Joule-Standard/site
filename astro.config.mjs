import { defineConfig } from 'astro/config';
import { remarkMasthead } from './src/remark/masthead.mjs';
import { remarkFigures } from './src/remark/figures.mjs';
import { remarkCallouts } from './src/remark/callouts.mjs';
import { remarkLede } from './src/remark/lede.mjs';
import { remarkFailureModes } from './src/remark/failureModes.mjs';
import { remarkGlossary } from './src/remark/glossary.mjs';
import { remarkRules } from './src/remark/rules.mjs';
import { remarkParts } from './src/remark/parts.mjs';

export default defineConfig({
  site: 'https://joulestandard.org',
  markdown: {
    // Order matters: the content-shape detectors run first, on the flat
    // root-level block list the source markdown parses into. remarkParts
    // runs last because it regroups whatever's left into <section> wrappers.
    remarkPlugins: [
      remarkMasthead,
      remarkFigures,
      remarkCallouts,
      remarkLede,
      remarkFailureModes,
      remarkGlossary,
      remarkRules,
      remarkParts,
    ],
  },
});
