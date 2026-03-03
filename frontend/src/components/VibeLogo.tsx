const LETTERS = ['V', 'i', 'b', 'e', '\u00A0', 'P', 'l', 'a', 'n', 'n', 'e', 'r']

interface VibeLogoProps {
  small?: boolean
}

export function VibeLogo({ small = false }: VibeLogoProps) {
  return (
    <h1 className={`vibe-logo${small ? ' small' : ''}`} aria-label="Vibe Planner">
      {LETTERS.map((letter, i) => (
        <span
          key={i}
          className="vibe-letter"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          {letter}
        </span>
      ))}
    </h1>
  )
}
