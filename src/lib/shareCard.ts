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
  const c = document.createElement('canvas');
  c.width = 1080;
  c.height = 1350;
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

  const logo = await loadImage('/brand/logo-hero.webp');
  const lw = 900;
  const lh = (logo.height / logo.width) * lw;
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
