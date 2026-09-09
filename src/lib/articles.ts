import { getCollection, type CollectionEntry } from 'astro:content';
import { articleOrder } from '../data/article-order';
import type { Locale } from './i18n';

export type ArticleEntry = CollectionEntry<'articles'>;

export function getArticleId(entry: ArticleEntry) {
  return entry.id.split('/').pop()?.replace(/\.md$/, '') ?? entry.id;
}

function getEntryLocale(entry: ArticleEntry): Locale | null {
  const locale = entry.id.split('/')[0];
  return locale === 'ru' || locale === 'en' ? locale : null;
}

export async function getOrderedArticles(locale: Locale) {
  const entries = await getCollection('articles');
  const russianIds = new Set(
    entries.filter((entry) => getEntryLocale(entry) === 'ru').map(getArticleId),
  );
  const missingSources = articleOrder.filter((id) => !russianIds.has(id));

  if (missingSources.length) {
    throw new Error(`Unknown article IDs in articleOrder: ${missingSources.join(', ')}`);
  }

  const localizedEntries = new Map(
    entries
      .filter((entry) => getEntryLocale(entry) === locale)
      .map((entry) => [getArticleId(entry), entry]),
  );

  return articleOrder
    .map((id) => localizedEntries.get(id))
    .filter((entry): entry is ArticleEntry => Boolean(entry));
}

export async function getArticleIds(locale: Locale) {
  const entries = await getCollection('articles');
  return new Set(
    entries.filter((entry) => getEntryLocale(entry) === locale).map(getArticleId),
  );
}

export function createExcerpt(markdown: string, limit = 200) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .split('\n')
    .filter((line) => !/^\s*#{1,6}\s+/.test(line))
    .join('\n')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~`>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > limit ? `${text.slice(0, limit).trimEnd()}...` : text;
}

export function formatArticleDate(date: Date, locale: Locale) {
  return new Intl.DateTimeFormat(locale === 'ru' ? 'ru-RU' : 'en-GB').format(date);
}

export function getReadingTime(markdown: string, wordsPerMinute = 200) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_~>`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const words = text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return Math.max(1, Math.ceil(words / wordsPerMinute));
}

export function formatReadingTime(minutes: number, locale: Locale) {
  return locale === 'ru' ? `${minutes} мин чтения` : `${minutes} min read`;
}
