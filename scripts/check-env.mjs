#!/usr/bin/env node
import { readFileSync } from 'node:fs';

const envExample = readFileSync('.env.example', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const requiredEnv = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_APP_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'OPENAI_VISION_MODEL',
  'DEEPSEEK_API_KEY',
  'USDA_API_KEY',
  'FATSECRET_CLIENT_ID',
  'FATSECRET_CLIENT_SECRET',
  'EMAIL_PROVIDER',
  'RESEND_API_KEY',
  'INVITE_FROM_EMAIL',
  'SENTRY_DSN',
];

const missing = requiredEnv.filter((name) => !new RegExp(`^${name}=`, 'm').test(envExample));
const problems = [];

if (missing.length) problems.push(`.env.example is missing: ${missing.join(', ')}`);
if (!packageJson.engines?.node) problems.push('package.json engines.node is missing');
if (!packageJson.scripts?.build) problems.push('package.json scripts.build is missing');
if (!packageJson.scripts?.typecheck) problems.push('package.json scripts.typecheck is missing');
if (!packageJson.scripts?.lint) problems.push('package.json scripts.lint is missing');

if (problems.length) {
  console.error('Environment/config check failed:');
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(1);
}

console.log('Environment/config contract passed.');
