// WebScreens.jsx — refined web app layouts
// Library (polished current page) + Onboarding (first-run)

const NAV_ITEMS = ['Library', 'Discover', 'Upload', 'Help'];

function WebTopNav({ active = 'Library', LogoMark = window.LogoJump }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '20px 36px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(8,8,11,0.7)',
      backdropFilter: 'blur(18px)',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        <Lockup Mark={LogoMark} size={32} wmSize={16}/>
        <nav style={{ display: 'flex', gap: 4 }}>
          {NAV_ITEMS.map(n => (
            <a key={n} style={{
              padding: '8px 14px', borderRadius: 6,
              fontFamily: 'var(--font-sans)', fontSize: 13,
              color: n === active ? 'var(--text)' : 'var(--text-dim)',
              fontWeight: n === active ? 600 : 500,
              background: n === active ? 'rgba(201,169,106,0.06)' : 'transparent',
              cursor: 'pointer', textDecoration: 'none',
              letterSpacing: 0.1,
            }}>{n}</a>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border)',
          width: 220,
        }}>
          <Icon.Search s={13} c="var(--text-mute)"/>
          <span style={{ fontFamily:'var(--font-sans)', fontSize: 12, color: 'var(--text-mute)'}}>Search library…</span>
          <span style={{ marginLeft: 'auto', fontFamily:'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', padding: '1px 5px', border: '1px solid var(--border)', borderRadius: 3 }}>⌘K</span>
        </div>
        <div style={{
          width: 30, height: 30, borderRadius: 999,
          background: 'linear-gradient(135deg, var(--gold-300), var(--gold-600))',
          border: '1px solid var(--border-strong)',
        }}/>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// WebLibrary — refined version of current page
// ─────────────────────────────────────────────────────────────
function WebLibrary({ artStyle = 'cinematic', LogoMark }) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: 1320, fontFamily: 'var(--font-sans)' }}>
      <WebTopNav LogoMark={LogoMark}/>
      <main style={{ padding: '36px 56px 80px', maxWidth: 1280, margin: '0 auto' }}>

        {/* Hero greeting */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10 }}>
              ◐ Tuesday · 11:42 PM
            </div>
            <h1 style={{
              fontFamily: 'var(--font-serif)', fontWeight: 500,
              fontSize: 56, lineHeight: 1, margin: 0, letterSpacing: -1,
            }}>
              Welcome back, <span style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>Reader</span>.
            </h1>
            <p style={{ color: 'var(--text-dim)', fontSize: 15, marginTop: 14, maxWidth: 460, lineHeight: 1.55 }}>
              Three chapters since you put it down. The next scene is queued and waiting.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="ghost" icon={<Icon.Upload s={14}/>}>Upload</Btn>
            <Btn variant="primary" icon={<Icon.Sparkle s={14}/>}>Continue reading</Btn>
          </div>
        </div>

        {/* Continue reading — hero card */}
        <ContinueReadingCard artStyle={artStyle}/>

        {/* Stats strip */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1,
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
          marginTop: 36,
        }}>
          {[
            { label: 'Currently reading', value: '1', sub: 'House of Sky' },
            { label: 'In library', value: '14', sub: '6 finished' },
            { label: 'Scenes generated', value: '184', sub: '+12 this week' },
            { label: 'Streak', value: '23', sub: 'days' },
            { label: 'Time read', value: '14h', sub: 'this month' },
          ].map((s, i) => (
            <div key={i} style={{ background: 'var(--bg-card)', padding: '20px 22px' }}>
              <div style={{ fontSize: 10.5, fontFamily: 'var(--font-mono)', color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: 1.5 }}>{s.label}</div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 36, fontWeight: 500, marginTop: 6, color: 'var(--text)', letterSpacing: -0.5 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* My books — horizontal */}
        <SectionHeader title="My books" sub="Your shelf · 14 books" cta="Browse all"/>
        <div style={{ display: 'flex', gap: 22, overflow: 'hidden', paddingBottom: 6 }}>
          {[
            { t: 'House of Sky and Breath', a: 'Sarah J. Maas', p: 0.62 },
            { t: 'Spaceops', a: 'Craig Alanson', p: 0.34 },
            { t: 'Zero Hour', a: 'Craig Alanson', p: 0.05 },
            { t: 'The Way of Kings', a: 'Brandon Sanderson', p: 1.0 },
            { t: 'Project Hail Mary', a: 'Andy Weir', p: 1.0 },
            { t: 'Piranesi', a: 'Susanna Clarke', p: 1.0 },
          ].map((b, i) => (
            <div key={i} style={{ width: 158, flexShrink: 0 }}>
              <BookCover title={b.t} author={b.a} height={236}/>
              <div style={{ marginTop: 12, fontSize: 13, fontWeight: 500, lineHeight: 1.35 }}>{b.t}</div>
              <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{b.a}</div>
              <div style={{ marginTop: 8 }}>
                <ProgressBar value={b.p} height={2}/>
              </div>
            </div>
          ))}
        </div>

        {/* Scene library */}
        <SectionHeader title="Scene library" sub="Recently visualized · 184 total" cta="Browse all"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
          {[
            ['Cold sea and silent lights', 'Ch. 12'],
            ['Caverns between brothers', 'Ch. 03'],
            ['A window onto the void', 'Ch. 07'],
            ['The quiet weight of the bridge', 'Ch. 09'],
            ['The weight of the hangar air', 'Ep. 04'],
            ['Corridor of thin signals', 'Ep. 06'],
            ['Lit by fractured glow', 'Ep. 08'],
            ['Steel light before the briefing', 'Ep. 11'],
          ].map((s, i) => (
            <div key={i}>
              <SceneArt seed={`lib-${i}`} style={artStyle} cornerNote={s[1]} label={s[0]}/>
            </div>
          ))}
        </div>

        {/* Classics */}
        <SectionHeader title="From the classics" sub="Curated public-domain reads" cta="Open Library"/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
          {[
            { t: "Alice's Adventures in Wonderland", a: 'Lewis Carroll' },
            { t: 'Dracula', a: 'Bram Stoker' },
            { t: 'Frankenstein', a: 'Mary Shelley' },
            { t: 'Sherlock Holmes', a: 'A. Conan Doyle' },
          ].map((b, i) => (
            <div key={i} style={{
              background: 'var(--bg-card)',
              borderRadius: 14,
              border: '1px solid var(--border)',
              padding: 20,
              display: 'flex', gap: 18,
              alignItems: 'flex-start',
            }}>
              <BookCover title={b.t} author={b.a} height={132}/>
              <div style={{ flex: 1 }}>
                <Tag>Public domain</Tag>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500, marginTop: 12, lineHeight: 1.2 }}>{b.t}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 4 }}>{b.a}</div>
                <div style={{ marginTop: 14 }}>
                  <Btn variant="quiet" size="sm" icon={<Icon.Plus s={11}/>}>Add to library</Btn>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ title, sub, cta }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', margin: '60px 0 22px' }}>
      <div>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontWeight: 500, fontSize: 26, margin: 0, letterSpacing: -0.3 }}>{title}</h2>
        <div style={{ fontSize: 12, color: 'var(--text-mute)', marginTop: 4 }}>{sub}</div>
      </div>
      {cta ? (
        <a style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--accent)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {cta} <Icon.Chevron s={12} c="var(--accent)"/>
        </a>
      ) : null}
    </div>
  );
}

