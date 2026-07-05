interface FishSilhouetteProps {
  className?: string
  /** Any CSS color; defaults to currentColor so it inherits text color. */
  color?: string
  style?: React.CSSProperties
}

/** Reusable stylized fish shape used across the marine graphics. */
export default function FishSilhouette({ className, color = 'currentColor', style }: FishSilhouetteProps) {
  return (
    <svg viewBox="0 0 120 64" className={className} style={style} aria-hidden fill="none">
      <path
        d="M6 32C22 8 58 6 82 24c6-6 16-11 26-13-4 8-4 15 0 21-10-2-20-7-26-13C58 58 22 56 6 32Z"
        fill={color}
      />
      <circle cx="26" cy="28" r="3.4" fill="#0b1220" />
      <path d="M50 20c10 4 18 12 22 22" stroke="#0b1220" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
