// Better tracker test
const ActiveWindow = require('@paymoapp/active-window').default;

console.log('=== Active Window Tracker Test ===\n');

ActiveWindow.initialize();

if (!ActiveWindow.requestPermissions()) {
  console.log('ERROR: Permissions denied');
  process.exit(1);
}

console.log('Permissions OK ✓');
console.log('Watching for 20 seconds. Switch between apps...\n');

let count = 0;
ActiveWindow.subscribe((windowInfo) => {
  count++;
  // Print only the important stuff (skip the icon base64)
  console.log(`[${count}] App: ${windowInfo.application}`);
  console.log(`     Title: ${windowInfo.title}`);
  console.log(`     PID: ${windowInfo.pid}`);
  console.log(`     Path: ${windowInfo.path}`);
  console.log('');
});

setTimeout(() => {
  console.log('=== Test Complete ===');
  console.log(`Captured ${count} window changes`);
  process.exit(0);
}, 20000);