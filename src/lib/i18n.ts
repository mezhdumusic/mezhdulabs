export const locales = ['ru', 'en'] as const;

export type Locale = (typeof locales)[number];

export const ui = {
  ru: {
    siteTitle: 'Mezhduly Labs',
    brandHome: 'На главную Mezhduly Labs',
    nav: {
      articles: 'СТАТЬИ',
      video: 'ВИДЕО',
      music: 'МУЗЫКА',
      primary: 'Основная навигация',
    },
    content: 'Контент',
    readMore: 'ЧИТАТЬ ДАЛЕЕ',
    breadcrumbs: 'Навигация по статье',
    share: 'Поделиться ссылкой',
    linkCopied: 'Ссылка скопирована',
    copyFailed: 'Не удалось скопировать ссылку',
    tableOfContents: 'Содержание статьи',
    videoFrameTitle: 'Видео из коллекции Mezhduly Labs.',
    openNavigation: 'Открыть навигацию',
    closeNavigation: 'Закрыть навигацию',
    language: 'Язык',
    switchLanguageTo: {
      ru: 'Переключить язык на русский',
      en: 'Переключить язык на английский',
    },
    theme: {
      switchToDark: 'Переключить на тёмную тему',
      switchToLight: 'Переключить на светлую тему',
    },
  },
  en: {
    siteTitle: 'Mezhduly Labs',
    brandHome: 'Mezhduly Labs home',
    nav: {
      articles: 'ARTICLES',
      video: 'VIDEO',
      music: 'MUSIC',
      primary: 'Primary navigation',
    },
    content: 'Content',
    readMore: 'READ MORE',
    breadcrumbs: 'Article navigation',
    share: 'Share link',
    linkCopied: 'Link copied',
    copyFailed: 'Could not copy link',
    tableOfContents: 'Table of contents',
    videoFrameTitle: 'Video from the Mezhduly Labs collection.',
    openNavigation: 'Open navigation',
    closeNavigation: 'Close navigation',
    language: 'Language',
    switchLanguageTo: {
      ru: 'Switch language to Russian',
      en: 'Switch language to English',
    },
    theme: {
      switchToDark: 'Switch to dark theme',
      switchToLight: 'Switch to light theme',
    },
  },
} as const satisfies Record<Locale, unknown>;

function getBase() {
  return import.meta.env.BASE_URL.replace(/\/+$/, '');
}

// Joins a root-relative path (e.g. "/logo.png") onto the deployment
// base path, regardless of whether BASE_URL has a trailing slash.
export function withBase(path: string) {
  const suffix = path.replace(/^\/+/, '');
  return `${getBase()}/${suffix}`;
}

// Strips the deployment base path (e.g. "/mezhdulabs") from an absolute
// pathname so the rest of the i18n logic can work with root-relative paths.
function stripBase(pathname: string) {
  const base = getBase();
  if (base && pathname.startsWith(base)) {
    const rest = pathname.slice(base.length);
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return pathname;
}

export function localizePath(locale: Locale, path = '') {
  const suffix = path.replace(/^\/+|\/+$/g, '');
  return withBase(suffix ? `${locale}/${suffix}` : locale);
}

export function articlePath(locale: Locale, id: string) {
  return localizePath(locale, `articles/${encodeURIComponent(id)}`);
}

export function getLocaleFromPath(pathname: string): Locale {
  const segment = stripBase(pathname).split('/').filter(Boolean)[0];
  return segment === 'ru' ? 'ru' : 'en';
}

export function getLocaleSwitchPath(
  pathname: string,
  currentLocale: Locale,
  nextLocale: Locale,
  // Article slugs differ per locale, so switching languages on an article
  // page requires mapping the current slug to the shared article ID, then
  // back to the equivalent slug in the target locale.
  articleSlugs: {
    currentIdBySlug: ReadonlyMap<string, string>;
    nextSlugById: ReadonlyMap<string, string>;
  },
) {
  const normalizedPath = stripBase(pathname).replace(/\/+$/, '') || '/';
  const currentPrefix = `/${currentLocale}`;
  const currentSuffix = normalizedPath === currentPrefix
    ? ''
    : normalizedPath.startsWith(`${currentPrefix}/`)
      ? normalizedPath.slice(currentPrefix.length)
      : '';
  const articleMatch = currentSuffix.match(/^\/articles\/(.+)$/);

  if (articleMatch) {
    const currentSlug = decodeURIComponent(articleMatch[1]);
    const articleId = articleSlugs.currentIdBySlug.get(currentSlug);
    const nextSlug = articleId ? articleSlugs.nextSlugById.get(articleId) : undefined;
    return nextSlug ? localizePath(nextLocale, `articles/${nextSlug}`) : localizePath(nextLocale, 'articles');
  }

  return localizePath(nextLocale, currentSuffix);
}
