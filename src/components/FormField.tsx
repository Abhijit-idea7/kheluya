type Props = {
  label: string;
  hint?: string;
  children: React.ReactNode;
};

/** A big, clearly labelled form field for older eyes and fingers. */
export default function FormField({ label, hint, children }: Props) {
  return (
    <label className="block">
      <span className="block font-heading font-bold text-xl">{label}</span>
      {hint && <span className="block text-base text-ink/70">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

export const inputClass =
  'w-full min-h-touch rounded-2xl border-[3px] border-ink bg-paper px-4 py-3 text-xl outline-none focus:bg-white placeholder:text-ink/40';