function ContinueReadingCard({ artStyle }) {
  return (
    <div style={{
      borderRadius: 18,
      border: '1px solid var(--border-strong)',
      background: 'linear-gradient(135deg, rgba(201,169,106,0.06), rgba(201,169,106,0.02))',
      padding: 20,
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr',
      gap: 28,
      alignItems: 'stretch',
      boxShadow: 'var(--shadow-2)',
    }}>
      <div style={{ position: 'relative' }}>
        <SceneArt seed="hero-continue" style={artStyle} ratio="16/9"
          cornerNote="Chapter 14 · Scene 02"
          label="The corridor stretched on, lit only by the sodium glow of dying lamps and her own held breath."/>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '6px 6px 6px 0' }}>
        <div>
          <Tag>Continue reading</Tag>
          <h3 style={{ fontFamily:'var(--font-serif)', fontSize: 28, fontWeight: 500, margin: '14px 0 6px', lineHeight: 1.1, letterSpacing: -0.3 }}>
            House of Sky and Breath
          </h3>
          <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 18 }}>Sarah J. Maas · 62% · 4 hr left</div>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--text-dim)', lineHeight: 1.55, margin: 0, borderLeft: '1px solid var(--border-strong)', paddingLeft: 14 }}>
            "Bryce moved through the corridor like she'd done it a thousand times before — because she had…"
          </p>
        </div>
        <div>
          <ProgressBar value={0.62}/>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <Btn variant="primary" icon={<Icon.Play s={11}/>}>Resume</Btn>
            <Btn variant="ghost" icon={<Icon.Filmstrip s={13}/>}>All scenes</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WebOnboarding — first-run flow, single page with stepped state
