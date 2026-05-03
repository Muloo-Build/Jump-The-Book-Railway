// MobileScreens.jsx — iOS layouts for Jump the Book
// Library variations + Reading mode with scene panel variations

// ─────────────────────────────────────────────────────────────
// MOBILE LIBRARY — 4 variations
// ─────────────────────────────────────────────────────────────

// V1 — Editorial: serif headline, scene-led grid
function MobLibEditorial({ artStyle, LogoMark }) {
  return (
    <MobShell title="Library" LogoMark={LogoMark}>
      <div style={{ padding: '8px 20px 20px' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 9.5, color: 'var(--accent)', letterSpacing: 2, textTransform:'uppercase', marginBottom: 8 }}>◐ Tuesday Evening</div>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize: 32, fontWeight: 500, margin: 0, lineHeight: 1.05, letterSpacing: -0.5 }}>
          The next <span style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>scene</span> awaits.
        </h1>
      </div>
      {/* Continue card */}
      <div style={{ padding: '4px 16px 16px' }}>
        <div style={{ borderRadius: 14, overflow: 'hidden', position: 'relative', border: '1px solid var(--border-strong)' }}>
          <SceneArt seed="mob-cont" style={artStyle} ratio="3/4" cornerNote="Ch.14 · 02"/>
          <div style={{ position: 'absolute', inset: 'auto 0 0 0', padding: 14, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--accent-hi)', textTransform:'uppercase' }}>Continue · 62%</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize: 22, fontWeight: 500, color: 'white', lineHeight: 1.1, margin: '6px 0 4px' }}>House of Sky and Breath</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>Sarah J. Maas · 4 hr left</div>
          </div>
        </div>
      </div>
      {/* Sub-header */}
      <MobSection title="My books" cta="14"/>
      <div style={{ display:'flex', gap: 12, padding: '0 16px 16px', overflowX:'hidden' }}>
        {['House of Sky','Spaceops','Zero Hour','Piranesi'].map((t,i)=>(
          <div key={i} style={{ width: 100, flexShrink: 0 }}>
            <BookCover title={t} author={['Maas','Alanson','Alanson','Clarke'][i]} height={150}/>
            <div style={{ fontSize: 11, marginTop: 6, fontWeight: 500, lineHeight: 1.25 }}>{t}</div>
          </div>
        ))}
      </div>
      <MobSection title="Recent scenes" cta="184"/>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 80px' }}>
        {Array.from({length:4}).map((_,i)=>(
          <SceneArt key={i} seed={`m-r-${i}`} style={artStyle} cornerNote={`Ch. ${i+5}`}/>
        ))}
      </div>
    </MobShell>
  );
}

// V2 — Minimal list: text-forward, fewer images
function MobLibMinimal({ artStyle, LogoMark }) {
  const books = [
    { t: 'House of Sky and Breath', a: 'Sarah J. Maas', p: 0.62, s: 'Reading now' },
    { t: 'Spaceops', a: 'Craig Alanson', p: 0.34, s: 'Last week' },
    { t: 'Zero Hour', a: 'Craig Alanson', p: 0.05, s: 'Just added' },
    { t: 'Piranesi', a: 'Susanna Clarke', p: 1.0, s: 'Finished' },
    { t: 'Project Hail Mary', a: 'Andy Weir', p: 1.0, s: 'Finished' },
  ];
  return (
    <MobShell title="Library" LogoMark={LogoMark}>
      <div style={{ padding: '0 20px 16px' }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: -0.5 }}>Your library</h1>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>14 books · 184 scenes generated</div>
      </div>
      {/* Search */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <Icon.Search s={13} c="var(--text-mute)"/>
          <span style={{ fontSize: 13, color: 'var(--text-mute)' }}>Search title, author, scene…</span>
        </div>
      </div>
      {/* List */}
      <div style={{ borderTop: '1px solid var(--border)' }}>
        {books.map((b,i)=>(
          <div key={i} style={{ display:'flex', gap:14, alignItems:'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
            <BookCover title={b.t} author={b.a} height={70}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, color: 'var(--accent)', textTransform:'uppercase', letterSpacing:1.5 }}>{b.s}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginTop: 4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{b.t}</div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)' }}>{b.a}</div>
              <div style={{ marginTop: 8 }}><ProgressBar value={b.p} height={2}/></div>
            </div>
            <Icon.Chevron s={14} c="var(--text-mute)"/>
          </div>
        ))}
      </div>
    </MobShell>
  );
}

