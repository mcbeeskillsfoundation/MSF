/**
 * MCBEE Skills Foundation — Content Management
 * Text content → localStorage (small, fast)
 * Images       → IndexedDB (large blobs, no size limit)
 */

/* ── ImageDB — IndexedDB wrapper for image blobs ── */
const ImageDB = {
  DB_NAME: 'msf_images',
  VERSION: 1,
  STORE:   'images',

  _db: null,

  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.DB_NAME, this.VERSION);
      req.onupgradeneeded = e => e.target.result.createObjectStore(this.STORE);
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror   = e => reject(e.target.error);
    });
  },

  async set(key, blob) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).put(blob, key);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  },

  async get(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const req = db.transaction(this.STORE, 'readonly').objectStore(this.STORE).get(key);
      req.onsuccess = e => resolve(e.target.result || null);
      req.onerror   = e => reject(e.target.error);
    });
  },

  async del(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.STORE, 'readwrite');
      tx.objectStore(this.STORE).delete(key);
      tx.oncomplete = resolve;
      tx.onerror    = e => reject(e.target.error);
    });
  },

  /** Apply all stored image blobs to [data-cms-img] elements on the page */
  async applyToPage() {
    const elements = document.querySelectorAll('[data-cms-img]');
    for (const el of elements) {
      const key = el.dataset.cmsImg;
      try {
        const blob = await this.get(key);
        if (blob) {
          el.src = URL.createObjectURL(blob);
          el.style.display = 'block';
        }
      } catch(e) { /* ignore per-image errors */ }
    }
  }
};

