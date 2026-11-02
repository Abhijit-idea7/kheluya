import type { Puzzle } from '@/lib/types';
import { shortLink } from '@/lib/share';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** A 1080×1350 picture for Instagram / Status: logo, puzzle name, invite line and short link. */
export async function makeShareCard(p: Puzzle, lines: { kicker: string; invite: string }): Promise<Blob> {
  await document.fonts?.ready;
  const logo = await loadImage('/brand/logo-hero.webp');
  const lw = 900;
  const lh = (logo.height / logo.width) * lw;
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = Math.round(120 + lh + 50 + 520 + 110);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F6F1E4';
  ctx.fillRect(0, 0, c.width, c.height);

  // sun rays
  ctx.save();
  ctx.translate(540, 360);
  ctx.fillStyle = '#FFE2B0';
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-40, -620);
    ctx.lineTo(40, -620);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  ctx.drawImage(logo, (1080 - lw) / 2, 120, lw, lh);

  // card
  const top = 120 + lh + 50;
  roundRect(ctx, 80 + 12, top + 14, 920, 520, 48);
  ctx.fillStyle = '#10233F';
  ctx.fill();
  roundRect(ctx, 80, top, 920, 520, 48);
  ctx.fillStyle = '#FFFAF0';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#10233F';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#D97B00';
  ctx.font = '700 52px "Baloo 2", Mukta, sans-serif';
  ctx.fillText(lines.kicker, 540, top + 100);
  ctx.fillStyle = '#10233F';
  ctx.font = '800 112px "Baloo 2", Mukta, sans-serif';
  ctx.fillText(p.name_mr, 540, top + 235, 860);
  ctx.font = '500 48px Mukta, sans-serif';
  ctx.fillText(lines.invite, 540, top + 330, 860);

  // link pill
  const link = shortLink(p.number).replace(/^https?:\/\//, '');
  ctx.font = '800 64px "Baloo 2", Mukta, sans-serif';
  const tw = ctx.measureText(link).width + 100;
  roundRect(ctx, 540 - tw / 2, top + 380, tw, 100, 50);
  ctx.fillStyle = '#F39200';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = '#10233F';
  ctx.fillText(link, 540, top + 452);

  return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png'));
}

export type ResultCard = { title: string; time: string; big: string; line: string };

/**
 * The WhatsApp challenge card (1080×1350): the player's result from the puzzle's own result card
 * (title, score or time, line) plus a "can you beat it?" band and the short link.
 */
export async function makeChallengeCard(p: Puzzle, r: ResultCard): Promise<Blob> {
  await document.fonts?.ready;
  const logo = await loadImage('/brand/logo-hero.webp');
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#F6F1E4';
  ctx.fillRect(0, 0, W, H);

  // sun rays behind the logo
  ctx.save();
  ctx.translate(540, 200);
  ctx.fillStyle = '#FFE2B0';
  for (let i = 0; i < 24; i++) {
    ctx.rotate((Math.PI * 2) / 24);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-34, -520);
    ctx.lineTo(34, -520);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  const lw = 620, lh = (logo.height / logo.width) * lw;
  ctx.drawImage(logo, (W - lw) / 2, 50, lw, lh);

  // result card
  const top = Math.round(50 + lh + 36), ch = r.big && r.time ? 600 : 530;
  roundRect(ctx, 70 + 12, top + 14, 940, ch, 48);
  ctx.fillStyle = '#10233F';
  ctx.fill();
  roundRect(ctx, 70, top, 940, ch, 48);
  ctx.fillStyle = '#FFFAF0';
  ctx.fill();
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#10233F';
  ctx.stroke();

  const mr = (v: string | number) => String(v).replace(/[0-9]/g, (d) => '०१२३४५६७८९'[Number(d)]);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#D97B00';
  ctx.font = '700 46px "Baloo 2", Mukta, sans-serif';
  ctx.fillText(`${p.type?.name_mr ?? p.name_mr} · कोडे क्र. ${mr(p.number)}`, 540, top + 82, 860);
  ctx.fillStyle = '#10233F';
  ctx.font = '800 80px "Baloo 2", Mukta, sans-serif';
  ctx.fillText(r.title || 'मी सोडवले!', 540, top + 190, 860);
  ctx.fillStyle = '#D97B00';
  const big = r.big || (r.time ? `⏱ ${r.time}` : '');
  ctx.font = `800 ${big.length > 12 ? 112 : 150}px "Baloo 2", Mukta, sans-serif`;
  ctx.fillText(big, 540, top + 375, 880);
  if (r.line) {
    ctx.fillStyle = '#4D5A6C';
    ctx.font = '600 46px Mukta, sans-serif';
    ctx.fillText(r.line, 540, top + 470, 860);
  }
  if (r.big && r.time) {
    ctx.fillStyle = '#4D5A6C';
    ctx.font = '600 42px Mukta, sans-serif';
    ctx.fillText(`⏱ ${r.time}`, 540, top + 540, 860);
  }

  // challenge band
  const by = top + ch + 50, bh = H - by - 40;
  roundRect(ctx, 70, by, 940, bh, 40);
  ctx.fillStyle = '#0F2F5C';
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 60px "Baloo 2", Mukta, sans-serif';
  ctx.fillText(r.big ? 'तुम्ही याहून चांगले कराल?' : 'तुम्ही किती वेळात सोडवाल?', 540, by + bh * 0.38, 880);
  const link = shortLink(p.number).replace(/^https?:\/\//, '');
  const pill = `▶ खेळा: ${link}`;
  ctx.font = '800 56px "Baloo 2", Mukta, sans-serif';
  const tw = Math.min(880, ctx.measureText(pill).width + 90);
  roundRect(ctx, 540 - tw / 2, by + bh * 0.52, tw, 96, 48);
  ctx.fillStyle = '#F39200';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#10233F';
  ctx.stroke();
  ctx.fillStyle = '#10233F';
  ctx.fillText(pill, 540, by + bh * 0.52 + 68, 840);

  return await new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('blob'))), 'image/png'));
}
