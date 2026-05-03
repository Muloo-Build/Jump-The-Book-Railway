// Primitives.jsx — shared UI atoms for Jump the Book screens
// Buttons, chips, tags, pills, and the SCENE ART placeholder generator.

// ─────────────────────────────────────────────────────────────
// Scene art placeholder — procedural, deterministic per seed.
// Honors current art-style tweak: "cinematic" | "comic" | "watercolour"
// Produces an SVG that LOOKS like generated art without inventing
// imagery — moody color blocks + light/atmosphere primitives.
// ─────────────────────────────────────────────────────────────
function hashSeed(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0);
}

function rng(seed) {
  let x = seed || 1;
  return () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return x / 4294967296;
  };
}

const SCENE_PALETTES = {
  cinematic: [
    ['#0E1A26', '#1F3D5C', '#3A6088', '#D4B26B'],   // teal & gold
    ['#1A0B14', '#3D1A2A', '#6B2C44', '#E8B86A'],   // wine & amber
    ['#0A1014', '#16282E', '#2D4A52', '#9CC5D6'],   // moonlit slate
    ['#15110B', '#2E2418', '#5A4226', '#C49A5C'],   // sepia firelight
    ['#0C1424', '#1B2746', '#3C4F7A', '#A8B5D9'],   // midnight blue
    ['#1F0F0A', '#3C1A12', '#7A3322', '#E2A06B'],   // ember
  ],
  comic: [
    ['#0F1A2E', '#1F4E9C', '#E63946', '#FFD166'],   // pulp action
    ['#15131A', '#3B1F4A', '#A04AB5', '#F2C94C'],   // noir purple
    ['#0E1A14', '#1E5128', '#FF8C42', '#FFE066'],   // adventure
    ['#19121F', '#2B1B36', '#D7263D', '#F1FAEE'],   // crime
  ],
  watercolour: [
    ['#1F2B3D', '#5C7A99', '#B5A491', '#E8D9C4'],   // dusk wash
    ['#2D2438', '#7A6A8C', '#C9A4A4', '#F0E2D4'],   // mauve mist
    ['#1A2E2A', '#5C8A7E', '#C4B89B', '#F0EAD9'],   // sea moss
    ['#3D2A1F', '#8C6647', '#D4B58F', '#F2E7D5'],   // tea & paper
  ],
};

