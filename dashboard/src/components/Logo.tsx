interface LogoProps {
  size?: number
  className?: string
  glow?: boolean
}

export default function Logo({ size = 32, className = '', glow = true }: LogoProps) {
  const r = size / 2
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 0 6px rgba(108, 99, 255, 0.4))' } : undefined}
    >
      <circle cx={r} cy={r} r={r * 0.78} className="fill-[#1a1a2e] dark:fill-white" />
    </svg>
  )
}
