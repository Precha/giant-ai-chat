'use client'

import { useState, useEffect } from 'react'

const PLATFORMS = [
  {
    id: 'web',
    label: 'Custom Website',
    code: `<script src="https://YOUR-URL.vercel.app/widget.js"></script>
<giant-chat
  api-url="https://YOUR-URL.vercel.app/api/chat"
  platform="web"
  market="US"
  lang="en"
></giant-chat>`,
  },
  {
    id: 'shopify',
    label: 'Shopify',
    code: `{{! Add to theme.liquid before </body> }}
<script src="https://YOUR-URL.vercel.app/widget.js"></script>
<giant-chat
  api-url="https://YOUR-URL.vercel.app/api/chat"
  platform="shopify"
  market="{{ shop.metafields.market.value | default: 'US' }}"
  lang="{{ request.locale.iso_code }}"
></giant-chat>`,
  },
  {
    id: 'sfcc',
    label: 'SFCC',
    code: `<!-- Add to htmlHead.isml -->
<script src="https://YOUR-URL.vercel.app/widget.js"></script>
<giant-chat
  api-url="https://YOUR-URL.vercel.app/api/chat"
  platform="sfcc"
  market="\${pdict.currentLocale.country}"
  lang="\${pdict.currentLocale.language}"
></giant-chat>`,
  },
]

const RUSH_MARK = (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="28" height="28" fill="white">
    <path d="M5.1 4.1 L6.8 8.6 C6.82 8.64 6.88 8.65 6.91 8.62 L10.4 5.3 C10.45 5.25 10.53 5.31 10.51 5.38 L6.9 14.8 C6.88 14.86 6.8 14.86 6.78 14.8 L1.6 1.3 C1.58 1.26 1.61 1.21 1.66 1.21 L12.1 1.21 C12.15 1.21 12.18 1.26 12.16 1.3 L11.07 4.15 C11.06 4.18 11.03 4.2 11 4.2 L5.25 4.2 C5.2 4.2 5.17 4.25 5.19 4.29 Z" />
  </svg>
)

