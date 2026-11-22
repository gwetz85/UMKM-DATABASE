const fs = require('fs');
const path = require('path');

// Extract build environment variables provided by Cloudflare CI runner
// and persist them into .env.production so OpenNext embeds them into next-env.mjs
const envKeys = [
  'TELEGRAM_BOT_TOKEN',
  'GEMINI_API_KEY',
  'GOOGLE_GENAI_API_KEY',
  'GOOGLE_API_KEY',
  'FIREBASE_CLIENT_EMAIL',
  'FIREBASE_PRIVATE_KEY',
  'FIREBASE_PROJECT_ID'
];

let injectedContent = '';

for (const key of envKeys) {
  if (process.env[key]) {
    injectedContent += `${key}=${process.env[key]}\n`;
  }
}

// Also include any extra custom TELEGRAM_ or GEMINI_ variables
for (const key of Object.keys(process.env)) {
  if ((key.startsWith('TELEGRAM_') || key.startsWith('GEMINI_')) && !envKeys.includes(key)) {
    injectedContent += `${key}=${process.env[key]}\n`;
  }
}

if (injectedContent) {
  const envPath = path.resolve(process.cwd(), '.env.production');
  fs.appendFileSync(envPath, injectedContent, 'utf8');
  console.log('[prepare-cloudflare] Successfully bridged Cloudflare build variables into .env.production');
} else {
  console.log('[prepare-cloudflare] No matching build environment variables found in runner.');
}