// V3 — Cinematic: full-bleed scene hero, swipeable
function MobLibCinematic({ artStyle, LogoMark }) {
  return (
    <MobShell title="Library" LogoMark={LogoMark} dark>
      <div style={{ position:'relative', height: 460, marginTop: -8 }}>
        <SceneArt seed="cine-hero" style={artStyle} ratio="9/13"/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, rgba(8,8,11,0.4) 0%, transparent 30%, transparent 50%, rgba(8,8,11,0.95) 100%)' }}/>
        <div style={{ position:'absolute', bottom: 24, left: 20, right: 20 }}>
          <Tag>Continue · Ch. 14</Tag>
          <div style={{ fontFamily:'var(--font-serif)', fontSize: 28, fontWeight: 500, color: 'white', lineHeight: 1.05, margin: '12px 0 8px', letterSpacing: -0.5 }}>House of Sky<br/>and Breath</div>
          <div style={{ fontSize: 12, color:'rgba(255,255,255,0.7)', marginBottom: 16 }}>Sarah J. Maas · 62% · 4 hr left</div>
          <div style={{ display:'flex', gap: 8 }}>
            <Btn variant="primary" size="sm" icon={<Icon.Play s={11}/>}>Resume</Btn>
            <Btn variant="ghost" size="sm" icon={<Icon.Filmstrip s={12}/>}>Scenes</Btn>
          </div>
        </div>
        {/* page dots */}
        <div style={{ position:'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', display:'flex', gap: 6 }}>
          {[1,2,3].map((i,k)=>(
            <div key={k} style={{ width: 16, height: 2, borderRadius: 2, background: k===0?'white':'rgba(255,255,255,0.3)' }}/>
          ))}
        </div>
      </div>
      <MobSection title="Your shelf" cta="See all"/>
      <div style={{ display:'flex', gap:12, padding: '0 16px 24px', overflowX:'hidden' }}>
        {['Spaceops','Zero Hour','Piranesi','Hail Mary'].map((t,i)=>(
          <div key={i} style={{ width: 110, flexShrink: 0 }}>
            <BookCover title={t} author={['Alanson','Alanson','Clarke','Weir'][i]} height={165}/>
          </div>
        ))}
      </div>
      <MobSection title="Lately visualized"/>
      <div style={{ display:'flex', gap:10, padding: '0 16px 80px', overflowX:'hidden' }}>
        {Array.from({length:5}).map((_,i)=>(
          <div key={i} style={{ width:130, flexShrink: 0 }}>
            <SceneArt seed={`cine-l-${i}`} style={artStyle} ratio="4/5" cornerNote={`SC.${i+1}`}/>
          </div>
        ))}
      </div>
    </MobShell>
  );
}

// V4 — Scene-first grid: scenes are primary, books a sidebar tab
function MobLibSceneFirst({ artStyle, LogoMark }) {
  const [tab, setTab] = React.useState('scenes');
  return (
    <MobShell title="Library" LogoMark={LogoMark}>
      <div style={{ padding: '0 20px 12px' }}>
        <h1 style={{ fontFamily:'var(--font-serif)', fontSize: 30, fontWeight: 500, margin: 0, letterSpacing: -0.5 }}>Library</h1>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>184 scenes from 14 books</div>
      </div>
      {/* Segmented control */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display:'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {[['scenes','Scenes'],['books','Books'],['saved','Saved']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)} style={{
              flex: 1, padding: '7px 0', borderRadius: 6,
              fontFamily:'var(--font-sans)', fontSize: 12, fontWeight: 500,
              border: 'none', cursor: 'pointer',
              background: tab===k ? 'var(--accent)' : 'transparent',
              color: tab===k ? '#1A1208' : 'var(--text-dim)',
            }}>{l}</button>
          ))}
        </div>
      </div>
      {/* Filter chips */}
      <div style={{ display:'flex', gap: 6, padding: '0 20px 16px', overflowX: 'hidden' }}>
        {['All','House of Sky','Spaceops','Piranesi','Watercolour','Cinematic'].map((c,i)=>(
          <Chip key={i} active={i===0}>{c}</Chip>
        ))}
      </div>
      {/* Scene grid - irregular */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, padding: '0 16px 80px' }}>
        {Array.from({length:8}).map((_,i)=>{
          const big = i === 0 || i === 5;
          return (
            <div key={i} style={{ gridColumn: big ? 'span 2' : 'span 1' }}>
              <SceneArt seed={`sf-${i}`} style={artStyle} ratio={big ? '16/9' : '3/4'}
                cornerNote={`Ch. ${(i*3)%14+1}`}
                label={big ? 'A long quiet across the threshold' : null}/>
            </div>
          );
        })}
      </div>
    </MobShell>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE READING — 4 variations of "reading + scene panel"