export default function DemoPage() {
  const [activePlatform, setActivePlatform] = useState('web')
  const platform = PLATFORMS.find(p => p.id === activePlatform)!

  useEffect(() => {
    const script = document.createElement('script')
    script.src = '/widget.js'
    script.onload = () => {
      if (!document.querySelector('giant-chat')) {
        const widget = document.createElement('giant-chat')
        widget.setAttribute('api-url', '/api/chat')
        widget.setAttribute('platform', 'web')
        widget.setAttribute('market', 'US')
        widget.setAttribute('lang', 'en')
        document.body.appendChild(widget)
      }
    }
    document.body.appendChild(script)
    return () => {
      document.querySelector('giant-chat')?.remove()
      script.remove()
    }
  }, [])

  return (
    <>
      <style>{`
        @font-face { font-family:'Overpass'; src:url('/fonts/overpass-bold.ttf') format('truetype'); font-weight:700; }
        @font-face { font-family:'Overpass'; src:url('/fonts/overpass-semibold.ttf') format('truetype'); font-weight:600; }
        @font-face { font-family:'Overpass'; src:url('/fonts/overpass-regular.ttf') format('truetype'); font-weight:400; }
        @font-face { font-family:'Open Sans'; src:url('/fonts/OpenSans-Regular.ttf') format('truetype'); font-weight:400; }
        @font-face { font-family:'Open Sans'; src:url('/fonts/OpenSans-SemiBold.ttf') format('truetype'); font-weight:600; }

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: rgb(242,242,242); }

        .nav {
          background: rgb(24,22,22);
          height: 64px;
          display: flex;
          align-items: center;
          padding: 0 48px;
          gap: 12px;
        }
        .nav-title {
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .hero {
          background: rgb(24,22,22);
          padding: 56px 48px 64px;
          color: white;
        }
        .hero-eyebrow {
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.45);
          margin-bottom: 16px;
        }
        .hero-title {
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: clamp(32px, 4vw, 48px);
          line-height: 1.1;
          color: white;
          margin-bottom: 16px;
          max-width: 640px;
        }
        .hero-sub {
          font-family: 'Open Sans', sans-serif;
          font-size: 16px;
          line-height: 1.6;
          color: rgba(255,255,255,0.65);
          max-width: 560px;
          margin-bottom: 32px;
        }
        .hero-badges {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .badge {
          padding: 5px 14px;
          border: 1.5px solid rgba(255,255,255,0.25);
          border-radius: 32px;
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 12px;
          color: rgba(255,255,255,0.7);
        }

        .content {
          max-width: 960px;
          margin: 0 auto;
          padding: 56px 48px;
        }

        .section-title {
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 28px;
          color: rgb(0,0,0);
          margin-bottom: 8px;
        }
        .section-sub {
          font-family: 'Open Sans', sans-serif;
          font-size: 15px;
          color: rgb(88,98,110);
          line-height: 1.6;
          margin-bottom: 32px;
        }

        .platform-tabs {
          display: flex;
          gap: 0;
          border-bottom: 2px solid rgb(222,222,224);
          margin-bottom: 0;
        }
        .tab {
          padding: 10px 20px;
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 13px;
          color: rgb(88,98,110);
          cursor: pointer;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }
        .tab.active {
          color: rgb(0,80,252);
          border-bottom-color: rgb(0,80,252);
        }

        .code-block {
          background: rgb(16,17,18);
          border-radius: 0 0 8px 8px;
          padding: 20px 24px;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.7;
          color: rgb(226,226,239);
          white-space: pre;
          overflow-x: auto;
          margin-bottom: 48px;
        }

        .features {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 56px;
        }
        .feature-card {
          background: white;
          border-radius: 8px;
          padding: 20px 24px;
          box-shadow: 4px 4px 24px rgba(0,0,0,0.05);
        }
        .feature-icon {
          font-size: 22px;
          margin-bottom: 10px;
        }
        .feature-title {
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 14px;
          color: rgb(0,0,0);
          margin-bottom: 6px;
        }
        .feature-desc {
          font-family: 'Open Sans', sans-serif;
          font-size: 13px;
          color: rgb(88,98,110);
          line-height: 1.5;
        }

        .deploy-row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 24px;
          background: rgb(6,3,141);
          color: white;
          border-radius: 32px;
          border: none;
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          cursor: pointer;
        }
        .btn-secondary {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: 2px solid rgb(6,3,141);
          color: rgb(6,3,141);
          border-radius: 32px;
          background: transparent;
          font-family: 'Overpass', sans-serif;
          font-weight: 700;
          font-size: 13px;
          text-decoration: none;
          cursor: pointer;
        }
        .footnote {
          font-family: 'Open Sans', sans-serif;
          font-size: 12px;
          color: rgb(88,98,110);
          margin-top: 12px;
        }
        code {
          background: rgb(235,235,235);
          border-radius: 4px;
          padding: 1px 6px;
          font-size: 12px;
          font-family: monospace;
        }
      `}</style>

      {/* Nav */}
      <nav className="nav">
        {RUSH_MARK}
        <span className="nav-title">AI Chat Widget</span>
      </nav>

      {/* Hero */}
      <div className="hero">
        <div className="hero-eyebrow">Open Source Demo</div>
        <h1 className="hero-title">Giant AI Chat Widget</h1>
        <p className="hero-sub">
          Add AI-powered bike assistance to any website with a single script tag.
          Recommends products, locates nearby dealers, and streams responses in real time.
        </p>
        <div className="hero-badges">
          <span className="badge">Custom Website</span>
          <span className="badge">Shopify</span>
          <span className="badge">Salesforce Commerce Cloud</span>
        </div>
      </div>

      {/* Main content */}
      <div className="content">

        {/* Features */}
        <div className="features">
          {[
            { icon: '🚴', title: 'Product recommendations', desc: 'Searches Giant, Liv, and Momentum bikes by budget, type, and use case.' },
            { icon: '📍', title: 'Dealer finder', desc: 'Locates nearby dealers by city, state, or GPS — with directions and contact info.' },
            { icon: '⚡', title: 'Streaming responses', desc: 'Powered by Claude claude-sonnet-4-6 with real-time text streaming.' },
            { icon: '🔌', title: 'Universal embed', desc: 'One script tag. Works in any framework, platform, or plain HTML.' },
          ].map(f => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <div className="feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Embed code */}
        <h2 className="section-title">Embed on your website</h2>
        <p className="section-sub">Copy the snippet for your platform and paste before <code>&lt;/body&gt;</code>. Replace <code>YOUR-URL</code> with your deployed Vercel URL.</p>

        <div className="platform-tabs">
          {PLATFORMS.map(p => (
            <button
              key={p.id}
              className={`tab${activePlatform === p.id ? ' active' : ''}`}
              onClick={() => setActivePlatform(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="code-block">{platform.code}</div>

        {/* Deploy */}
        <h2 className="section-title">Deploy your own</h2>
        <p className="section-sub">Fork the repo, add your Anthropic API key, and deploy to Vercel in under two minutes.</p>

        <div className="deploy-row">
          <a
            className="btn-primary"
            href="https://vercel.com/new/clone?repository-url=https://github.com/YOUR_GITHUB/giant-ai-chat&env=ANTHROPIC_API_KEY&envDescription=Get%20your%20key%20at%20console.anthropic.com"
            target="_blank"
            rel="noopener"
          >
            ▲ Deploy to Vercel
          </a>
          <a
            className="btn-secondary"
            href="https://github.com/YOUR_GITHUB/giant-ai-chat"
            target="_blank"
            rel="noopener"
          >
            View on GitHub
          </a>
        </div>
        <p className="footnote">Requires an Anthropic API key. Estimated cost: $10–80/month for typical demo traffic.</p>
      </div>

    </>
  )
}
