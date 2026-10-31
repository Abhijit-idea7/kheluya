type TileProps = {
  char: string;
  size?: number; // px
  today?: boolean;
  tilt?: number; // degrees
  className?: string;
};

/** A wooden akshara tile, as on the logo. Decorative unless given a label by its parent. */
export default function Tile({ char, size = 56, today = false, tilt = 0, className = '' }: TileProps) {
  return (
    <span
      aria-hidden="true"
      className={`tile ${today ? 'tile-today' : ''} ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        transform: tilt ? `rotate(${tilt}deg)` : undefined,
      }}
    >
      {char}
    </span>
  );
}