// ─────────────────────────────────────────────────────────────

const SAMPLE_TEXT = (
  <>
    <p style={{textIndent: '1.5em', margin: '0 0 0.9em'}}>
      The corridor was longer than she remembered, lit only by the sodium glow of dying lamps that hummed like tired bees. Bryce moved through it like she'd done it a thousand times before — because she had.
    </p>
    <p style={{textIndent: '1.5em', margin: '0 0 0.9em'}}>
      Her boots, soft on the stone, made no sound. The walls leaned inward as if listening. Somewhere ahead, a door. Somewhere behind, a memory of a door. She could not yet tell which she was running toward.
    </p>
    <p style={{textIndent: '1.5em', margin: '0 0 0.9em'}}>
      "If you are afraid," her mother had said once, "walk slower." So she did. She walked slower. The lights flickered, and the corridor exhaled.
    </p>
  </>
);

// V1 — Split: text top, peekable scene strip bottom
function MobReadSplit({ artStyle, LogoMark }) {
  return (
    <MobShell title="" minimal LogoMark={LogoMark}>
      {/* Reader header */}
      <div style={{ padding: '4px 20px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--text-mute)', textTransform:'uppercase' }}>Chapter 14</div>
          <div style={{ fontFamily:'var(--font-serif)', fontSize: 16, fontWeight: 500, marginTop: 2 }}>The Long Corridor</div>
        </div>
        <div style={{ display:'flex', gap: 4 }}>
          <IconBtn><Icon.Spoiler s={14}/></IconBtn>
          <IconBtn><Icon.Settings s={14}/></IconBtn>
        </div>
      </div>
      {/* Body */}
      <div style={{
        padding: '0 24px',
        fontFamily:'var(--font-serif)', fontSize: 17, lineHeight: 1.65,
        color: 'var(--text)',
      }}>
        {SAMPLE_TEXT}
      </div>
      {/* Bottom scene panel (peeking) */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: 12, background: 'linear-gradient(transparent, var(--bg) 30%)' }}>
        <div style={{
          background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--border-strong)',
          padding: 8, display: 'flex', gap: 10, alignItems: 'center',
          boxShadow: 'var(--shadow-2)',
        }}>
          <div style={{ width: 90, flexShrink: 0 }}>
            <SceneArt seed="read-split" style={artStyle} ratio="1/1"/>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize: 8.5, color: 'var(--accent)', textTransform:'uppercase', letterSpacing: 1.5 }}>Scene · Generating</div>
            <div style={{ fontFamily:'var(--font-serif)', fontSize: 13.5, fontWeight: 500, marginTop: 2, lineHeight: 1.25 }}>The corridor exhaled.</div>
            <div style={{ marginTop: 8 }}><ProgressBar value={0.7} height={2}/></div>
          </div>
          <Icon.Chevron s={14} c="var(--text-dim)" d="up"/>
        </div>
      </div>
    </MobShell>
  );
}

// V2 — Hero scene: full scene up top, text scrolls under
function MobReadHero({ artStyle, LogoMark }) {
  return (
    <MobShell title="" minimal LogoMark={LogoMark} hideHeader>
      <div style={{ position:'relative', height: 320 }}>
        <SceneArt seed="read-hero" style={artStyle} ratio="1/1"/>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom, transparent 50%, var(--bg) 100%)' }}/>
        <div style={{ position:'absolute', top: 50, left: 16, right: 16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <IconBtn dark><Icon.Chevron s={14} d="left"/></IconBtn>
          <Tag>Ch. 14 · Scene 02</Tag>
          <IconBtn dark><Icon.Heart s={14}/></IconBtn>
        </div>
        <div style={{ position:'absolute', bottom: 18, left: 20, right: 20 }}>
          <div style={{ fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 18, color: 'white', lineHeight: 1.3, textShadow: '0 2px 8px rgba(0,0,0,0.7)' }}>
            "If you are afraid, walk slower."
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 24px 100px', fontFamily:'var(--font-serif)', fontSize: 17, lineHeight: 1.65, color: 'var(--text)' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--text-mute)', textTransform:'uppercase', marginBottom: 14 }}>The Long Corridor</div>
        {SAMPLE_TEXT}
      </div>
      {/* floating reader controls */}
      <div style={{ position:'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', display:'flex', gap: 4, padding: 4, background: 'rgba(15,16,21,0.85)', backdropFilter:'blur(20px)', borderRadius: 999, border: '1px solid var(--border-strong)' }}>
          <IconBtn><Icon.Filmstrip s={13}/></IconBtn>
          <IconBtn><Icon.Settings s={13}/></IconBtn>
          <IconBtn><Icon.Moon s={13}/></IconBtn>
        </div>
    </MobShell>
  );
}

