type IllustrationProps = {
  name: 'cheer' | 'share' | 'morning' | 'book' | 'confused' | 'diwali' | 'faces';
  alt: string;
  className?: string;
  round?: boolean;
  eager?: boolean;
};

const sizes: Record<IllustrationProps['name'], [number, number]> = {
  cheer: [359, 360],
  share: [461, 461],
  morning: [1024, 687],
  book: [580, 720],
  confused: [720, 720],
  diwali: [1024, 687],
  faces: [256, 256],
};

/** An आजी-आजोबा illustration in the site's outlined sticker frame. */
export default function Illustration({ name, alt, className = '', round = false, eager = false }: IllustrationProps) {
  const [w, h] = sizes[name];
  return (
    <img
      src={`/illustrations/${name}.webp`}
      alt={alt}
      width={w}
      height={h}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`block h-auto bg-paper border-[3px] border-ink ${round ? 'rounded-full' : 'rounded-3xl'} ${className}`}
    />
  );
}
