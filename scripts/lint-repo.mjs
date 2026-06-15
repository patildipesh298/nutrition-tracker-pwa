#!/usr/bin/env node
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const ignoredDirs = new Set(['.git', '.next', 'node_modules', 'out', 'dist', 'coverage']);
const sourceExts = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.sql']);
const errors = [];

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) walk(join(dir, entry.name));
      continue;
    }
    const file = join(dir, entry.name);
    const ext = entry.name.includes('.') ? entry.name.slice(entry.name.lastIndexOf('.')) : '';
    if (sourceExts.has(ext) || entry.name === 'AGENTS.md') checkFile(file);
  }
}

function checkFile(file) {
  const rel = relative(root, file).replaceAll('\\', '/');
  const text = readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const lineNo = index + 1;

    if (!rel.endsWith('.md') && !rel.startsWith('scripts/') && /NEXT_PUBLIC_.*(SERVICE|SECRET|PRIVATE|TOKEN|PASSWORD|KEY)/i.test(line) && !/NEXT_PUBLIC_(APP|SITE|SUPABASE_ANON|SUPABASE_URL|PUBLIC)/i.test(line)) {
      errors.push(`${rel}:${lineNo} looks like a private secret may be exposed through NEXT_PUBLIC_*`);
    }

    if (/SUPABASE_SERVICE_ROLE_KEY/.test(line) && !isAllowedServiceRoleFile(rel)) {
      errors.push(`${rel}:${lineNo} references SUPABASE_SERVICE_ROLE_KEY outside approved server/documentation paths`);
    }

    if (/try\s*{\s*(import|require)\b/.test(line)) {
      errors.push(`${rel}:${lineNo} wraps an import/require in try/catch, which is disallowed`);
    }

    if (/next lint \|\| echo/.test(line)) {
      errors.push(`${rel}:${lineNo} masks lint failures with a fallback echo`);
    }
  });

  if (rel.endsWith('.ts') || rel.endsWith('.tsx')) {
    const clientFile = text.startsWith("'use client'") || text.startsWith('"use client"');
    if (clientFile && /process\.env\.(?!NEXT_PUBLIC_)/.test(text)) {
      errors.push(`${rel}: client component references non-public process.env value`);
    }
  }
}

function isAllowedServiceRoleFile(rel) {
  return (
    rel === 'lib/supabaseAdmin.ts' ||
    rel.startsWith('app/api/') ||
    rel.startsWith('docs/') ||
    rel.endsWith('.md') ||
    rel.startsWith('scripts/') ||
    rel === 'AGENTS.md' ||
    rel === '.env.example'
  );
}

walk(root);

if (errors.length) {
  console.error('Repository lint failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('Repository lint passed.');