// ─────────────────────────────────────────────────────────────
function WebOnboarding({ artStyle = 'cinematic', LogoMark = window.LogoJump }) {
  const [step, setStep] = React.useState(2);
  const steps = [
    { n: '01', t: 'Welcome', s: 'Why we built this' },
    { n: '02', t: 'Your style', s: 'Pick a visual mood' },
    { n: '03', t: 'Spoiler safety', s: 'How far ahead?' },
    { n: '04', t: 'First book', s: 'Upload or pick a classic' },
  ];
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: 1080, fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        padding: '20px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}>
        <Lockup Mark={LogoMark} size={28} wmSize={15}/>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-mute)', letterSpacing: 1 }}>
          STEP {steps[step].n} OF 04
        </span>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, minHeight: 0 }}>
        {/* Left rail — step list */}
        <aside style={{
          padding: '50px 28px',
          borderRight: '1px solid var(--border)',
          background: 'var(--ink-800)',
        }}>
          {steps.map((s, i) => (
            <div key={i} onClick={() => setStep(i)} style={{
              padding: '14px 12px',
              cursor: 'pointer',
              borderRadius: 8,
              background: step === i ? 'rgba(201,169,106,0.08)' : 'transparent',
              opacity: i > step ? 0.45 : 1,
              marginBottom: 4,
              borderLeft: step === i ? '2px solid var(--accent)' : '2px solid transparent',
              paddingLeft: step === i ? 14 : 14,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: i <= step ? 'var(--accent)' : 'var(--text-mute)', letterSpacing: 1.5 }}>
                  {i < step ? '✓' : s.n}
                </span>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontWeight: 500 }}>{s.t}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{s.s}</div>
                </div>
              </div>
            </div>
          ))}
        </aside>

        {/* Right — content */}
        <main style={{ padding: '70px 64px', overflow: 'auto', maxWidth: 920 }}>
          {step === 0 && <OnbWelcome onNext={() => setStep(1)} artStyle={artStyle}/>}
          {step === 1 && <OnbStyle onNext={() => setStep(2)}/>}
          {step === 2 && <OnbSpoiler onNext={() => setStep(3)} artStyle={artStyle}/>}
          {step === 3 && <OnbFirstBook artStyle={artStyle}/>}
        </main>
      </div>
    </div>
  );
}