// V3 — Filmstrip: scenes as a vertical timeline beside text
function MobReadFilm({ artStyle, LogoMark }) {
  return (
    <MobShell title="" minimal LogoMark={LogoMark}>
      <div style={{ padding: '0 16px 12px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--text-mute)', textTransform:'uppercase' }}>Ch. 14 · 62%</div>
        <Icon.Settings s={14} c="var(--text-mute)"/>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'56px 1fr', gap: 0, padding: '0 0 100px' }}>
        {/* Filmstrip rail */}
        <div style={{ padding: '0 0 0 12px', display:'flex', flexDirection:'column', gap: 8, position:'relative' }}>
          <div style={{ position:'absolute', left: 23, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}/>
          {[
            { active: false, seed:'fs1', n:'01' },
            { active: true, seed:'fs2', n:'02' },
            { active: false, seed:'fs3', n:'03', dim: true },
            { active: false, seed:'fs4', n:'04', dim: true },
          ].map((f,i)=>(
            <div key={i} style={{ position:'relative' }}>
              <div style={{ width: 40, height: 52, borderRadius: 4, overflow:'hidden', border: f.active ? '1.5px solid var(--accent)':'1px solid var(--border)', boxShadow: f.active ? 'var(--glow-gold)' : 'none', opacity: f.dim ? 0.35 : 1, position:'relative' }}>
                <SceneArt seed={f.seed} style={artStyle} ratio="3/4"/>
                {f.dim && <div style={{ position:'absolute', inset: 0, background: 'rgba(8,8,11,0.6)', backdropFilter: 'blur(3px)', display:'flex', alignItems:'center', justifyContent:'center' }}><Icon.Spoiler s={12} c="var(--text-mute)"/></div>}
              </div>
              <div style={{ position:'absolute', left: -2, top: -3, fontFamily:'var(--font-mono)', fontSize: 8, color: f.active ? 'var(--accent)' : 'var(--text-mute)', letterSpacing: 1 }}>{f.n}</div>
            </div>
          ))}
        </div>
        {/* Text */}
        <div style={{ padding: '0 20px 0 16px', fontFamily:'var(--font-serif)', fontSize: 17, lineHeight: 1.65, color: 'var(--text)' }}>
          <h2 style={{ fontFamily:'var(--font-serif)', fontSize: 22, fontWeight: 500, margin: '0 0 14px', letterSpacing: -0.3 }}>The Long Corridor</h2>
          {SAMPLE_TEXT}
        </div>
      </div>
    </MobShell>
  );
}