function SceneArt({ seed = 'a', style = 'cinematic', label, ratio = '16/9', cornerNote }) {
  const r = rng(hashSeed(seed + style));
  const palettes = SCENE_PALETTES[style] || SCENE_PALETTES.cinematic;
  const pal = palettes[Math.floor(r() * palettes.length)];
  const [bg, mid, fg, light] = pal;

  // Composition primitives — three abstract layers
  const horizonY = 50 + r() * 25;          // %
  const sunX = 20 + r() * 60;
  const sunY = horizonY - 8 - r() * 18;
  const sunR = 8 + r() * 14;
  const fogOpacity = 0.18 + r() * 0.2;

  // Distant silhouettes (rectangles → architecture / trees)
  const silCount = 4 + Math.floor(r() * 5);
  const silhouettes = Array.from({length: silCount}, (_, i) => {
    const w = 6 + r() * 14;
    const h = 8 + r() * 22;
    const x = (i / silCount) * 100 + (r() - 0.5) * 6;
    return { x, w, h };
  });

  // Foreground silhouette (one larger element, suggests subject)
  const subjW = 10 + r() * 14;
  const subjH = 16 + r() * 20;
  const subjX = 35 + r() * 30;

  const grain = style === 'watercolour' ? 0.45 : style === 'comic' ? 0.15 : 0.25;
  const lineStyle = style === 'comic';
  const wash = style === 'watercolour';

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      aspectRatio: ratio,
      borderRadius: 10,
      overflow: 'hidden',
      background: bg,
      boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 30px rgba(0,0,0,0.5)',
    }}>
      <svg viewBox="0 0 100 56.25" preserveAspectRatio="xMidYMid slice"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
        <defs>
          <radialGradient id={`sun-${seed}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={light} stopOpacity="0.95"/>
            <stop offset="40%" stopColor={fg} stopOpacity="0.5"/>
            <stop offset="100%" stopColor={fg} stopOpacity="0"/>
          </radialGradient>
          <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={bg}/>
            <stop offset="100%" stopColor={mid} stopOpacity={wash ? 0.7 : 1}/>
          </linearGradient>
          <linearGradient id={`fog-${seed}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fg} stopOpacity={fogOpacity}/>
            <stop offset="100%" stopColor={fg} stopOpacity="0"/>
          </linearGradient>
          <filter id={`grain-${seed}`}>
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={hashSeed(seed) % 100}/>
            <feColorMatrix values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${grain} 0`}/>
          </filter>
        </defs>

        {/* Sky */}
        <rect x="0" y="0" width="100" height="56.25" fill={`url(#sky-${seed})`}/>

        {/* Light source */}
        <circle cx={sunX} cy={sunY} r={sunR * 1.8} fill={`url(#sun-${seed})`} opacity={wash ? 0.6 : 0.85}/>
        {!wash && <circle cx={sunX} cy={sunY} r={sunR * 0.45} fill={light} opacity="0.7"/>}

        {/* Background fog band above horizon */}
        <rect x="0" y={horizonY * 0.5625 - 8} width="100" height="14" fill={`url(#fog-${seed})`}/>

        {/* Mid-ground silhouettes */}
        <g opacity={lineStyle ? 1 : 0.85}>
          {silhouettes.map((s, i) => (
            <rect key={i} x={s.x} y={horizonY * 0.5625 - s.h * 0.5}
              width={s.w} height={s.h * 0.8}
              fill={lineStyle ? bg : mid}
              stroke={lineStyle ? fg : 'none'}
              strokeWidth={lineStyle ? 0.4 : 0}
              opacity={0.7 + (i / silCount) * 0.3}/>
          ))}
        </g>

        {/* Horizon line */}
        <line x1="0" y1={horizonY * 0.5625} x2="100" y2={horizonY * 0.5625}
          stroke={fg} strokeWidth="0.2" opacity="0.4"/>

        {/* Foreground subject silhouette */}
        <rect x={subjX} y={56.25 - subjH * 0.45} width={subjW * 0.5} height={subjH * 0.45}
          fill={bg} opacity="0.95"
          stroke={lineStyle ? fg : 'none'} strokeWidth={lineStyle ? 0.3 : 0}/>

        {/* Foreground floor */}
        <rect x="0" y={horizonY * 0.5625} width="100" height="56.25" fill={bg} opacity={wash ? 0.5 : 0.75}/>

        {/* Reflections / scatter */}
        {!lineStyle && Array.from({length: 12}, (_, i) => (
          <circle key={i} cx={r() * 100} cy={horizonY * 0.5625 + r() * 24}
            r={0.3 + r() * 0.6} fill={light} opacity={0.2 + r() * 0.4}/>
        ))}

        {/* Comic halftone */}
        {lineStyle && Array.from({length: 60}, (_, i) => (
          <circle key={i} cx={r() * 100} cy={r() * 56.25}
            r="0.35" fill={fg} opacity="0.4"/>
        ))}

        {/* Grain overlay */}
        <rect x="0" y="0" width="100" height="56.25" filter={`url(#grain-${seed})`}/>
      </svg>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.45) 100%)',
      }}/>

      {/* Optional caption chip */}
      {cornerNote ? (
        <div style={{
          position: 'absolute', top: 8, left: 8,
          padding: '3px 7px', borderRadius: 4,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(8px)',
          fontFamily: 'var(--font-mono)',
          fontSize: 9, letterSpacing: 0.5,
          color: 'var(--gold-200)',
          textTransform: 'uppercase',
        }}>{cornerNote}</div>
      ) : null}
      {label ? (
        <div style={{
          position: 'absolute', bottom: 8, left: 10, right: 10,
          fontFamily: 'var(--font-serif)',
          fontSize: 13, fontStyle: 'italic',
          color: 'rgba(255,255,255,0.85)',
          textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          lineHeight: 1.25,
        }}>{label}</div>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Tiny UI atoms
// ─────────────────────────────────────────────────────────────
function Btn({ children, variant = 'primary', size = 'md', icon, style, onClick }) {
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12, height: 30, gap: 6 },
    md: { padding: '9px 16px', fontSize: 13, height: 38, gap: 8 },
    lg: { padding: '12px 22px', fontSize: 14, height: 46, gap: 10 },
  };
  const variants = {
    primary: {
      background: 'var(--accent)',
      color: '#1A1208',
      border: '1px solid var(--accent-hi)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 20px rgba(201,169,106,0.25)',
      fontWeight: 600,
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1px solid var(--border-strong)',
      fontWeight: 500,
    },
    quiet: {
      background: 'rgba(255,255,255,0.03)',
      color: 'var(--text-dim)',
      border: '1px solid var(--border)',
      fontWeight: 500,
    },
  };
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 8, cursor: 'pointer',
      fontFamily: 'var(--font-sans)', letterSpacing: 0.1,
      transition: 'transform .12s, filter .12s',
      ...sizes[size], ...variants[variant], ...style,
    }}>
      {icon ? <span style={{ display: 'inline-flex' }}>{icon}</span> : null}
      {children}
    </button>
  );
}