function OnbWelcome({ onNext, artStyle }) {
  return (
    <div>
      <Tag>A note before we begin</Tag>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 56, fontWeight: 500, lineHeight: 1.05, margin: '24px 0 18px', letterSpacing: -1, maxWidth: 700 }}>
        Reading is already cinematic. <span style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>We just paint the room.</span>
      </h1>
      <p style={{ fontSize: 15.5, color: 'var(--text-dim)', lineHeight: 1.65, maxWidth: 600 }}>
        Jump the Book reads alongside you and turns each scene into a still frame.
        Your books never leave your device. We only render what you've already read.
      </p>
      <div style={{ marginTop: 36, maxWidth: 600 }}>
        <SceneArt seed="onb-welcome" style={artStyle} ratio="16/9"
          cornerNote="Sample · Generated locally"
          label="A small workshop, a window, the smell of rain on warm pages."/>
      </div>
      <div style={{ marginTop: 36, display: 'flex', gap: 12, alignItems: 'center' }}>
        <Btn variant="primary" onClick={onNext}>Begin <Icon.Chevron s={12}/></Btn>
        <a style={{ fontSize: 12, color: 'var(--text-mute)', cursor: 'pointer' }}>I'm just looking around</a>
      </div>
    </div>
  );
}

function OnbStyle({ onNext }) {
  const [pick, setPick] = React.useState('cinematic');
  const styles = [
    { id: 'cinematic', name: 'Dark Cinematic', sub: 'Theatrical · moody lighting · 35mm grain' },
    { id: 'comic', name: 'Comic Panel', sub: 'Bold ink lines · halftone · saturated' },
    { id: 'watercolour', name: 'Watercolour', sub: 'Soft edges · paper texture · pastoral' },
    { id: 'storybook', name: 'Storybook Plate', sub: 'Etched · classical · sepia' },
  ];
  return (
    <div>
      <Tag>Visual style</Tag>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500, lineHeight: 1.1, margin: '24px 0 12px', letterSpacing: -0.6 }}>
        How would you like to <span style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>see</span> the story?
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', maxWidth: 520, lineHeight: 1.55, marginBottom: 32 }}>
        Pick a default mood. You can change this per book, or let scenes choose for themselves.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {styles.map(s => (
          <div key={s.id} onClick={() => setPick(s.id)} style={{
            cursor: 'pointer',
            background: 'var(--bg-card)',
            border: `1px solid ${pick === s.id ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 12,
            padding: 14,
            boxShadow: pick === s.id ? 'var(--glow-gold)' : 'none',
            transition: 'box-shadow .15s, border-color .15s',
          }}>
            <SceneArt seed={`style-${s.id}`} style={s.id === 'storybook' ? 'watercolour' : s.id} ratio="3/2"/>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 18, fontWeight: 500 }}>{s.name}</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-mute)', marginTop: 2 }}>{s.sub}</div>
              </div>
              <div style={{
                width: 18, height: 18, borderRadius: 999,
                border: `1.5px solid ${pick === s.id ? 'var(--accent)' : 'var(--border-strong)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {pick === s.id ? <div style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--accent)'}}/> : null}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 36 }}>
        <Btn variant="primary" onClick={onNext}>Continue <Icon.Chevron s={12}/></Btn>
      </div>
    </div>
  );
}