const CMS = {
  STORAGE_KEY: 'msf_content',

  defaults: {
    'hero-eyebrow':   'An initiative by MCBEE',
    'hero-h1-1':      'MCBEE Skills',
    'hero-h1-2':      'Foundation',
    'hero-subhead':   'Giving back to the industry that built us.',
    'hero-body':      'Training India\'s next generation of AV, IT, automation, security, and building-systems professionals. Free for young people who need it. Funded by the industry that needs them.',
    'hero-video-url': '',   // MP4/WebM URL — overrides background image when set
    'mission-text':   'We are building India\'s most comprehensive industry-led training ecosystem for AV, IT, security, automation, and building systems — making world-class skills accessible to underprivileged youth, and giving today\'s installers the recognition their craft deserves. Within the next decade, every Indian integrator should be able to hire from a recognised national pool of trained, certified professionals.',

    'stat-1-num':   '12',   'stat-1-suf': '',    'stat-1-label': 'Curriculum Modules',
    'stat-2-num':   '6',    'stat-2-suf': ' mo', 'stat-2-label': 'Full-Time Programme',
    'stat-3-num':   '0',    'stat-3-pfx': '₹',  'stat-3-label': 'Cost for Track One Students',
    'stat-4-num':   '2026', 'stat-4-suf': '',    'stat-4-label': 'First Cohort Opens',

    'founders-heading':  'A note before we begin.',
    'founders-p1':       'For over a decade, our industry — AV, IT, security, automation, building systems — has rewarded us. It has also shown us the same gap every year: bright young people who want to enter this trade, with nowhere to learn it.',
    'founders-p2':       'We hire by word of mouth. We train on the job. We all complain about the same shortage — and none of us has done much about it. Until now.',
    'founders-pullout':  'We have decided to do something about it.',
    'founders-sig':      '— Sawan & Sameer, Co-Founders, MCBEE Skills Foundation',
    'founders-img-1':    '',
    'founders-img-2':    '',

    'strip-img-1': '', 'strip-label-1': 'Training in action',
    'strip-img-2': '', 'strip-label-2': 'On site',
    'strip-img-3': '', 'strip-label-3': 'The team',

    'track1-heading':  'Free for the youth who need it most.',
    'track1-body':     'Underprivileged young people, 18+, given a fully sponsored pathway into the trade.',
    'track1-footnote': 'Funded through CSR, donations, and Track Two surplus.',
    'track2-heading':  'Certification for existing installers.',
    'track2-body':     'Working installers across AV, IT, security, and automation get formal, recognised certification.',
    'track2-footnote': 'Surplus from Track Two underwrites Track One.',
    'mission-body':    'To build India\'s most comprehensive industry-led training ecosystem for AV, IT, security, automation, and building systems.',
    'vision-body':     'That within the next decade, every Indian integrator can hire from a recognised national pool of trained, certified professionals.',

    'outcomes-img':   '',
    'outcomes-quote': '"We are not opening a door for the sake of it. We are opening it onto a real career, with real income, in a real industry."',

    'partner-heading': 'This cannot be done by one company alone.',
    'partner-sub':     'Three ways to join us. Pick whichever fits — or all three.',
    'hire-tag': 'FOR INTEGRATORS & EMPLOYERS', 'hire-heading': 'Hire',
    'hire-sub': 'Commit to interviewing one graduate per year.',
    'hire-body': 'Our students need a first job. You need trained people. One interview per year — that\'s the ask.',
    'hire-btn': 'I want to hire →',
    'vol-tag': 'FOR SENIOR PRACTITIONERS', 'vol-heading': 'Volunteer',
    'vol-sub': 'One teaching session per quarter.',
    'vol-body': 'Teach a module, review curriculum, mentor a cohort. A few hours a year of real-world wisdom.',
    'vol-btn': 'I want to volunteer →',
    'sup-tag': 'FOR OEMs, DISTRIBUTORS, FOUNDATIONS', 'sup-heading': 'Support',
    'sup-sub': 'Equipment, sponsorship, or CSR partnership.',
    'sup-body': 'Donate kit, sponsor a cohort, or partner via your CSR programme.',
    'sup-btn': 'I want to support →',

    'apply-heading':  'Apply for free training. Build a real career.',
    'apply-sub':      'The first cohort opens in 2026. If you\'re 18+, ready to work hard, and want a real career in technology — this is for you.',
    'apply-email':    'mcbeeskillsfoundation@gmail.com',
    'apply-whatsapp': '+91-XXXXX-XXXXX',

    'footer-tagline':  'A Section 8 (Not-for-profit) Company · Delhi NCR',
    'footer-powered':  'Powered by MCBEE',
    'footer-cin':      '[to be added]',
    'footer-year':     '2026',
    'footer-linkedin': '', 'footer-instagram': '', 'footer-x': '', 'footer-youtube': '',

    'seo-title': 'MCBEE Skills Foundation — Training India\'s next generation',
    'seo-desc':  'A Section 8 not-for-profit training underprivileged youth for real careers in AV, IT, automation, security, and building systems.',
    'seo-url':   'https://mcbeefoundation.in',

    'color-ink': '#050505', 'color-paper': '#FCFCFC',
    'color-purple': '#9741F4', 'color-orange': '#FF820D',
    'color-muted': '#B1B6C1', 'color-line': '#E8E8E8',

    'logo-dark': '', 'logo-light': '', 'logo-mark': '', 'logo-og': '',

    // ── ORGANISATION DETAILS ───────────────────
    'org-cin':             '[CIN — to be added after incorporation]',
    'org-pan':             '[PAN — to be added]',
    'org-tan':             '[TAN — to be added]',
    'org-address':         '[Registered office address — to be added]',
    'org-phone':           '[Phone — to be added]',
    'org-darpan-id':       '[NGO Darpan ID — to be added once registered]',
    'org-12a':             '[12A registration — pending]',
    'org-80g':             '[80G registration — pending]',
    'org-csr1':            '[CSR-1 registration — pending]',
    'org-grievance-name':  '[Grievance Officer — to be appointed]',
    'org-grievance-phone': '[Phone — to be added]',
    'org-jurisdiction':    '[City — to confirm with legal counsel]',
    'org-analytics':       'Plausible Analytics',

    // ── POLICY DATES ───────────────────────────
    'date-privacy':   '[Date]',
    'date-terms':     '[Date]',
    'date-donor':     '[Date]',
    'date-grievance': '[Date]',
  },

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
      return Object.assign({}, this.defaults, saved);
    } catch(e) { return Object.assign({}, this.defaults); }
  },

  save(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch(e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        alert('Storage full — the image file is too large to save in the browser.\n\nPlease use the "Or URL" field instead: host the image on Google Drive, Dropbox, or any image host, then paste the direct link.');
      }
      return false;
    }
  },

  /** Update a single key and save */
  set(key, value) {
    const data = this.load();
    data[key] = value;
    return this.save(data);
  },

  /** Apply saved content to the live page */
  hydrate() {
    const c = this.load();
    // Apply image blobs from IndexedDB asynchronously
    if (typeof ImageDB !== 'undefined') ImageDB.applyToPage();

    // Text nodes — data-cms="key"
    document.querySelectorAll('[data-cms]').forEach(el => {
      const v = c[el.dataset.cms];
      if (v !== undefined && v !== '') el.textContent = v;
    });

    // Image sources — data-cms-img="key"
    // Only override if a real URL has been saved; otherwise keep the existing src (placeholder)
    document.querySelectorAll('[data-cms-img]').forEach(el => {
      const v = c[el.dataset.cmsImg];
      if (v && v.trim()) el.src = v;
    });

    // Anchor hrefs — data-cms-href="key"
    document.querySelectorAll('[data-cms-href]').forEach(el => {
      const v = c[el.dataset.cmsHref];
      if (v) el.href = v;
    });

    // Brand colours → CSS custom properties
    ['ink','paper','purple','orange','muted','line'].forEach(k => {
      const v = c['color-' + k];
      if (v) document.documentElement.style.setProperty('--' + k, v);
    });

    // Stats: update data-val / data-suf / data-pfx so count-up uses new values
    [1,2,3,4].forEach(i => {
      const el = document.querySelector('[data-cms="stat-' + i + '-num"]');
      if (!el) return;
      if (c['stat-' + i + '-num']) el.dataset.val = c['stat-' + i + '-num'];
      if (c['stat-' + i + '-suf'] !== undefined) el.dataset.suf = c['stat-' + i + '-suf'];
      if (c['stat-' + i + '-pfx']) el.dataset.pfx = c['stat-' + i + '-pfx'];
    });

    // Hero video — try IndexedDB blob first, fall back to URL
    const heroVideo = document.getElementById('hero-video');
    if (heroVideo) {
      (async () => {
        try {
          const blob = typeof ImageDB !== 'undefined' ? await ImageDB.get('hero-video') : null;
          const overlay = document.getElementById('hero-overlay');
          if (blob) {
            heroVideo.src = URL.createObjectURL(blob);
            heroVideo.style.display = 'block';
            if (overlay) overlay.style.display = 'block';
          } else if (c['hero-video-url'] && c['hero-video-url'].trim()) {
            heroVideo.src = c['hero-video-url'];
            heroVideo.style.display = 'block';
            if (overlay) overlay.style.display = 'block';
          }
        } catch(e) { /* silently skip if video fails */ }
      })();
    }

    // SEO
    if (c['seo-title']) document.title = c['seo-title'];
    const md = document.querySelector('meta[name="description"]');
    if (md && c['seo-desc']) md.content = c['seo-desc'];

    // Logo — swap logo-mark placeholder with real logo img using safe DOM
    const logoSrc = c['logo-dark'];
    if (logoSrc) {
      document.querySelectorAll('.logo-mark').forEach(el => {
        el.style.background = 'transparent';
        el.style.padding = '0';
        while (el.firstChild) el.removeChild(el.firstChild);
        const img = document.createElement('img');
        img.src = logoSrc;
        img.alt = 'MCBEE Skills Foundation';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        el.appendChild(img);
      });
    }
  }
};
