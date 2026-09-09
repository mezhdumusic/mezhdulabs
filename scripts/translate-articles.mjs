import { createHash } from 'node:crypto';
import { readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { GoogleGenAI } from '@google/genai';
import matter from 'gray-matter';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const russianDirectory = path.join(projectRoot, 'src', 'content', 'articles', 'ru');
const englishDirectory = path.join(projectRoot, 'src', 'content', 'articles', 'en');
const envFile = path.join(projectRoot, '.env');
const defaultModel = 'gemini-3.5-flash-lite';

function loadEnvironment() {
  if (typeof process.loadEnvFile !== 'function') return;
  try {
    process.loadEnvFile(envFile);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}

export function normalizeText(value) {
  return value.replace(/\r\n?/g, '\n');
}

export function getSourceHash(source) {
  return createHash('sha256').update(normalizeText(source)).digest('hex');
}


export function classifyTranslation({ sourceId, sourceHash, translationData, hasTranslation }) {
  if (!hasTranslation) return 'missing';
  if (translationData?.translationOf !== sourceId) return 'invalid';
  if (translationData?.sourceHash !== sourceHash) return 'stale';
  return 'ready';
}

async function listMarkdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}


async function readSource(id) {
  const filePath = path.join(russianDirectory, `${id}.md`);
  const raw = await readFile(filePath, 'utf8');
  return {
    id,
    filePath,
    raw,
    parsed: matter(raw),
    hash: getSourceHash(raw),
  };
}

async function scanTranslations() {
  const [russianFiles, englishFiles] = await Promise.all([
    listMarkdownFiles(russianDirectory),
    listMarkdownFiles(englishDirectory),
  ]);
  const russianIds = russianFiles.map((file) => file.replace(/\.md$/, ''));
  const englishIds = englishFiles.map((file) => file.replace(/\.md$/, '')); 
  const rows = [];

  for (const id of russianIds) {
    const source = await readSource(id);
    const translationPath = path.join(englishDirectory, `${id}.md`);
    const translationExists = englishIds.includes(id);
    let translation = null;
    let state = 'missing';
    let details = '';

    if (translationExists) {
      try {
        translation = matter(await readFile(translationPath, 'utf8'));
        state = classifyTranslation({
          sourceId: id,
          sourceHash: source.hash,
          translationData: translation.data,
          hasTranslation: true,
        });
        if (state === 'stale') details = 'sourceHash differs';
        if (state === 'invalid') details = 'translationOf is missing or incorrect';
      } catch (error) {
        state = 'invalid';
        details = `cannot parse translation: ${error.message}`;
      }
    }

    rows.push({ id, state, details, source, translation, translationPath });
  }

  for (const id of englishIds) {
    if (!russianIds.includes(id)) {
      rows.push({
        id,
        state: 'orphan',
        details: 'no Russian source file',
        source: null,
        translation: null,
        translationPath: path.join(englishDirectory, `${id}.md`),
      });
    }
  }

  return rows.sort((a, b) => a.id.localeCompare(b.id));
}

function printStatus(rows) {
  if (!rows.length) {
    console.log('No article files found.');
    return;
  }

  for (const row of rows) {
    const suffix = row.details ? ` — ${row.details}` : '';
    console.log(`${row.state.padEnd(8)} ${row.id}${suffix}`);
  }

  const counts = rows.reduce((result, row) => {
    result[row.state] = (result[row.state] ?? 0) + 1;
    return result;
  }, {});
  console.log(`\n${Object.entries(counts).map(([state, count]) => `${state}: ${count}`).join(' · ')}`);
}

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function buildPrompt(source) {
  return [
    'Translate this article from Russian to natural, editorial English.',
    'Return only JSON matching the requested schema.',
    'Translate the title and Markdown body, but do not add frontmatter.',
    'Preserve Markdown structure, heading levels, emphasis, lists, links, URLs, code blocks, HTML, and media embeds.',
    'Do not translate code, URLs, filenames, or identifiers.',
    '',
    `SOURCE TITLE:\n${source.parsed.data.title ?? ''}`,
    '',
    `SOURCE MARKDOWN BODY:\n${source.parsed.content.trim()}`,
  ].join('\n');
}

function validateTranslation(value) {
  if (!value || typeof value !== 'object') throw new Error('Gemini returned a non-object response');
  if (typeof value.title !== 'string' || !value.title.trim()) throw new Error('Gemini response has no title');
  if (typeof value.body !== 'string' || !value.body.trim()) throw new Error('Gemini response has no body');
  if (/^```/.test(value.body.trim()) || /^---\s*$/.test(value.body.trim())) {
    throw new Error('Gemini wrapped the Markdown in an unsupported outer block');
  }
  return { title: value.title.trim(), body: `${value.body.trim()}\n` };
}

function translationFrontmatter(source, translated, id, sourceHash) {
  return {
    ...source.parsed.data,
    title: translated.title,
    locale: 'en',
    translationOf: id,
    sourceHash,
  };
}

async function writeAtomically(filePath, content) {
  const temporaryPath = `${filePath}.${process.pid}.tmp`;
  try {
    await writeFile(temporaryPath, content, 'utf8');
    await rename(temporaryPath, filePath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => {});
    throw error;
  }
}

async function translateRow(ai, row, force) {
  const responseStream = await ai.models.generateContentStream({
    model: process.env.GEMINI_MODEL || defaultModel,
    contents: [
      {
        role: 'user',
        parts: [{ text: buildPrompt(row.source) }],
      },
    ],
    config: {
      thinkingConfig: {
        thinkingLevel: 'MINIMAL',
      },
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title', 'body'],
      },
    },
  });
  let responseText = '';
  for await (const chunk of responseStream) {
    if (chunk.text) responseText += chunk.text;
  }
  const translated = validateTranslation(JSON.parse(responseText));
  const output = matter.stringify(
    translated.body,
    translationFrontmatter(row.source, translated, row.id, row.source.hash),
  );
  await writeAtomically(row.translationPath, output);
  console.log(`${force ? 'retranslated' : 'translated'}: ${row.id}`);
  return true;
}

function isInvalidApiKeyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /API_KEY_INVALID|API key not valid|invalid api key/i.test(message);
}

function printHelp() {
  console.log(`Usage:
  npm run translate
  npm run translate:status
  npm run translate -- --id article-2
  npm run translate -- --id article-2 --force

Options:
  --status       report translation state without calling Gemini
  --id <id>      process only one article
  --force        retranslate only the selected article; requires --id
  --help         show this message`);
}

export async function main() {
  if (hasFlag('--help')) {
    printHelp();
    return;
  }

  loadEnvironment();
  const rows = await scanTranslations();
  const id = getArgument('--id');
  const selectedRows = id ? rows.filter((row) => row.id === id) : rows;

  if (id && !selectedRows.length) throw new Error(`Unknown article ID: ${id}`);

  if (hasFlag('--status')) {
    printStatus(selectedRows);
    return;
  }

  const force = hasFlag('--force');
  if (force && !id) {
    throw new Error('--force requires --id <article-id> so an existing translation cannot be overwritten accidentally.');
  }
  if (force && selectedRows.some((row) => !row.source)) {
    throw new Error(`Cannot translate ${id}: Russian source file is missing.`);
  }

  const targets = force
    ? selectedRows
    : selectedRows.filter((row) => row.state === 'missing');
  if (!targets.length) {
    printStatus(selectedRows);
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env or the environment before running translation.');
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  let failures = 0;
  for (const row of targets) {
    try {
      await translateRow(ai, row, force);
    } catch (error) {
      failures += 1;
      if (isInvalidApiKeyError(error)) {
        console.error('Gemini rejected GEMINI_API_KEY: the key is invalid or malformed. Replace the key in .env and try again.');
        break;
      }
      console.error(`failed: ${row.id} — ${error.message}`);
    }
  }
  if (failures) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`translation error: ${error.message}`);
    process.exitCode = 1;
  });
}