function OnbSpoiler({ onNext, artStyle }) {
  const [val, setVal] = React.useState(0.55);
  return (
    <div>
      <Tag><Icon.Spoiler s={9}/> Spoiler safety</Tag>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500, lineHeight: 1.1, margin: '24px 0 12px', letterSpacing: -0.6, maxWidth: 700 }}>
        Only paint the rooms <span style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>you've walked into.</span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-dim)', maxWidth: 540, lineHeight: 1.55, marginBottom: 36 }}>
        Drag the marker to set how far ahead we're allowed to peek. We never render scenes past your bookmark by default.
      </p>

      {/* Spoiler dial */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 14, padding: 28,
        maxWidth: 640,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily:'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 18 }}>
          <span>Page 1</span>
          <span style={{ color: 'var(--accent)' }}>★ Bookmark</span>
          <span>End</span>
        </div>
        <div style={{ position: 'relative', height: 36, marginBottom: 10 }}>
          {/* Track */}
          <div style={{ position: 'absolute', top: 17, left: 0, right: 0, height: 2, background: 'var(--ink-500)', borderRadius: 1 }}/>
          {/* Filled */}
          <div style={{ position: 'absolute', top: 17, left: 0, width: `${val*100}%`, height: 2, background: 'linear-gradient(90deg, var(--accent), var(--accent-hi))', borderRadius: 1 }}/>
          {/* Bookmark */}
          <div style={{ position: 'absolute', top: 9, left: '60%', width: 10, height: 18, background: 'var(--accent)', clipPath: 'polygon(0 0, 100% 0, 100% 70%, 50% 100%, 0 70%)' }}/>
          {/* Knob */}
          <div style={{ position: 'absolute', top: 8, left: `calc(${val*100}% - 11px)`, width: 22, height: 22, borderRadius: 999, background: 'var(--paper)', border: '2px solid var(--accent)', boxShadow: '0 4px 14px rgba(201,169,106,0.4)' }}/>
        </div>
        <input type="range" min="0" max="1" step="0.01" value={val} onChange={e => setVal(parseFloat(e.target.value))}
          style={{ width: '100%', appearance: 'none', background: 'transparent', height: 36, marginTop: -36, position: 'relative', zIndex: 2, opacity: 0, cursor: 'pointer' }}/>
        <div style={{ display: 'flex', gap: 24, marginTop: 22 }}>
          <SpoilerOption checked={val < 0.5} title="Strict" sub="Only behind the bookmark."/>
          <SpoilerOption checked={val >= 0.5 && val < 0.85} title="Chapter ahead" sub="Render up to one chapter past."/>
          <SpoilerOption checked={val >= 0.85} title="No limit" sub="Render the whole book."/>
        </div>
      </div>

      <div style={{ marginTop: 36 }}>
        <Btn variant="primary" onClick={onNext}>Continue <Icon.Chevron s={12}/></Btn>
      </div>
    </div>
  );
}

function SpoilerOption({ checked, title, sub }) {
  return (
    <div style={{ flex: 1, display: 'flex', gap: 10 }}>
      <div style={{
        width: 14, height: 14, borderRadius: 3, marginTop: 3,
        border: `1.5px solid ${checked ? 'var(--accent)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--accent)' : 'transparent',
        flexShrink: 0,
      }}/>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-mute)', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

function OnbFirstBook({ artStyle }) {
  return (
    <div>
      <Tag>Your first book</Tag>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 44, fontWeight: 500, lineHeight: 1.1, margin: '24px 0 30px', letterSpacing: -0.6 }}>
        Bring something you're <span style={{ fontStyle: 'italic', color: 'var(--accent-hi)' }}>already reading.</span>
      </h1>

      <div style={{
        border: '1.5px dashed var(--border-strong)',
        borderRadius: 14,
        padding: '46px 40px',
        textAlign: 'center',
        background: 'rgba(201,169,106,0.02)',
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 999,
          margin: '0 auto 16px',
          background: 'rgba(201,169,106,0.1)',
          border: '1px solid var(--border-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--accent)',
        }}>
          <Icon.Upload s={20}/>
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Drop in an EPUB, PDF, or TXT</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-mute)', maxWidth: 380, margin: '0 auto 22px', lineHeight: 1.5 }}>
          We parse everything in your browser. Your file never touches our servers.
        </div>
        <Btn variant="primary" icon={<Icon.Book s={13}/>}>Choose file</Btn>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
        <span style={{ fontFamily:'var(--font-mono)', fontSize: 10, color: 'var(--text-mute)', letterSpacing: 1.5 }}>OR START WITH A CLASSIC</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[
          ["Alice in Wonderland", "Carroll"],
          ["Dracula", "Stoker"],
          ["Frankenstein", "Shelley"],
          ["Sherlock Holmes", "Doyle"],
        ].map((b, i) => (
          <div key={i} style={{ cursor: 'pointer' }}>
            <BookCover title={b[0]} author={b[1]} height={170}/>
            <div style={{ fontSize: 12, fontWeight: 500, marginTop: 10 }}>{b[0]}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-mute)' }}>{b[1]}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { WebLibrary, WebOnboarding, WebTopNav });
