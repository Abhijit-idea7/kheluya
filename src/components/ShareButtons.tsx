import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Facebook, Image as ImageIcon, Instagram, Share2, ChevronDown, Check } from 'lucide-react';
import { pick, type Puzzle } from '@/lib/types';
import { facebookHref, shortLink, whatsappHref } from '@/lib/share';
import { makeShareCard } from '@/lib/shareCard';
import { track, type Channel } from '@/lib/track';

type Props = { puzzle: Puzzle; sessionId: string; compact?: boolean };

export default function ShareButtons({ puzzle, sessionId, compact = false }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string>('');
  const name = pick(puzzle, 'name', 'mr');

  const count = (channel: Channel) =>
    track({ puzzle_id: puzzle.id, session_id: sessionId, event: 'shared', channel, source: 'page' });

  const message = t('share.message', { name, lng: 'mr' });

  const copyLink = async () => {
    count('copy');
    try {
      await navigator.clipboard.writeText(shortLink(puzzle.number, 'cp'));
      setNote(t('share.copied'));
    } catch {
      setNote(shortLink(puzzle.number, 'cp'));
    }
  };

  const phoneShare = async () => {
    count('native');
    try {
      await navigator.share({ title: name, text: message, url: shortLink(puzzle.number, 'sh') });
    } catch {
      /* closed */
    }
  };

  const instagram = async () => {
    count('instagram');
    setNote(t('share.making'));
    try {
      const blob = await makeShareCard(puzzle, { kicker: t('share.cardKicker', { lng: 'mr' }), invite: t('share.cardInvite', { lng: 'mr' }) });
      const file = new File([blob], `chala-kheluya-${puzzle.number}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${message} ${shortLink(puzzle.number, 'ig')}` });
        setNote('');
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.name;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
        setNote(t('share.downloaded'));
      }
    } catch {
      setNote('');
    }
  };

  const canPhoneShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className={compact ? '' : 'mt-4'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href={whatsappHref(puzzle, message)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => count('whatsapp')}
          className="btn btn-whatsapp w-full whitespace-nowrap"
        >
          <Share2 size={24} strokeWidth={2.6} aria-hidden="true" />
          {t('share.whatsapp')}
        </a>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="btn btn-quiet w-full whitespace-nowrap">
          {t('share.elsewhere')}
          <ChevronDown size={24} strokeWidth={2.6} aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="mt-3 rounded-3xl border-[3px] border-ink bg-paper p-3 grid gap-2 sm:grid-cols-2">
          <a
            href={facebookHref(puzzle)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => count('facebook')}
            className="btn btn-quiet w-full text-xl justify-start"
          >
            <Facebook size={24} strokeWidth={2.4} aria-hidden="true" className="text-[#1877F2]" />
            Facebook
          </a>
          <button type="button" onClick={instagram} className="btn btn-quiet w-full text-xl justify-start">
            <Instagram size={24} strokeWidth={2.4} aria-hidden="true" className="text-[#C13584]" />
            <span>
              Instagram <span className="text-base font-body font-medium text-ink/70">({t('share.asPicture')})</span>
            </span>
          </button>
          <button type="button" onClick={copyLink} className="btn btn-quiet w-full text-xl justify-start">
            <Copy size={24} strokeWidth={2.4} aria-hidden="true" />
            {t('share.copy')}
          </button>
          {canPhoneShare ? (
            <button type="button" onClick={phoneShare} className="btn btn-quiet w-full text-xl justify-start">
              <ImageIcon size={24} strokeWidth={2.4} aria-hidden="true" />
              {t('share.phone')}
            </button>
          ) : null}
        </div>
      )}
      {note && (
        <p role="status" className="mt-2 text-lg font-bold text-green inline-flex items-center gap-2">
          <Check size={20} strokeWidth={3} aria-hidden="true" />
          {note}
        </p>
      )}
    </div>
  );
}