// V4 — Inline: scenes interleaved with text like a magazine
function MobReadInline({ artStyle, LogoMark }) {
  return (
    <MobShell title="" minimal LogoMark={LogoMark}>
      <div style={{ padding: '0 24px 100px' }}>
        <div style={{ fontFamily:'var(--font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--accent)', textTransform:'uppercase', marginBottom: 6 }}>Chapter Fourteen</div>
        <h2 style={{ fontFamily:'var(--font-serif)', fontSize: 28, fontWeight: 500, margin: '0 0 4px', letterSpacing: -0.5, lineHeight: 1.1 }}>The Long Corridor</h2>
        <div style={{ fontSize: 11, color: 'var(--text-mute)', marginBottom: 22 }}>about 8 min</div>

        <div style={{ fontFamily:'var(--font-serif)', fontSize: 17, lineHeight: 1.65 }}>
          <p style={{margin: '0 0 0.9em'}}>
            <span style={{ float:'left', fontFamily:'var(--font-serif)', fontSize: 56, lineHeight: 0.9, fontWeight: 500, color:'var(--accent)', padding: '4px 6px 0 0' }}>T</span>
            he corridor was longer than she remembered, lit only by the sodium glow of dying lamps that hummed like tired bees. Bryce moved through it like she'd done it a thousand times before — because she had.
          </p>
        </div>

        {/* Inline scene */}
        <div style={{ margin: '20px -24px 20px', position:'relative' }}>
          <SceneArt seed="inl-1" style={artStyle} ratio="3/2"/>
          <div style={{ padding: '8px 24px 0', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-mute)', textTransform:'uppercase', letterSpacing: 1.5 }}>
            Scene 02 · Generated 11:42 PM
          </div>
        </div>

        <div style={{ fontFamily:'var(--font-serif)', fontSize: 17, lineHeight: 1.65 }}>
          <p style={{textIndent: '1.5em', margin:'0 0 0.9em'}}>
            Her boots, soft on the stone, made no sound. The walls leaned inward as if listening. Somewhere ahead, a door.
          </p>
          <p style={{textIndent: '1.5em', margin:'0 0 0.9em', textAlign:'center', fontStyle:'italic', color:'var(--accent-hi)'}}>
            "If you are afraid, walk slower."
          </p>
          <p style={{textIndent: '1.5em', margin:'0 0 0.9em'}}>
            So she did. She walked slower. The lights flickered, and the corridor exhaled.
          </p>
        </div>
      </div>
    </MobShell>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile shell — wraps in iOS frame, top nav, etc.
// ─────────────────────────────────────────────────────────────
function MobShell({ children, title, minimal, hideHeader, LogoMark = window.LogoJump, dark = true }) {
  return (
    <IOSDevice statusBarStyle={dark ? 'light' : 'dark'} background="var(--bg)">
      <div style={{ minHeight:'100%', background:'var(--bg)', color:'var(--text)', fontFamily:'var(--font-sans)', display:'flex', flexDirection:'column' }}>
        {!hideHeader && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding: '4px 16px 8px', borderBottom: minimal ? 'none' : '1px solid var(--border)' }}>
            {minimal ? <IconBtn><Icon.Chevron s={14} d="left"/></IconBtn> : <Lockup Mark={LogoMark} size={22} wmSize={12}/>}
            {!minimal && (
              <div style={{ display:'flex', gap: 4 }}>
                <IconBtn><Icon.Search s={14}/></IconBtn>
                <IconBtn><Icon.Plus s={14}/></IconBtn>
              </div>
            )}
            {minimal && <Icon.Menu s={14} c="var(--text-dim)"/>}
          </div>
        )}
        <div style={{ flex: 1, paddingTop: hideHeader ? 0 : 8 }}>{children}</div>
        {!minimal && <MobTabBar/>}
      </div>
    </IOSDevice>
  );
}

function MobSection({ title, cta }) {
  return (
    <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', padding: '20px 20px 12px' }}>
      <h2 style={{ fontFamily:'var(--font-serif)', fontSize: 18, fontWeight: 500, margin: 0, letterSpacing: -0.2 }}>{title}</h2>
      {cta ? <span style={{ fontFamily:'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', letterSpacing: 1 }}>{cta}</span> : null}
    </div>
  );
}

function IconBtn({ children, dark }) {
  return (
    <button style={{
      width: 32, height: 32, borderRadius: 8,
      background: dark ? 'rgba(0,0,0,0.5)' : 'transparent',
      backdropFilter: dark ? 'blur(8px)' : 'none',
      border: dark ? '1px solid rgba(255,255,255,0.1)' : 'none',
      color: 'var(--text)',
      display:'flex', alignItems:'center', justifyContent:'center',
      cursor: 'pointer',
    }}>{children}</button>
  );
}

function MobTabBar() {
  const items = [
    { i: <Icon.Book s={18}/>, l: 'Library', a: true },
    { i: <Icon.Sparkle s={18}/>, l: 'Scenes' },
    { i: <Icon.Plus s={18}/>, l: 'Upload' },
    { i: <Icon.Settings s={18}/>, l: 'Settings' },
  ];
  return (
    <div style={{ borderTop: '1px solid var(--border)', padding: '8px 20px 24px', display:'flex', justifyContent:'space-around', background: 'var(--bg)' }}>
      {items.map((it,i)=>(
        <div key={i} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: it.a ? 'var(--accent)' : 'var(--text-mute)' }}>
          {it.i}
          <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: 0.3 }}>{it.l}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, {
  MobLibEditorial, MobLibMinimal, MobLibCinematic, MobLibSceneFirst,
  MobReadSplit, MobReadHero, MobReadFilm, MobReadInline,
  MobShell,
});
