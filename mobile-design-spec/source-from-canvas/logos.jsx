// Logos.jsx — geometric rabbit logo explorations for Jump the Book
// 4 marks, each pairable with a wordmark. All built from primitive shapes.

// ─────────────────────────────────────────────────────────────
// 1. CRESCENT — rabbit silhouette inside a moon, suggesting
//    the rabbit-hole + reading-by-moonlight. Negative-space ears.
// ─────────────────────────────────────────────────────────────
function LogoCrescent({ size = 64, color = 'var(--accent)', bg = 'transparent' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="30" fill={bg} stroke={color} strokeWidth="1.5" opacity="0.4"/>
      {/* Crescent moon */}
      <path d="M32 6 a26 26 0 1 0 0 52 a20 20 0 1 1 0 -52z" fill={color}/>
      {/* Rabbit silhouette punched in negative space */}
      <g transform="translate(20 16)">
        <ellipse cx="10" cy="22" rx="8" ry="9" fill="var(--ink-900)"/>
        <ellipse cx="6" cy="10" rx="2.2" ry="7" fill="var(--ink-900)" transform="rotate(-10 6 10)"/>
        <ellipse cx="13" cy="10" rx="2.2" ry="7" fill="var(--ink-900)" transform="rotate(10 13 10)"/>
        <circle cx="13" cy="20" r="0.9" fill={color}/>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. COMPASS — rabbit ears as compass needle. Geometric, north-pointing.
//    Suggests "jumping" / navigating into a story.
// ─────────────────────────────────────────────────────────────
function LogoCompass({ size = 64, color = 'var(--accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="29" stroke={color} strokeWidth="1.25" opacity="0.5"/>
      <circle cx="32" cy="32" r="22" stroke={color} strokeWidth="1" opacity="0.25"/>
      {/* Tick marks */}
      {[0,90,180,270].map(a => (
        <line key={a} x1="32" y1="4" x2="32" y2="9"
          stroke={color} strokeWidth="1.5" transform={`rotate(${a} 32 32)`}/>
      ))}
      {/* Two ears as needle blades — long N, short S */}
      <path d="M32 8 L27 30 L32 26 L37 30 Z" fill={color}/>
      <path d="M32 56 L29 38 L32 41 L35 38 Z" fill={color} opacity="0.55"/>
      {/* Center pivot */}
      <circle cx="32" cy="32" r="2.5" fill="var(--ink-900)" stroke={color} strokeWidth="1.25"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. JUMP — geometric rabbit head, pure silhouette. Two ears + skull.
//    Built from intersecting circles (Bauhaus-y).
// ─────────────────────────────────────────────────────────────
function LogoJump({ size = 64, color = 'var(--accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Ears — angled rounded rects */}
      <rect x="20" y="6" width="9" height="28" rx="4.5" fill={color}
        transform="rotate(-12 24.5 20)"/>
      <rect x="35" y="6" width="9" height="28" rx="4.5" fill={color}
        transform="rotate(12 39.5 20)"/>
      {/* Inner ears — negative space */}
      <rect x="22.5" y="11" width="4" height="18" rx="2" fill="var(--ink-900)"
        transform="rotate(-12 24.5 20)"/>
      <rect x="37.5" y="11" width="4" height="18" rx="2" fill="var(--ink-900)"
        transform="rotate(12 39.5 20)"/>
      {/* Head — perfect circle */}
      <circle cx="32" cy="40" r="18" fill={color}/>
      {/* Eyes — small negative circles */}
      <circle cx="25" cy="38" r="1.6" fill="var(--ink-900)"/>
      <circle cx="39" cy="38" r="1.6" fill="var(--ink-900)"/>
      {/* Nose */}
      <path d="M32 44 L30 47 L34 47 Z" fill="var(--ink-900)"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. PORTAL — open book whose pages frame a rabbit silhouette.
//    Most literal, most "branded."
// ─────────────────────────────────────────────────────────────
function LogoPortal({ size = 64, color = 'var(--accent)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Book covers */}
      <path d="M6 14 L32 18 L32 56 L6 52 Z" fill={color} opacity="0.18"
        stroke={color} strokeWidth="1.25" strokeLinejoin="round"/>
      <path d="M58 14 L32 18 L32 56 L58 52 Z" fill={color} opacity="0.18"
        stroke={color} strokeWidth="1.25" strokeLinejoin="round"/>
      {/* Spine */}
      <line x1="32" y1="18" x2="32" y2="56" stroke={color} strokeWidth="1" opacity="0.55"/>
      {/* Rabbit silhouette emerging from the spine */}
      <g>
        {/* Ears */}
        <ellipse cx="28" cy="14" rx="2" ry="6" fill={color} transform="rotate(-8 28 14)"/>
        <ellipse cx="36" cy="14" rx="2" ry="6" fill={color} transform="rotate(8 36 14)"/>
        {/* Head */}
        <circle cx="32" cy="22" r="6" fill={color}/>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Wordmark — pairs with any mark
// ─────────────────────────────────────────────────────────────
function Wordmark({ size = 22, color = 'var(--text)', accent = 'var(--accent)', tracking = 0 }) {
  return (
    <span style={{
      fontFamily: 'var(--font-serif)',
      fontWeight: 500,
      fontSize: size,
      color,
      letterSpacing: tracking,
      lineHeight: 1,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontStyle: 'italic', color: accent }}>Jump</span>
      <span style={{ opacity: 0.55, padding: '0 0.25em' }}>the</span>
      <span>Book</span>
    </span>
  );
}

// Lockup combos
function Lockup({ Mark, size = 56, label = true, layout = 'h', wmSize }) {
  const stack = layout === 'v';
  return (
    <div style={{
      display: 'flex',
      flexDirection: stack ? 'column' : 'row',
      alignItems: 'center',
      gap: stack ? 12 : 14,
    }}>
      <Mark size={size}/>
      {label ? <Wordmark size={wmSize ?? Math.round(size * 0.42)}/> : null}
    </div>
  );
}

Object.assign(window, {
  LogoCrescent, LogoCompass, LogoJump, LogoPortal, Wordmark, Lockup,
});
