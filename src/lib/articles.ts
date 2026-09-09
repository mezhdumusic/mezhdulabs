import { getCollection, type CollectionEntry } from 'astro:content';
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

  return entries
    .filter((entry) => getEntryLocale(entry) === locale)
    .sort((a, b) => {
      const favoriteDifference = Number(Boolean(b.data.fav)) - Number(Boolean(a.data.fav));
      if (favoriteDifference !== 0) return favoriteDifference;

      const dateDifference = b.data.date.getTime() - a.data.date.getTime();
      return dateDifference || getArticleId(a).localeCompare(getArticleId(b));
    });
}

export async function getArticleIds(locale: Locale) {
  const entries = await getCollection('articles');
  return new Set(
    entries.filter((entry) => getEntryLocale(entry) === locale).map(getArticleId),
  );
}

const CYRILLIC_TRANSLITERATION: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
  и: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
  с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh',
  щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

// Builds a URL-friendly slug from arbitrary text, transliterating Cyrillic
// characters to Latin so the result stays readable and ASCII-only.
export function slugify(value: string): string {
  const transliterated = value
    .toLowerCase()
    .split('')
    .map((char) => CYRILLIC_TRANSLITERATION[char] ?? char)
    .join('');

  const slug = transliterated
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'article';
}

// Uses the explicit `slug` frontmatter field when set, otherwise derives
// one from the article title.
export function getArticleSlug(entry: ArticleEntry): string {
  const explicit = entry.data.slug?.trim();
  return slugify(explicit || entry.data.title);
}

// Maps each article's internal ID to a unique, human-readable URL slug for
// the given locale, appending a numeric suffix on collisions.
export async function getArticleSlugMap(locale: Locale): Promise<Map<string, string>> {
  const entries = await getOrderedArticles(locale);
  const usedCounts = new Map<string, number>();
  const slugById = new Map<string, string>();

  for (const entry of entries) {
    const baseSlug = getArticleSlug(entry);
    const count = usedCounts.get(baseSlug) ?? 0;
    usedCounts.set(baseSlug, count + 1);
    slugById.set(getArticleId(entry), count === 0 ? baseSlug : `${baseSlug}-${count + 1}`);
  }

  return slugById;
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
