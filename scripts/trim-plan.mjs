#!/usr/bin/env node
// Structural trimmer for plan phase files. Removes ritual scaffolding while
// preserving every code block byte-for-byte.
//
// Rules:
//   1. Delete "**Files:**" header + the bullet list that follows it (until blank line).
//   2. Delete "- [ ] **Step N: Title**" lines — but only when the step title is
//      purely ceremonial (commit/typecheck/write/…). Substantive prose titles
//      are rare; we keep anything that includes a paragraph of explanation
//      by only deleting the single bullet line.
//   3. Replace a `- [ ] **Step N: Commit**` + following ```bash git commit …```
//      block with a one-liner: **Commit:** `<message>`
//   4. Delete `- [ ] **Step N: Typecheck**` + following ```bash npm run typecheck ```
//      block entirely. Insert one convention line near the top of the file.
//   5. Collapse 3+ blank lines to 2.
//
// Usage: node scripts/trim-plan.mjs <path-to-phase.md> [more...]

import { readFileSync, writeFileSync } from 'node:fs';

const CONVENTION_LINE =
  '**Per-task convention:** run `npm run typecheck` after each task, then commit with the message noted at the end of the task.';

function trim(src) {
  const lines = src.split(/\r?\n/);
  const out = [];
  let i = 0;
  let commitsExtracted = 0;
  let typechecksStripped = 0;
  let filesBlocksStripped = 0;
  let stepHeadersStripped = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Rule 1: **Files:** block — delete header + consecutive "- Create:"/"- Edit:" bullets
    if (/^\*\*Files:\*\*\s*$/.test(line)) {
      i++;
      while (i < lines.length && /^\s*-\s/.test(lines[i])) i++;
      // swallow one trailing blank
      if (i < lines.length && lines[i].trim() === '') i++;
      filesBlocksStripped++;
      continue;
    }

    // Rule 3/4: Step header → look ahead for a bash block and collapse it.
    const stepMatch = line.match(/^- \[ \] \*\*Step \d+: ([^*]+)\*\*\s*$/);
    if (stepMatch) {
      const title = stepMatch[1].trim().toLowerCase();
      // Look ahead: skip blank lines, find next ```bash … ``` block
      let j = i + 1;
      while (j < lines.length && lines[j].trim() === '') j++;
      if (j < lines.length && /^```bash\s*$/.test(lines[j])) {
        const bashStart = j + 1;
        let bashEnd = bashStart;
        while (bashEnd < lines.length && !/^```\s*$/.test(lines[bashEnd])) bashEnd++;
        const bashLines = lines.slice(bashStart, bashEnd);
        const bashText = bashLines.join('\n');
        const isCommit = /git\s+commit/.test(bashText) || /commit/i.test(title);
        const isTypecheck = /npm\s+run\s+typecheck/.test(bashText) || /typecheck/i.test(title);
        const isInstall = /typecheck/i.test(title) && /npm\s+install/.test(bashText);

        if (isCommit) {
          const msgMatch = bashText.match(/git\s+commit\s+-m\s+["'`]([^"'`]+)["'`]/);
          if (msgMatch) {
            // emit one-liner, drop the bash block and the step header
            if (out.length && out[out.length - 1].trim() !== '') out.push('');
            out.push('**Commit:** `' + msgMatch[1] + '`');
            i = bashEnd + 1;
            commitsExtracted++;
            continue;
          }
        } else if (isTypecheck) {
          // drop step header AND bash block entirely
          i = bashEnd + 1;
          typechecksStripped++;
          continue;
        }
      }
      // If the step has prose or a non-bash body, just drop the header line itself
      // and keep the rest. But only for ceremonial titles.
      const ceremonial =
        /^(typecheck|commit|write|run|verify|install|add|create|edit|scaffold|apply|generate)\b/.test(
          title,
        );
      if (ceremonial) {
        i++;
        stepHeadersStripped++;
        continue;
      }
      // substantive title — keep the line as-is
      out.push(line);
      i++;
      continue;
    }

    out.push(line);
    i++;
  }

  // Rule 5: collapse 3+ blank lines to 2
  const collapsed = [];
  let blankRun = 0;
  for (const l of out) {
    if (l.trim() === '') {
      blankRun++;
      if (blankRun <= 1) collapsed.push(l);
    } else {
      blankRun = 0;
      collapsed.push(l);
    }
  }

  // Insert convention line after the first paragraph if not already present
  let result = collapsed.join('\n');
  if (!result.includes('Per-task convention')) {
    // Find first blank line after the intro (line 1 = ## header, line 2 = blank or prose)
    const parts = result.split(/\n\n/);
    if (parts.length >= 2) {
      parts.splice(1, 0, CONVENTION_LINE);
      result = parts.join('\n\n');
    }
  }

  return {
    text: result,
    stats: {
      commitsExtracted,
      typechecksStripped,
      filesBlocksStripped,
      stepHeadersStripped,
    },
  };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/trim-plan.mjs <file> [more...]');
  process.exit(1);
}

for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const origLines = src.split(/\r?\n/).length;
  const { text, stats } = trim(src);
  const newLines = text.split(/\r?\n/).length;
  writeFileSync(f, text);
  console.log(
    `${f}: ${origLines} → ${newLines} lines  (-${origLines - newLines})  ` +
      `commits=${stats.commitsExtracted} typechecks=${stats.typechecksStripped} ` +
      `files-blocks=${stats.filesBlocksStripped} step-headers=${stats.stepHeadersStripped}`,
  );
}
