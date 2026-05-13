/* Giant AI Chat Widget — Web Component
 * Embed: <script src="widget.js"></script>
 *        <giant-chat api-url="https://..." platform="web" market="US" lang="en"></giant-chat>
 */
(function () {
  const RUSH_MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22" width="22" height="22" fill="white">
    <path d="M5.1 4.1 L6.8 8.6 C6.82 8.64 6.88 8.65 6.91 8.62 L10.4 5.3 C10.45 5.25 10.53 5.31 10.51 5.38 L6.9 14.8 C6.88 14.86 6.8 14.86 6.78 14.8 L1.6 1.3 C1.58 1.26 1.61 1.21 1.66 1.21 L12.1 1.21 C12.15 1.21 12.18 1.26 12.16 1.3 L11.07 4.15 C11.06 4.18 11.03 4.2 11 4.2 L5.25 4.2 C5.2 4.2 5.17 4.25 5.19 4.29 Z"/>
  </svg>`

  const CHAT_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`

  const SEND_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`

  const PIN_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`

  const PHONE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.23h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.87a16 16 0 0 0 6.29 6.29l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`

  const LINK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`

  const QUICK_CHIPS = [
    'Find an e-bike under $3,000',
    'Best mountain bikes',
    'Find a dealer near me',
    "Liv women's bikes",
    'Bikes for beginners',
  ]

  const CSS = `
    @font-face { font-family:'Overpass'; src:url('/fonts/overpass-bold.ttf') format('truetype'); font-weight:700; }
    @font-face { font-family:'Overpass'; src:url('/fonts/overpass-semibold.ttf') format('truetype'); font-weight:600; }
    @font-face { font-family:'Overpass'; src:url('/fonts/overpass-regular.ttf') format('truetype'); font-weight:400; }
    @font-face { font-family:'Open Sans'; src:url('/fonts/OpenSans-Regular.ttf') format('truetype'); font-weight:400; }
    @font-face { font-family:'Open Sans'; src:url('/fonts/OpenSans-SemiBold.ttf') format('truetype'); font-weight:600; }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :host {
      --blue: rgb(6,3,141);
      --blue-active: rgb(0,80,252);
      --dark: rgb(24,22,22);
      --grey-bg: rgb(242,242,242);
      --grey-border: rgb(222,222,224);
      --text: rgb(0,0,0);
      --muted: rgb(88,98,110);
      --white: #fff;
      --shadow: 4px 4px 24px rgba(0,0,0,0.12);
      font-family: 'Open Sans', sans-serif;
    }

    #launcher {
      position: fixed; bottom: 24px; right: 24px;
      width: 56px; height: 56px; border-radius: 50%;
      background: var(--blue); border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 16px rgba(6,3,141,0.4);
      z-index: 9999; transition: transform 0.15s ease;
    }
    #launcher:hover { transform: scale(1.06); }

    #panel {
      position: fixed; bottom: 92px; right: 24px;
      width: 360px;
      height: 550px;
      max-height: calc(100vh - 120px);
      border-radius: 8px;
      overflow: hidden; box-shadow: var(--shadow);
      background: var(--white); display: flex; flex-direction: column;
      z-index: 9998; transform: translateY(12px); opacity: 0;
      pointer-events: none; transition: opacity 0.2s ease, transform 0.2s ease;
    }
    #panel.open { transform: translateY(0); opacity: 1; pointer-events: all; }

    #header {
      background: #05038D; padding: 12px 14px;
      display: flex; align-items: center; justify-content: space-between; flex-shrink: 0;
    }
    #header-left { display: flex; align-items: center; gap: 10px; }
    #header-title { font-family:'Overpass',sans-serif; font-weight:700; font-size:13px; color:var(--white); }
    #header-sub { font-family:'Open Sans',sans-serif; font-size:11px; color:rgba(255,255,255,0.5); margin-top:1px; }
    #close-btn {
      width:26px; height:26px; border:1.5px solid rgba(255,255,255,0.3);
      border-radius:50%; background:transparent; color:white;
      font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center;
    }

    #messages {
      flex:1; overflow-y:auto; padding:14px 14px 20px;
      display:flex; flex-direction:column; gap:10px;
      background:var(--grey-bg); scroll-behavior:smooth;
    }
    #messages::-webkit-scrollbar { width:4px; }
    #messages::-webkit-scrollbar-thumb { background:var(--grey-border); border-radius:2px; }

    .msg {
      max-width:85%; font-family:'Open Sans',sans-serif;
      font-size:13px; line-height:20px; padding:10px 13px;
      border-radius:8px; word-wrap:break-word;
    }
    .msg-ai { background:var(--white); color:var(--text); align-self:flex-start; border:1px solid var(--grey-border); }
    .msg-user { background:var(--blue); color:var(--white); align-self:flex-end; }

    .typing {
      background:var(--white); border:1px solid var(--grey-border);
      border-radius:8px; align-self:flex-start;
      padding:12px 16px; display:flex; gap:5px; align-items:center;
    }
    .dot {
      width:7px; height:7px; background:var(--blue);
      border-radius:50%; animation:bounce 1.2s ease-in-out infinite;
    }
    .dot:nth-child(2) { animation-delay:0.2s; }
    .dot:nth-child(3) { animation-delay:0.4s; }
    @keyframes bounce {
      0%,80%,100% { transform:translateY(0); opacity:0.4; }
      40% { transform:translateY(-5px); opacity:1; }
    }

    .product-card {
      background:var(--white); border:1.5px solid var(--grey-border);
      border-radius:8px; overflow:hidden; margin-top:8px;
      font-family:'Open Sans',sans-serif; font-size:12px;
    }
    .product-card img {
      width:100%; height:120px; object-fit:contain;
      background:var(--white); display:block; padding:6px;
    }
    .product-card-body { padding:10px 12px 12px; border-top:1px solid var(--grey-border); }
    .product-card-name { font-family:'Overpass',sans-serif; font-weight:700; font-size:13px; color:var(--text); margin-bottom:2px; }
    .product-card-desc { font-family:'Open Sans',sans-serif; font-size:11px; color:var(--muted); line-height:1.5; margin-bottom:10px; }
    .product-card-price { font-family:'Open Sans',sans-serif; font-weight:600; font-size:13px; color:var(--blue); margin-bottom:8px; }
    .product-card-link {
      display:inline-flex; align-items:center; gap:4px;
      padding:5px 12px; border:1.5px solid var(--blue);
      color:var(--blue); border-radius:32px;
      font-family:'Overpass',sans-serif; font-weight:700; font-size:11px;
      text-decoration:none; cursor:pointer;
    }

    .dealer-card {
      background:var(--white); border:1.5px solid var(--grey-border);
      border-radius:8px; overflow:hidden; margin-top:8px;
    }
    .dealer-card-body { padding:10px 12px; }
    .dealer-card-header { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:3px; }
    .dealer-name { font-family:'Overpass',sans-serif; font-weight:700; font-size:13px; color:var(--text); line-height:1.3; }
    .dealer-distance {
      font-family:'Overpass',sans-serif; font-weight:700; font-size:10px;
      color:var(--blue); background:rgba(6,3,141,0.07);
      border-radius:32px; padding:2px 8px; white-space:nowrap; flex-shrink:0;
    }
    .dealer-address { font-size:12px; color:var(--muted); line-height:1.5; margin-bottom:8px; }
    .dealer-campaigns { display:flex; gap:5px; flex-wrap:wrap; margin-bottom:8px; }
    .dealer-campaign-badge {
      font-family:'Overpass',sans-serif; font-weight:700; font-size:10px;
      padding:2px 8px; border-radius:32px;
      background:rgba(6,3,141,0.07); color:var(--blue);
    }
    .dealer-actions { display:flex; gap:6px; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--grey-border); }
    .dealer-btn {
      display:inline-flex; align-items:center; gap:4px;
      padding:5px 10px; border-radius:32px;
      font-family:'Overpass',sans-serif; font-weight:700; font-size:11px;
      cursor:pointer; text-decoration:none; border:none;
    }
    .dealer-btn-primary { background:var(--blue); color:white; }
    .dealer-btn-secondary { border:1.5px solid var(--grey-border); color:var(--muted); background:transparent; }

    #chips-section { background:var(--white); flex-shrink:0; border-top:1px solid var(--grey-border); }
    #chips-toggle {
      width:100%; display:flex; align-items:center; justify-content:space-between;
      padding:11px 14px 8px; background:transparent; border:none; cursor:pointer;
    }
    #chips-toggle-label {
      font-family:'Overpass',sans-serif; font-weight:700; font-size:11px;
      color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;
    }
    #chips-arrow {
      font-size:10px; color:var(--muted); transition:transform 0.2s ease;
      display:inline-block;
    }
    #chips-arrow.collapsed { transform:rotate(-90deg); }
    #chips {
      padding:0 14px 10px; background:var(--white);
      display:flex; gap:6px; flex-wrap:wrap;
      overflow:hidden; max-height:200px; transition:max-height 0.2s ease, padding 0.2s ease;
    }
    #chips.collapsed { max-height:0; padding-bottom:0; }
    .chip {
      display:inline-flex; align-items:center; padding:5px 11px;
      border:1.5px solid var(--blue); color:var(--blue); border-radius:32px;
      font-family:'Overpass',sans-serif; font-weight:700; font-size:11px;
      cursor:pointer; white-space:nowrap; background:transparent;
    }
    .chip:hover { background:rgba(6,3,141,0.05); }

    #input-area {
      padding:10px 14px 14px; background:var(--white);
      display:flex; gap:8px; align-items:center;
      border-top:1px solid var(--grey-border); flex-shrink:0;
    }
    #input {
      flex:1; background:var(--grey-bg); border:1.5px solid var(--grey-border);
      border-radius:32px; padding:9px 15px;
      font-family:'Open Sans',sans-serif; font-size:13px; color:var(--text); outline:none;
    }
    #input:focus { border-color:var(--blue); }
    #send-btn {
      width:38px; height:38px; border-radius:50%; background:var(--blue);
      border:none; display:flex; align-items:center; justify-content:center;
      cursor:pointer; flex-shrink:0;
    }
    #send-btn:disabled { opacity:0.5; cursor:default; }

    @media (max-width:420px) {
      #panel { width:calc(100vw - 16px); right:8px; bottom:80px; }
      #launcher { right:16px; bottom:16px; }
    }
  `

  class GiantChat extends HTMLElement {
    constructor() {
      super()
      this._shadow = this.attachShadow({ mode: 'open' })
      this._apiUrl = ''
      this._platform = 'web'
      this._market = 'US'
      this._lang = 'en'
      this._sessionId = 'gs_' + Math.random().toString(36).slice(2)
      this._isOpen = false
      this._isLoading = false
      this._messages = []
      this._chipsCollapsed = false
    }

    connectedCallback() {
      this._apiUrl = this.getAttribute('api-url') || '/api/chat'
      this._platform = this.getAttribute('platform') || 'web'
      this._market = this.getAttribute('market') || 'US'
      this._lang = this.getAttribute('lang') || 'en'
      this._render()
    }

    _render() {
      this._shadow.innerHTML = `
        <style>${CSS}</style>
        <button id="launcher" aria-label="Open Giant AI Chat">${CHAT_ICON}</button>
        <div id="panel" role="dialog" aria-label="Giant AI Chat">
          <div id="header">
            <div id="header-left">
              ${RUSH_MARK_SVG}
              <div>
                <div id="header-title">AI Assistant</div>
                <div id="header-sub">Giant Bicycles US</div>
              </div>
            </div>
            <button id="close-btn" aria-label="Close chat">×</button>
          </div>
          <div id="messages"></div>
          <div id="chips-section">
            <button id="chips-toggle" aria-label="Toggle quick questions">
              <span id="chips-toggle-label">Quick questions</span>
              <span id="chips-arrow">▾</span>
            </button>
            <div id="chips">
              ${QUICK_CHIPS.map(c => `<button class="chip">${c}</button>`).join('')}
            </div>
          </div>
          <div id="input-area">
            <input id="input" type="text" placeholder="Ask about bikes or dealers..." maxlength="500" />
            <button id="send-btn" aria-label="Send">${SEND_ICON}</button>
          </div>
        </div>
      `
      this._attachEvents()
      if (this._messages.length === 0) {
        this._addAiMessage("Hi! I'm Giant's AI assistant. I can help you find the perfect bike, gear, or a dealer near you. What are you looking for?")
      }
      this._renderMessages()
    }

    _attachEvents() {
      this._shadow.getElementById('launcher').addEventListener('click', () => this._togglePanel())
      this._shadow.getElementById('close-btn').addEventListener('click', () => this._togglePanel(false))
      this._shadow.getElementById('send-btn').addEventListener('click', () => this._handleSend())
      this._shadow.getElementById('input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this._handleSend() }
      })
      this._shadow.getElementById('chips-toggle').addEventListener('click', () => this._toggleChips())
      this._shadow.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const text = chip.textContent.trim()
          if (text) this._sendMessage(text)
        })
      })
    }

    _toggleChips() {
      this._chipsCollapsed = !this._chipsCollapsed
      this._shadow.getElementById('chips').classList.toggle('collapsed', this._chipsCollapsed)
      this._shadow.getElementById('chips-arrow').classList.toggle('collapsed', this._chipsCollapsed)
    }

    _togglePanel(open) {
      this._isOpen = open !== undefined ? open : !this._isOpen
      this._shadow.getElementById('panel').classList.toggle('open', this._isOpen)
      if (this._isOpen) {
        setTimeout(() => this._shadow.getElementById('input')?.focus(), 200)
      }
    }

    _addAiMessage(text, cards) {
      this._messages.push({ role: 'ai', text, cards })
      this._renderMessages()
    }

    _addUserMessage(text) {
      this._messages.push({ role: 'user', text })
      this._renderMessages()
    }

    _renderMessages() {
      const container = this._shadow.getElementById('messages')
      if (!container) return
      container.innerHTML = this._messages.map(m => this._renderMessage(m)).join('')
      container.scrollTop = container.scrollHeight
    }

    _renderMessage(m) {
      if (m.role === 'user') {
        return `<div class="msg msg-user">${this._escape(m.text)}</div>`
      }

      let cardsHtml = ''
      if (m.cards && m.cards.type === 'products') {
        cardsHtml = m.cards.items.map(p => {
          const price = p.price === p.priceMax
            ? `$${p.price.toLocaleString()}`
            : `$${p.price.toLocaleString()}–$${p.priceMax.toLocaleString()}`
          const stockLabel = p.inStock ? '' : '<span style="color:#cd0000;font-size:11px"> · Out of stock</span>'
          return `
            <div class="product-card">
              ${p.imageUrl ? `<img src="${this._escape(p.imageUrl)}" alt="${this._escape(p.name)}" loading="lazy" />` : ''}
              <div class="product-card-body">
                <div class="product-card-name">${this._escape(p.name)}</div>
                <div class="product-card-price">${price}${stockLabel}</div>
                ${p.description ? `<div class="product-card-desc">${this._escape(p.description)}</div>` : ''}
                <a class="product-card-link" href="${this._escape(p.productUrl)}" target="_blank" rel="noopener">View details →</a>
              </div>
            </div>`
        }).join('')
      } else if (m.cards && m.cards.type === 'dealers') {
        cardsHtml = m.cards.items.map(d => {
          const dist = d.distanceMi != null ? `${d.distanceMi.toFixed(1)} mi` : ''
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.address)}`
          const telUrl = d.phone ? `tel:${d.phone.replace(/\D/g, '')}` : ''
          const webUrl = d.url ? (d.url.startsWith('http') ? d.url : 'https://' + d.url) : ''
          return `
            <div class="dealer-card">
              <div class="dealer-card-body">
                <div class="dealer-card-header">
                  <div class="dealer-name">${this._escape(d.name)}</div>
                  ${dist ? `<div class="dealer-distance">${dist}</div>` : ''}
                </div>
                <div class="dealer-address">${this._escape(d.address)}</div>
                ${d.campaigns && d.campaigns.length ? `<div class="dealer-campaigns">${d.campaigns.map(c => `<span class="dealer-campaign-badge">${this._escape(c)}</span>`).join('')}</div>` : ''}
                <div class="dealer-actions">
                  <a class="dealer-btn dealer-btn-primary" href="${mapsUrl}" target="_blank" rel="noopener">${PIN_ICON} Get directions</a>
                  ${telUrl ? `<a class="dealer-btn dealer-btn-secondary" href="${telUrl}">${PHONE_ICON} Call</a>` : ''}
                  ${webUrl ? `<a class="dealer-btn dealer-btn-secondary" href="${webUrl}" target="_blank" rel="noopener">${LINK_ICON} Website</a>` : ''}
                </div>
              </div>
            </div>`
        }).join('')
      }

      // When cards exist: always show cards first, text below
      if (cardsHtml) {
        const products = (m.cards && m.cards.type === 'products') ? m.cards.items : []
        const textHtml = m.text
          ? `<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--grey-border);font-size:12px;color:var(--muted)">${this._linkifyProducts(this._renderMarkdown(m.text), products)}</div>`
          : ''
        return `<div class="msg msg-ai" style="max-width:95%">${cardsHtml}${textHtml}</div>`
      }

      return `<div class="msg msg-ai" style="max-width:95%">${this._renderMarkdown(m.text)}</div>`
    }

    _handleSend() {
      const input = this._shadow.getElementById('input')
      const text = input.value.trim()
      if (!text || this._isLoading) return
      input.value = ''
      this._sendMessage(text)
    }

    async _sendMessage(text) {
      this._togglePanel(true)
      this._addUserMessage(text)
      // Collapse quick questions after first user message
      if (!this._chipsCollapsed) this._toggleChips()
      this._setLoading(true)

      const messages = this._shadow.getElementById('messages')
      const typingEl = document.createElement('div')
      typingEl.className = 'typing'
      typingEl.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>'
      messages.appendChild(typingEl)
      messages.scrollTop = messages.scrollHeight

      let userLat, userLng
      if (text.toLowerCase().includes('near me') && navigator.geolocation) {
        try {
          const pos = await new Promise((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
          )
          userLat = pos.coords.latitude
          userLng = pos.coords.longitude
        } catch (_) { /* ignore */ }
      }

      let aiText = ''

      try {
        const resp = await fetch(this._apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            sessionId: this._sessionId,
            platform: this._platform,
            market: this._market,
            lang: this._lang,
            userLat,
            userLng,
            // Send last 4 messages (excluding current) for context
            history: this._messages.slice(-5, -1).map(m => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.text || '(shown as cards)',
            })),
          }),
        })

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`)

        typingEl.remove()
        this._messages.push({ role: 'ai', text: '', cards: null })
        const msgIdx = this._messages.length - 1
        this._renderMessages()

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') break
            try {
              const parsed = JSON.parse(payload)
              if (parsed.structured) {
                this._messages[msgIdx].cards = parsed.structured
              } else if (parsed.text) {
                aiText += parsed.text
                this._messages[msgIdx].text = aiText
              }
              this._renderMessages()
            } catch (_) { /* skip */ }
          }
        }
      } catch (_) {
        typingEl.remove()
        this._addAiMessage("Sorry, I'm having trouble connecting. Please try again in a moment.")
      } finally {
        this._setLoading(false)
      }
    }

    _setLoading(loading) {
      this._isLoading = loading
      const sendBtn = this._shadow.getElementById('send-btn')
      const input = this._shadow.getElementById('input')
      if (sendBtn) sendBtn.disabled = loading
      if (input) input.disabled = loading
    }

    _escape(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    _renderMarkdown(str) {
      return this._escape(str)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\n/g, '<br>')
    }

    _linkifyProducts(html, products) {
      if (!products || !products.length) return html
      for (const p of products) {
        if (!p.name || !p.productUrl) continue
        const escapedUrl = this._escape(p.productUrl)

        // Build short name by stripping from the first descriptor/type word onwards
        // e.g. "Breakaway Short Sleeve Jersey" → "Breakaway"
        //      "Rev Pro MIPS Mens Helmet"      → "Rev Pro MIPS"
        //      "Scout Womens Jersey"            → "Scout"
        const shortName = p.name.replace(/\s+(?:short|long|3\/4|full|sleeve|mens?|womens?|youth|unisex|road|mtb|gravel|trail|helmet|bike|bicycle|jersey|gloves?|shoes?|saddle|shorts?|tights?|bib|socks?|pad|pant|jacket|vest|base\s+layer).*$/i, '').trim()
        const candidates = [...new Set([p.name, shortName].filter(Boolean))]
          .sort((a, b) => b.length - a.length) // longest first to avoid partial replacement

        for (const name of candidates) {
          const escaped = this._escape(name)
          const rePattern = escaped.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          const linked = `<a href="${escapedUrl}" target="_blank" rel="noopener" style="color:var(--blue);font-weight:600;text-decoration:none;">${escaped}</a>`
          const replaced = html.replace(new RegExp(rePattern, 'gi'), linked)
          if (replaced !== html) { html = replaced; break } // stop at first match
        }
      }
      return html
    }
  }

  if (!customElements.get('giant-chat')) {
    customElements.define('giant-chat', GiantChat)
  }
})()
