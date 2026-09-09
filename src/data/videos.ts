import type { Locale } from '../lib/i18n';

export interface VideoCard {
  videoUrl: string;
  excerpt: string;
}

export const videosByLocale = {
  ru: [
    {
      videoUrl: 'https://www.youtube.com/embed/fI92B8IVIVs',
      excerpt: 'Видео из коллекции Mezhduly Labs.',
    },
    {
      videoUrl: 'https://www.youtube.com/embed/7D5thY9s-2w?start=329',
      excerpt: 'Видео из коллекции Mezhduly Labs.',
    },
    {
      videoUrl: 'https://www.youtube.com/embed/96P25eO0gKU',
      excerpt: 'Видео из коллекции Mezhduly Labs.',
    },

  ],
  en: [
    {
      videoUrl: 'https://www.youtube.com/embed/fI92B8IVIVs',
      excerpt: 'Видео из коллекции Mezhduly Labs.',
    },
    {
      videoUrl: 'https://www.youtube.com/embed/7D5thY9s-2w?start=329',
      excerpt: 'Видео из коллекции Mezhduly Labs.',
    },
    {
      videoUrl: 'https://www.youtube.com/embed/96P25eO0gKU',
      excerpt: 'Видео из коллекции Mezhduly Labs.',
    },
  ],
} satisfies Record<Locale, readonly VideoCard[]>;