function Chip({ children, active = false, icon }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 999,
      fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
      background: active ? 'rgba(201,169,106,0.14)' : 'rgba(255,255,255,0.03)',
      color: active ? 'var(--accent-hi)' : 'var(--text-dim)',
      border: `1px solid ${active ? 'var(--border-strong)' : 'var(--border)'}`,
      letterSpacing: 0.2,
    }}>
      {icon}{children}
    </span>
  );
}

function Tag({ children }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: 9.5,
      textTransform: 'uppercase', letterSpacing: 1,
      color: 'var(--accent)',
      padding: '2px 6px', borderRadius: 3,
      background: 'rgba(201,169,106,0.10)',
      border: '1px solid rgba(201,169,106,0.18)',
    }}>{children}</span>
  );
}

function ProgressBar({ value = 0.4, height = 3 }) {
  return (
    <div style={{
      width: '100%', height,
      background: 'rgba(255,255,255,0.06)',
      borderRadius: height,
      overflow: 'hidden',
    }}>
      <div style={{
        width: `${value * 100}%`, height: '100%',
        background: 'linear-gradient(90deg, var(--accent), var(--accent-hi))',
      }}/>
    </div>
  );
}

// Tiny line icons
const Icon = {
  Search: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke={c} strokeWidth="1.4"/><path d="M11 11l3 3" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>),
  Plus: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>),
  Book: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 3h4a2 2 0 0 1 2 2v8a1 1 0 0 0-1-1H3V3zM13 3H9a2 2 0 0 0-2 2v8a1 1 0 0 1 1-1h5V3z" stroke={c} strokeWidth="1.2" strokeLinejoin="round"/></svg>),
  Sparkle: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke={c} strokeWidth="1.4" strokeLinecap="round"/><path d="M8 5l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill={c}/></svg>),
  Play: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill={c}><path d="M5 3l8 5-8 5z"/></svg>),
  Pause: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill={c}><rect x="4" y="3" width="3" height="10" rx="1"/><rect x="9" y="3" width="3" height="10" rx="1"/></svg>),
  Heart: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 13s-5-3.5-5-7a3 3 0 0 1 5-2 3 3 0 0 1 5 2c0 3.5-5 7-5 7z" stroke={c} strokeWidth="1.4" strokeLinejoin="round"/></svg>),
  Download: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 3v8m0 0l-3-3m3 3l3-3M3 13h10" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Upload: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M8 13V5m0 0l-3 3m3-3l3 3M3 3h10" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>),
  Settings: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.3"/><path d="M8 1.5v2M8 12.5v2M14.5 8h-2M3.5 8h-2M12.6 3.4l-1.4 1.4M4.8 11.2l-1.4 1.4M12.6 12.6l-1.4-1.4M4.8 4.8l-1.4-1.4" stroke={c} strokeWidth="1.3" strokeLinecap="round"/></svg>),
  Menu: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 4h10M3 8h10M3 12h10" stroke={c} strokeWidth="1.4" strokeLinecap="round"/></svg>),
  Chevron: ({s=16,c='currentColor',d='right'}) => {
    const rot = {left:180,right:0,up:-90,down:90}[d];
    return (<svg width={s} height={s} viewBox="0 0 16 16" fill="none" style={{transform:`rotate(${rot}deg)`}}><path d="M6 4l4 4-4 4" stroke={c} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>);
  },
  Filmstrip: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1" stroke={c} strokeWidth="1.2"/><line x1="2" y1="6" x2="14" y2="6" stroke={c} strokeWidth="1"/><line x1="2" y1="10" x2="14" y2="10" stroke={c} strokeWidth="1"/></svg>),
  Grid: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" stroke={c} strokeWidth="1.2"/><rect x="9" y="2" width="5" height="5" stroke={c} strokeWidth="1.2"/><rect x="2" y="9" width="5" height="5" stroke={c} strokeWidth="1.2"/><rect x="9" y="9" width="5" height="5" stroke={c} strokeWidth="1.2"/></svg>),
  Spoiler: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke={c} strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke={c} strokeWidth="1.3"/></svg>),
  Moon: ({s=16,c='currentColor'}) => (<svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M13 9.5A5 5 0 1 1 6.5 3a4 4 0 0 0 6.5 6.5z" stroke={c} strokeWidth="1.3" strokeLinejoin="round" fill={c} fillOpacity="0.15"/></svg>),
};

