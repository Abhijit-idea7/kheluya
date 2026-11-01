import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Facebook, Instagram, MessageCircle } from 'lucide-react';
import { getPublicSettings } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';

const explore = [
  { to: '/kodi', key: 'nav.kodi' },
  { to: '/madat', key: 'footer.howToPlay' },
  { to: '/kutumb', key: 'footer.families' },
  { to: '/dukan', key: 'nav.dukan' },
] as const;

const about = [
  { to: '/amchyabaddal', key: 'footer.about' },
  { to: '/sampark', key: 'footer.contact' },
  { to: '/suchana', key: 'footer.notify' },
] as const;

const policies = [
  { to: '/dhoran/privacy', key: 'footer.privacy' },
  { to: '/dhoran/terms', key: 'footer.terms' },
  { to: '/dhoran/shipping', key: 'footer.shipping' },
  { to: '/dhoran/refunds', key: 'footer.refunds' },
] as const;

function LinkRow({ links, small }: { links: readonly { to: string; key: string }[]; small?: boolean }) {
  const { t } = useTranslation();
  return (
    <ul className={`flex flex-wrap gap-x-5 ${small ? 'text-base text-white/65' : 'text-lg text-white/90'}`}>
      {links.map(({ to, key }) => (
        <li key={to}>
          <Link to={to} className="min-h-[2.5rem] flex items-center hover:text-white underline-offset-4 hover:underline">
            {t(key)}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-navy text-white border-t-[3px] border-ink mt-10 pb-20 lg:pb-0">
      <div className="max-w-site mx-auto px-5 py-5 lg:py-7 grid gap-4 lg:grid-cols-[auto_1fr] lg:gap-10 items-start">
        <div className="hidden lg:block">
          <div className="inline-block bg-paper rounded-2xl p-1.5 border-[3px] border-ink">
            <img src="/brand/logo-mark.webp" alt={t('app.logoAlt')} width={250} height={80} className="h-11 w-auto" />
          </div>
          <p className="mt-3 text-base text-white/80 max-w-[16rem]">{t('footer.tagline')}</p>
        </div>
        <nav aria-label={t('footer.explore')} className="grid gap-1">
          <LinkRow links={[...explore, ...about]} />
          <LinkRow links={policies} small />
          <SocialLinks />
        </nav>
      </div>
      <div className="border-t border-white/15">
        <p className="max-w-site mx-auto px-5 py-3 text-sm text-white/60">{t('footer.siteLine')}</p>
      </div>
    </footer>
  );
}

function SocialLinks() {
  const { t } = useTranslation();
  const { data } = useAsync(() => getPublicSettings(), []);
  if (!data) return null;
  const str = (k: string) => (typeof data[k] === 'string' && /^https:\/\//.test(data[k] as string) ? (data[k] as string) : '');
  const links = [
    data.social_links === true && str('link_facebook') ? { href: str('link_facebook'), label: 'Facebook', Icon: Facebook } : null,
    data.social_links === true && str('link_instagram') ? { href: str('link_instagram'), label: 'Instagram', Icon: Instagram } : null,
    data.whatsapp_channel_link === true && str('link_whatsapp_channel')
      ? { href: str('link_whatsapp_channel'), label: t('footer.channel'), Icon: MessageCircle }
      : null,
  ].filter(Boolean) as { href: string; label: string; Icon: typeof Facebook }[];
  if (!links.length) return null;
  return (
    <div className="mt-2">
      <p className="text-base font-heading font-bold">{t('footer.follow')}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-[2.75rem] px-3 rounded-xl bg-paper text-ink border-[3px] border-ink font-bold">
              <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
