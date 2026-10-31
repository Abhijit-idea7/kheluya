// Small UI kit for the admin screens (English, denser than the public site).
import type { ReactNode } from 'react';

export const input =
  'w-full rounded-xl border-2 border-ink/70 bg-white px-3 py-2 text-base outline-none focus:border-orange';
export const btn =
  'inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink px-4 py-2 font-bold text-base shadow-[0_3px_0_0_#10233F] active:translate-y-[2px] active:shadow-none disabled:opacity-50';
export const btnPrimary = `${btn} bg-orange text-ink`;
export const btnQuiet = `${btn} bg-white text-ink`;
export const btnDanger = `${btn} bg-[#FDE2E1] text-[#8A1C14]`;

export function Field({ label, hint, children, className = '' }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-bold text-ink/80 mb-1">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-sm text-ink/60">{hint}</span>}
    </label>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 border-ink bg-paper p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function Badge({ tone, children }: { tone: 'grey' | 'green' | 'orange' | 'navy'; children: ReactNode }) {
  const tones = {
    grey: 'bg-[#ECE7DA] text-ink',
    green: 'bg-green-soft text-[#1F5E2A]',
    orange: 'bg-orange-soft text-[#7A4300]',
    navy: 'bg-navy text-white',
  };
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-bold ${tones[tone]}`}>{children}</span>;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

export function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
