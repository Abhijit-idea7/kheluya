import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageShell from '@/components/PageShell';
import BusinessDetails from '@/components/BusinessDetails';
import { fill, useBusiness } from '@/lib/business';
import { LAST_UPDATED, type LegalDoc, type Lang } from '@/content/legal';

const OTHER: Record<Lang, [string, string][]> = {
  mr: [['/dhoran/privacy', 'गोपनीयता धोरण'], ['/dhoran/terms', 'अटी व शर्ती'], ['/dhoran/shipping', 'डिलिव्हरी धोरण'], ['/dhoran/refunds', 'रद्द व परतावा धोरण'], ['/sampark', 'संपर्क']],
  en: [['/dhoran/privacy', 'Privacy policy'], ['/dhoran/terms', 'Terms and conditions'], ['/dhoran/shipping', 'Delivery policy'], ['/dhoran/refunds', 'Cancellation and refund policy'], ['/sampark', 'Contact']],
};

/** A policy page: title, short intro, numbered sections, the business details, and links to the other policies. */
export default function LegalPage({ doc, path, illustration, footer = 'policy' }: {
  doc: Record<Lang, LegalDoc>;
  path: string;
  illustration?: React.ComponentProps<typeof PageShell>['illustration'];
  footer?: 'policy' | 'about';
}) {
  const { i18n } = useTranslation();
  const lang: Lang = i18n.language === 'en' ? 'en' : 'mr';
  const d = doc[lang];
  const b = useBusiness();
  const vars: Record<string, string | number> = b
    ? { name: b.name, address: b.address, email: b.email, phone: b.phone, grievance: b.grievance, hours: b.hours, city: b.city || (lang === 'mr' ? 'वडोदरा' : 'Vadodara'), codMax: b.codMax.toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN') }
    : { name: '…' };
  return (
    <PageShell title={d.title} description={fill(d.intro, vars)} illustration={illustration}>
      {footer === 'policy' && <p className="mt-2 text-base text-ink/60">{lang === 'mr' ? 'शेवटचा बदल' : 'Last updated'}: {LAST_UPDATED[lang]}</p>}
      <div className="mt-6 grid gap-6">
        {d.sections.map((s, i) => (
          <section key={s.h}>
            <h2 className="text-heading-sm">{footer === 'policy' ? `${(i + 1).toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN')}. ` : ''}{s.h}</h2>
            {s.p.length === 1 ? (
              <p className="mt-1.5 text-body-base leading-relaxed">{fill(s.p[0], vars)}</p>
            ) : (
              <ul className="mt-1.5 grid gap-1.5 list-disc pl-6 text-body-base leading-relaxed marker:text-orange">
                {s.p.map((t) => <li key={t}>{fill(t, vars)}</li>)}
              </ul>
            )}
          </section>
        ))}
        <BusinessDetails showGrievance={footer === 'policy'} />
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-lg" aria-label={lang === 'mr' ? 'इतर धोरणे' : 'Other policies'}>
          {OTHER[lang].filter(([to]) => to !== path).map(([to, label]) => (
            <Link key={to} to={to} className="underline underline-offset-4 min-h-[2.5rem] flex items-center">{label}</Link>
          ))}
        </nav>
      </div>
    </PageShell>
  );
}
