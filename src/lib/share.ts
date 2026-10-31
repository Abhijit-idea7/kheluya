import type { Puzzle } from '@/lib/types';

/**
 * Short link for a puzzle. On the live site this is kheluya.in/<number>;
 * anywhere else (Bolt preview, testing) it falls back to this site's own /k/<number>.
 */
export function shortLink(n: number, tag?: string): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const base = /(^|\.)chalakheluya\.com$/.test(host) || /(^|\.)kheluya\.in$/.test(host)
    ? `https://kheluya.in/${n}`
    : `${typeof window !== 'undefined' ? window.location.origin : ''}/k/${n}`;
  return tag ? `${base}?s=${tag}` : base;
}

export function whatsappHref(p: Puzzle, message: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`${message} ${shortLink(p.number, 'wa')}`)}`;
}

export function facebookHref(p: Puzzle): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shortLink(p.number, 'fb'))}`;
}
