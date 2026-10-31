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

function Column({ title, links }: { title: string; links: readonly { to: string; key: string }[] }) {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-xl text-white mb-2">{title}</h2>
      <ul>
        {links.map(({ to, key }) => (
          <li key={to}>
            <Link to={to} className="min-h-[2.75rem] flex items-center text-lg text-white/85 hover:text-white underline-offset-4 hover:underline">
              {t(key)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-navy text-white border-t-[3px] border-ink mt-16 pb-24 lg:pb-0">
      <div className="max-w-site mx-auto px-5 py-10 grid gap-8 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
        <div>
          <div className="inline-block bg-paper rounded-2xl p-2 border-[3px] border-ink">
            <img src="/brand/logo-mark.webp" alt={t('app.logoAlt')} width={250} height={80} className="h-14 w-auto" />
          </div>
          <p className="mt-4 text-lg text-white/85 max-w-xs">{t('footer.tagline')}</p>
          <SocialLinks />
        </div>
        <Column title={t('footer.explore')} links={explore} />
        <Column title={t('footer.aboutUs')} links={about} />
        <Column title={t('footer.policies')} links={policies} />
      </div>
      <div className="border-t border-white/15">
        <p className="max-w-site mx-auto px-5 py-4 text-base text-white/70">{t('footer.siteLine')}</p>
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
    <div className="mt-5">
      <p className="text-lg font-heading font-bold">{t('footer.follow')}</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {links.map(({ href, label, Icon }) => (
          <li key={href}>
            <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 min-h-[3rem] px-4 rounded-2xl bg-paper text-ink border-[3px] border-ink font-bold">
              <Icon size={22} strokeWidth={2.4} aria-hidden="true" />
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