// ─────────────────────────────────────────────────────────────
// BookCover — placeholder cover, deterministic per title
// ─────────────────────────────────────────────────────────────
function BookCover({ title = 'Untitled', author = '', height = 220, onScreen = true }) {
  const r = rng(hashSeed(title));
  const palettes = [
    ['#3D1A2A','#6B2C44','#E6C885'],
    ['#0E1A26','#1F3D5C','#D4B26B'],
    ['#1A0B14','#2D1B36','#A04AB5'],
    ['#15110B','#2E2418','#C49A5C'],
    ['#0A1B14','#1E5128','#E8B86A'],
    ['#1F2B3D','#5C7A99','#F0E2D4'],
  ];
  const pal = palettes[Math.floor(r() * palettes.length)];
  const [c1, c2, c3] = pal;
  return (
    <div style={{
      position: 'relative',
      height, aspectRatio: '2 / 3',
      borderRadius: 4,
      overflow: 'hidden',
      background: `linear-gradient(165deg, ${c1} 0%, ${c2} 60%, ${c1} 100%)`,
      boxShadow: onScreen ? '0 1px 0 rgba(255,255,255,0.06) inset, 0 18px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.5)' : 'none',
    }}>
      {/* Spine highlight */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 6,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.5), transparent)',
      }}/>
      {/* Decorative band */}
      <div style={{
        position: 'absolute', left: '8%', right: '8%', top: '12%', height: 1,
        background: c3, opacity: 0.7,
      }}/>
      <div style={{
        position: 'absolute', left: '8%', right: '8%', bottom: '14%', height: 1,
        background: c3, opacity: 0.7,
      }}/>
      <div style={{
        position: 'absolute', inset: '20% 8% auto 8%',
        fontFamily: 'var(--font-serif)',
        color: c3,
        fontSize: height * 0.085,
        fontWeight: 600,
        lineHeight: 1.05,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textShadow: '0 2px 6px rgba(0,0,0,0.5)',
      }}>{title}</div>
      <div style={{
        position: 'absolute', bottom: '7%', left: '8%', right: '8%',
        fontFamily: 'var(--font-sans)',
        color: c3,
        opacity: 0.8,
        fontSize: height * 0.04,
        textTransform: 'uppercase',
        letterSpacing: 1.2,
      }}>{author}</div>
    </div>
  );
}

Object.assign(window, {
  SceneArt, Btn, Chip, Tag, ProgressBar, Icon, BookCover, hashSeed, rng,
});
