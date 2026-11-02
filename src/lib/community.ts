import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';

/** The WhatsApp Community invite link, when switched on in Admin → Settings; otherwise ''. */
export function communityLinkFrom(s: Record<string, unknown> | null | undefined): string {
  if (!s || s.whatsapp_community !== true) return '';
  const l = s.link_whatsapp_community;
  return typeof l === 'string' && /^https:\/\/chat\.whatsapp\.com\/[A-Za-z0-9]+/.test(l) ? l : '';
}

export function useCommunityLink(): string {
  const { data } = useAsync(() => getPublicSettings(), []);
  return communityLinkFrom(data);
}
