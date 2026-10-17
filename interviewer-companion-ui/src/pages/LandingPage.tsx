import { useEffect, useState } from 'react'
import '../styles/LandingPage.css'
import logo from '../assets/saarthi-logo.png'
import { useAuth } from '../auth/AuthContext'
import GoogleSignInButton from '../auth/GoogleSignInButton'

const SignInDialog = ({ onClose }: { onClose: () => void }) => {
  const { signIn } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const handleCredential = async (credential: string) => {
    setBusy(true)
    setError(null)
    try {
      await signIn(credential)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setBusy(false)
    }
  }

  return (
    <div className="signin-backdrop" onClick={onClose}>
      <div className="signin-dialog" role="dialog" aria-modal="true" aria-labelledby="signin-title" onClick={e => e.stopPropagation()}>
        <img src={logo} alt="" className="signin-logo" />
        <h2 id="signin-title">Welcome to Saarthi</h2>
        <p>Sign in with your Google account to continue.</p>
        <div className="signin-button-row" aria-busy={busy}>
          <GoogleSignInButton onCredential={handleCredential} />
        </div>
        {busy && <p className="signin-status">Signing you in…</p>}
        {error && <p className="signin-error" role="alert">{error}</p>}
        <button type="button" className="signin-cancel" onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

const LandingPage = () => {
  const [signInOpen, setSignInOpen] = useState(false)
  const onSignIn = () => setSignInOpen(true)
  const closeSignIn = () => setSignInOpen(false)

  return (
    <div className="saarthi-landing">

  <header>
    <div className="container nav">
      <a className="brand" href="#" aria-label="Saarthi home">
        <img src={logo} alt="" />
        <span>Saarthi</span>
      </a>
      <nav className="nav-links" aria-label="Main navigation">
        <a href="#features">Features</a>
        <a href="#who-its-for">Who it's for</a>
        <a href="#roadmap">What's next</a>
      </nav>
      <div className="nav-actions">
        
        <button type="button" className="btn btn-outline" onClick={onSignIn}>Log in</button>
        <button type="button" className="btn btn-primary" onClick={onSignIn}>Get started free <span aria-hidden="true">→</span></button>
      </div>
    </div>
  </header>

  <main>
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow">For individuals and teams</span>
          <h1>Organize. Prepare.<br />Do your best work.</h1>
          <p className="hero-copy">Keep the important things organized, find what you need quickly, and spend more time doing meaningful work. Start with a better way to manage interview questions.</p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={onSignIn}>Get started free <span aria-hidden="true">→</span></button>
            <button type="button" className="btn btn-outline" onClick={onSignIn}>Log in</button>
          </div>
          <div className="benefits">
            <div className="benefit"><span className="check">✓</span><span>Organize questions by role and topic</span></div>
            <div className="benefit"><span className="check">✓</span><span>Find the right questions in seconds</span></div>
            <div className="benefit"><span className="check">✓</span><span>Built for individuals and teams</span></div>
          </div>
        </div>

        <div className="product-window" aria-label="Preview of the Saarthi question management application">
          <div className="app-top">
            <img src={logo} alt="" />
            <span>Saarthi</span><span className="dots">•••</span>
          </div>
          <div className="app-body">
            <aside className="sidebar">
              <div className="side-item">⌂ &nbsp; Home</div>
              <div className="side-item">ⓘ &nbsp; All Questions</div>
              <div className="side-label">Categories</div>
              <div className="side-item">› &nbsp; AI</div>
              <div className="side-item">› &nbsp; Backend</div>
              <div className="side-item active">› &nbsp; Data Engineering</div>
              <div className="side-item">› &nbsp; Frontend</div>
              <div className="side-item" style={{ marginTop: 36, border: '1px dashed #56647c', textAlign: 'center' }}>+ Add Category</div>
            </aside>
            <div className="workspace">
              <div className="crumb">Home › Data Engineering</div>
              <div className="workspace-head"><h3>Data Engineering</h3><span className="count">42 questions</span></div>
              <div className="search-row"><div className="fake-search">⌕ &nbsp; Search questions...</div><div className="filter">All difficulties⌄</div><div className="filter">All types⌄</div></div>
              <div className="question-table">
                <div className="table-head"><span>#</span><span>Title</span><span>Type</span><span>Difficulty</span></div>
                <div className="table-row"><span>1</span><span className="q-title">Explain the difference between batch and streaming</span><span className="type">Conceptual</span><span className="pill">Medium</span></div>
                <div className="table-row"><span>2</span><span className="q-title">Design a scalable data pipeline for e-commerce data</span><span className="type">System design</span><span className="pill" style={{ background: "#ffe8e8", color: "#c83c3c" }}>Hard</span></div>
                <div className="table-row"><span>3</span><span className="q-title">How do you handle slowly changing dimensions?</span><span className="type">Scenario</span><span className="pill">Medium</span></div>
                <div className="table-row"><span>4</span><span className="q-title">What is a data lake? When would you use it?</span><span className="type">Conceptual</span><span className="pill" style={{ background: "#ddf8e8", color: "#16764d" }}>Easy</span></div>
                <div className="table-row"><span>5</span><span className="q-title">Explain partitioning strategies in big data systems</span><span className="type">Conceptual</span><span className="pill">Medium</span></div>
              </div>
              <div className="new-q"><span>＋ New question</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="features" id="features">
      <div className="container feature-grid">
        <article className="feature"><div className="feature-icon purple">▤</div><h3>Curated question bank</h3><p>Create and manage questions by topic, role, difficulty, and more.</p></article>
        <article className="feature"><div className="feature-icon blue">⌕</div><h3>Find instantly</h3><p>Search and filter to get to the right questions quickly.</p></article>
        <article className="feature"><div className="feature-icon green">◇</div><h3>Organize your way</h3><p>Use categories and collections that fit your workflow.</p></article>
        <article className="feature" id="who-its-for"><div className="feature-icon orange">♧</div><h3>Built for teams</h3><p>Build a more consistent approach to interviews across your team.</p></article>
      </div>
    </section>

    <section className="container" id="roadmap">
      <div className="roadmap">
        <div>
          <div className="section-kicker">Built for what's next</div>
          <h2>More than a question bank.</h2>
          <p className="roadmap-copy">Interview question management is the beginning. Saarthi can grow into a broader toolkit to help you prepare, organize, and do your best work.</p>
          <a className="text-link" href="#roadmap">Explore the roadmap →</a>
        </div>
        <div className="future-grid">
          <article className="future-card"><div className="future-top"><div className="future-icon purple">✦</div><span className="soon">Coming soon</span></div><h3>AI question generation</h3><p>Generate role-specific questions with less effort.</p></article>
          <article className="future-card"><div className="future-top"><div className="future-icon blue">▤</div><span className="soon">Coming soon</span></div><h3>Interview templates</h3><p>Reusable structures for different roles and levels.</p></article>
          <article className="future-card"><div className="future-top"><div className="future-icon orange">▣</div><span className="soon">Coming soon</span></div><h3>Evaluation guides</h3><p>Structured criteria to support consistent assessments.</p></article>
          <article className="future-card"><div className="future-top"><div className="future-icon green">▥</div><span className="soon">Coming soon</span></div><h3>Insights and analytics</h3><p>Understand patterns and improve your process.</p></article>
        </div>
      </div>
    </section>

    <section className="container values">
      <div className="value"><div className="value-icon">◷</div><div><strong>Save time</strong><span>Spend less time searching, more time on the work that matters.</span></div></div>
      <div className="value"><div className="value-icon">◎</div><div><strong>Work consistently</strong><span>Use structured, high-quality questions across your team.</span></div></div>
      <div className="value"><div className="value-icon">♧</div><div><strong>Make better decisions</strong><span>Stay organized and focus on what matters.</span></div></div>
      <div className="value"><div className="value-icon">♢</div><div><strong>Built with care</strong><span>A clear, practical experience that stays out of your way.</span></div></div>
    </section>

    <section className="cta">
      <div className="container cta-inner">
        <div><h2>Ready to get started?</h2><p>Join individuals and teams using Saarthi to stay organized<br className="desktop-break" /> and do their best work.</p></div>
        <div className="cta-actions"><button type="button" className="btn btn-primary" onClick={onSignIn}>Get started free →</button><button type="button" className="btn btn-outline" onClick={onSignIn}>Log in</button></div>
      </div>
    </section>
  </main>

  <footer>
    <div className="container footer-inner">
      <a className="footer-brand" href="#"><img src={logo} alt="" /><span>Saarthi<small>Your companion for getting things done.</small></span></a>
      <nav className="footer-links" aria-label="Footer navigation"><a href="#features">Features</a><a href="#roadmap">Roadmap</a><a href="#">Privacy</a><a href="#">Contact</a></nav>
    </div>
  </footer>
      {signInOpen && <SignInDialog onClose={closeSignIn} />}
    </div>
  )
}

export default LandingPage
