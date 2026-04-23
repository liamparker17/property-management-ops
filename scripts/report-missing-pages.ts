import { validateNav } from '../lib/nav/validate';

function main() {
  const { missing } = validateNav();

  console.log('Navigation missing-page report');
  console.log(`Missing routes: ${missing.length}`);

  if (missing.length === 0) {
    console.log('No missing nav destinations found.');
    return;
  }

  for (const entry of missing) {
    console.log(`- [${entry.sidebar}] ${entry.href}`);
  }
}

main();
