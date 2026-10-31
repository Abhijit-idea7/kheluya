import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { pick, type Puzzle } from '@/lib/types';
import { facebookHref, shortLink, whatsappHref } from '@/lib/share';
import { makeShareCard } from '@/lib/shareCard';
import { track, type Channel } from '@/lib/track';

/*
 * Share block v2 — the same block, look and behaviour as at the end of every puzzle
 * (Puzzle Standard: Sharing): WhatsApp · Facebook · Instagram, then "लिंक कॉपी करा".
 */

const Icon = {
  wa: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.7-1.2 2.2 2.2 0 0 0 .2-1.2c0-.1-.3-.2-.5-.3Z" /></svg>
  ),
  fb: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.5 1.6-1.5h1.6V4.4a22 22 0 0 0-2.4-.1c-2.4 0-4 1.4-4 4.1v2.4H7.6V14h2.7v8h3.2Z" /></svg>
  ),
  ig: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 7.3A4.7 4.7 0 1 0 16.7 12 4.7 4.7 0 0 0 12 7.3Zm0 7.7a3 3 0 1 1 3-3 3 3 0 0 1-3 3Zm6-7.9a1.1 1.1 0 1 1-1.1-1.1A1.1 1.1 0 0 1 18 7.1ZM12 4c2.6 0 2.9 0 4 .1 2.6.1 3.8 1.4 3.9 3.9v8c-.1 2.5-1.3 3.8-3.9 3.9H8c-2.6-.1-3.8-1.4-3.9-3.9V8C4.2 5.5 5.4 4.2 8 4.1L12 4Zm0-1.7c-2.6 0-3 0-4 .1C4.4 2.5 2.5 4.4 2.4 8v8c.1 3.6 2 5.5 5.6 5.6h8c3.6-.1 5.5-2 5.6-5.6V8c-.1-3.6-2-5.5-5.6-5.6l-4-.1Z" /></svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" /></svg>
  ),
};

type Props = { puzzle: Puzzle; sessionId: string; compact?: boolean };

export default function ShareButtons({ puzzle, sessionId, compact = false }: Props) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState<{ img: string; copied: boolean } | null>(null);
  const name = pick(puzzle, 'name', 'mr');
  const message = t('share.message', { name, lng: 'mr' });

  useEffect(() => () => { if (sheet) URL.revokeObjectURL(sheet.img); }, [sheet]);

  const count = (channel: Channel) => track({ puzzle_id: puzzle.id, session_id: sessionId, event: 'shared', channel, source: 'page' });
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const onFacebook = async () => {
    count('facebook');
    const ok = await copy(`${message} ${shortLink(puzzle.number, 'fb')}`);
    setNote(ok ? t('share.fbCopied') : '');
  };

  const onInstagram = async () => {
    count('instagram');
    setNote(t('share.making'));
    const text = `${message} ${shortLink(puzzle.number, 'ig')}`;
    const copied = await copy(text);
    try {
      const blob = await makeShareCard(puzzle, { kicker: t('share.cardKicker', { lng: 'mr' }), invite: t('share.cardInvite', { lng: 'mr' }) });
      const file = new File([blob], `chala-kheluya-${puzzle.number}.png`, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        setNote(copied ? t('share.igPickCopied') : t('share.igPick'));
        await navigator.share({ files: [file], text }).catch(() => {});
      } else {
        setNote('');
        setSheet({ img: URL.createObjectURL(blob), copied });
      }
    } catch {
      setNote('');
    }
  };

  const onCopy = async () => {
    count('copy');
    const link = shortLink(puzzle.number, 'cp');
    setNote((await copy(link)) ? t('share.copiedLink', { link: shortLink(puzzle.number) }) : link);
  };

  return (
    <div className={`flex flex-col gap-2 ${compact ? '' : 'mt-5'}`}>
      <p className="cks-h">{t('share.heading')}</p>
      <div className="cks-row">
        <a className="cks wa" href={whatsappHref(puzzle, message)} target="_blank" rel="noopener noreferrer" onClick={() => count('whatsapp')}>
          {Icon.wa}
          <span>WhatsApp</span>
        </a>
        <a className="cks fb" href={facebookHref(puzzle)} target="_blank" rel="noopener noreferrer" onClick={onFacebook}>
          {Icon.fb}
          <span>Facebook</span>
        </a>
        <button className="cks ig" type="button" onClick={onInstagram}>
          {Icon.ig}
          <span>Instagram</span>
        </button>
      </div>
      <button type="button" className="cks-link" onClick={onCopy}>
        {Icon.link}
        <span>{t('share.copy')}</span>
      </button>
      {note && (
        <p role="status" className="text-center text-base font-bold text-ink/80">
          {note}
        </p>
      )}

      {sheet && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={() => setSheet(null)}>
          <div
            role="dialog"
            aria-label={t('share.igTitle')}
            className="w-full max-w-sm max-h-[92vh] overflow-auto rounded-3xl border-[3px] border-ink bg-paper p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-heading-sm">{t('share.igTitle')}</h2>
            <img src={sheet.img} alt={t('share.igAlt')} className="mt-3 w-full rounded-xl border-2 border-line" />
            <ol className="mt-3 list-decimal pl-5 text-lg leading-snug space-y-1">
              <li>{t('share.igStep1')}</li>
              <li>{t('share.igStep2')}</li>
              <li>{sheet.copied ? t('share.igStep3Copied') : t('share.igStep3')}</li>
            </ol>
            <a href={sheet.img} download={`chala-kheluya-${puzzle.number}.png`} className="btn btn-primary w-full mt-4 text-xl">
              {t('share.igDownload')}
            </a>
            <button type="button" onClick={() => setSheet(null)} className="btn btn-quiet w-full mt-3 text-xl">
              {t('share.close')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
