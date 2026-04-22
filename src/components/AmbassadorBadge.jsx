import { useState } from 'react'

/**
 * Premium ambassador badge with golden glow animation.
 * Shows a shield + star icon indicating the user is a platform ambassador.
 */
export const AmbassadorBadge = ({ size = 20, className = '', showLabel = false }) => {
  const [hovering, setHovering] = useState(false)

  return (
    <span
      className={`ambassador-badge-wrapper inline-flex items-center gap-1 ${className}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      title="Embaixador(a) da Plataforma"
    >
      <span className="ambassador-badge" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield shape */}
          <path
            d="M12 2L3 7V12C3 17.25 6.75 22.13 12 23C17.25 22.13 21 17.25 21 12V7L12 2Z"
            fill="url(#ambassadorGold)"
            stroke="#b8860b"
            strokeWidth="0.5"
          />
          {/* Star in center */}
          <path
            d="M12 7L13.5 10.5L17 11L14.5 13.5L15 17L12 15.5L9 17L9.5 13.5L7 11L10.5 10.5L12 7Z"
            fill="white"
            opacity="0.95"
          />
          <defs>
            <linearGradient id="ambassadorGold" x1="3" y1="2" x2="21" y2="23">
              <stop offset="0%" stopColor="#ffd700" />
              <stop offset="50%" stopColor="#f4a900" />
              <stop offset="100%" stopColor="#daa520" />
            </linearGradient>
          </defs>
        </svg>
      </span>
      {(showLabel || hovering) && (
        <span className="ambassador-label text-[10px] font-bold tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          Embaixador(a)
        </span>
      )}
    </span>
  )
}

export default AmbassadorBadge
