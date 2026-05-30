/**
 * MCBEE Skills Foundation — Content Management
 * Text content → Supabase (cms_content table)
 * Images       → Supabase Storage (site-images / site-videos buckets, private)
 */

/* ── Supabase client ── */
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* ── ImageDB — Supabase Storage wrapper ── */
const ImageDB = {
  _bucket(key) {
    return key.includes('video') ? 'site-videos' : 'site-images';
  },

  async set(key, file) {
    const { error } = await _supabase.storage
      .from(this._bucket(key))
      .upload(key, file, { upsert: true });
    if (error) throw error;
  },

  get(key) {
    const { data } = _supabase.storage.from(this._bucket(key)).getPublicUrl(key);
    return Promise.resolve(data ? data.publicUrl : null);
  },

  async del(key) {
    const { error } = await _supabase.storage
      .from(this._bucket(key))
      .remove([key]);
    if (error) throw error;
  },

  async applyToPage() {
    const elements = [...document.querySelectorAll('[data-cms-img]')];
    // Fetch all URLs in parallel, fade each image in once loaded
    await Promise.all(elements.map(async el => {
      try {
        const url = await this.get(el.dataset.cmsImg);
        if (url) {
          el.style.opacity = '0';
          el.style.transition = 'opacity 0.5s ease';
          el.src = url;
          el.onload = () => { el.style.opacity = '1'; };
        }
      } catch(e) {}
    }));
    // Prevent casual image download — block right-click and drag on all CMS images
    elements.forEach(el => {
      el.draggable = false;
      el.addEventListener('contextmenu', e => e.preventDefault());
    });

    // ImageObject schema — inject after images have src set
    if (!document.getElementById('ld-images')) {
      const imgSchemas = [];
      elements.forEach(el => {
        if (el.src && el.alt) {
          imgSchemas.push({
            '@type': 'ImageObject',
            'contentUrl': el.src,
            'name': el.alt,
            'description': el.alt,
            'inLanguage': 'en-IN'
          });
        }
      });
      if (imgSchemas.length) {
        const s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = 'ld-images';
        s.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': imgSchemas });
        document.head.appendChild(s);
      }
    }
  }
};

/* ── Prevent casual image download ── */
(function() {
  const s = document.createElement('style');
  s.textContent = '[data-cms-img]{-webkit-user-select:none;user-select:none;pointer-events:none;} [data-cms-img]{pointer-events:none;}';
  document.head.appendChild(s);
  document.addEventListener('contextmenu', e => { if (e.target.dataset && e.target.dataset.cmsImg) e.preventDefault(); });
})();

/* ── CMS — Supabase cms_content table ── */
const CMS_CACHE_KEY = 'msf_cms_v1';
const CMS_TTL = 3600000; // 1 hour

const CMS = {
  _cache: null,

  defaults: {
    'hero-eyebrow':   'An initiative by MCBEE',
    'hero-h1-1':      'MCBEE Skills',
    'hero-h1-2':      'Foundation',
    'hero-subhead':   'Giving back to the industry that built us.',
    'hero-body':      'Training India\'s next generation of AV, IT, automation, security, and building-systems professionals. Free for young people who need it. Funded by the industry that needs them.',
    'hero-video-url': '',
    'hero-video-title': 'MCBEE Skills Foundation — Free AV & IT Skills Training for Youth in India',
    'hero-video-desc': 'A short film about MCBEE Skills Foundation\'s mission to train underprivileged youth for real careers in AV, IT, automation, security, and building systems. Fully funded. Delhi NCR. First cohort 2026.',
    'hero-video-duration': '',
    'hero-mobile-video-url': '',
    'hero-mobile-video-title': 'MCBEE Skills Foundation — Training India\'s Next Generation (Mobile)',
    'hero-mobile-video-desc': 'Free vocational training for underprivileged youth in AV, IT, and building systems. Apply now for the first cohort in 2026.',
    'hero-mobile-video-duration': '',

    'founders-img-1-alt': 'Sawan Nichani, Co-Founder and CEO of MCBEE Skills Foundation',
    'founders-img-2-alt': 'Sameer Nichani, Co-Founder and COO of MCBEE Skills Foundation',
    'strip-img-1-alt': 'MCBEE Skills Foundation students training on AV and building systems equipment in Delhi NCR',
    'strip-img-2-alt': 'Hands-on IT and networking training at MCBEE Skills Foundation',
    'strip-img-3-alt': 'Security systems and automation installation training at MCBEE Skills Foundation',
    'outcomes-img-alt': 'MCBEE Skills Foundation graduate working as an AV technician in Delhi NCR',
    'track-one-hero-alt': 'Underprivileged youth in Track One free AV and IT training programme at MCBEE Skills Foundation, Delhi NCR',
    'track-two-hero-alt': 'Working AV installer completing Track Two certification at MCBEE Skills Foundation',
    'mission-text':   'We are building India\'s most comprehensive industry-led training ecosystem for AV, IT, security, automation, and building systems — making world-class skills accessible to underprivileged youth, and giving today\'s installers the recognition their craft deserves. Within the next decade, every Indian integrator should be able to hire from a recognised national pool of trained, certified professionals.',

    'stat-1-num':   '12',   'stat-1-suf': '',    'stat-1-label': 'Curriculum Modules',
    'stat-2-num':   '6',    'stat-2-suf': ' mo', 'stat-2-label': 'Full-Time Programme',
    'stat-3-num':   '0',    'stat-3-pfx': '₹',  'stat-3-label': 'Cost for Track One Students',
    'stat-4-num':   '2026', 'stat-4-suf': '',    'stat-4-label': 'First Cohort Opens',

    'founders-heading':  'A note before we begin',
    'founders-p1':       'For over a decade, our industry — AV, IT, security, automation, building systems — has rewarded us. It has also shown us the same gap every year: bright young people who want to enter this trade, with nowhere to learn it.',
    'founders-p2':       'We hire by word of mouth. We train on the job. We all complain about the same shortage — and none of us has done much about it. Until now.',
    'founders-pullout':  'We have decided to do something about it.',
    'founders-sig':      '— Sawan & Sameer, Co-Founders, MCBEE Skills Foundation',
    'founders-img-1':    '',
    'founders-img-2':    '',

    'strip-img-1': '', 'strip-label-1': 'Training in action',
    'strip-img-2': '', 'strip-label-2': 'On site',
    'strip-img-3': '', 'strip-label-3': 'The team',

    'track1-heading':  'Free for the youth who need it most',
    'track1-body':     'Underprivileged young people, 18+, given a fully sponsored pathway into the trade.',
    'track1-footnote': 'Funded through CSR, donations, and Track Two surplus.',
    'track2-heading':  'Certification for existing installers',
    'track2-body':     'Working installers across AV, IT, security, and automation get formal, recognised certification.',
    'track2-footnote': 'Surplus from Track Two underwrites Track One.',
    'mission-body':    'To build India\'s most comprehensive industry-led training ecosystem for AV, IT, security, automation, and building systems.',
    'vision-body':     'That within the next decade, every Indian integrator can hire from a recognised national pool of trained, certified professionals.',

    'outcomes-img':   '',
    'outcomes-quote': '"We are not opening a door for the sake of it. We are opening it onto a real career, with real income, in a real industry."',

    'partner-heading': 'This cannot be done by one company alone',
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

    'apply-heading':  'Apply for free training, Build a real career',
    'apply-sub':      'The first cohort opens in 2026. If you\'re 18+, ready to work hard, and want a real career in technology — this is for you.',
    'contact-email':  'mcbeeskillsfoundation@gmail.com',
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

    'date-privacy':   '[Date]',
    'date-terms':     '[Date]',
    'date-donor':     '[Date]',
    'date-grievance': '[Date]',
  },

  /** Fetch from Supabase and populate cache. Call once on page load. */
  async init() {
    // Try localStorage cache first — avoids a Supabase round-trip on repeat visits
    try {
      const cached = localStorage.getItem(CMS_CACHE_KEY);
      if (cached) {
        const { payload, ts } = JSON.parse(cached);
        if (payload && Date.now() - ts < CMS_TTL) {
          this._cache = Object.assign({}, this.defaults, payload);
          return;
        }
      }
    } catch(e) {}

    // Cache miss — fetch from Supabase
    try {
      const { data, error } = await _supabase
        .from('cms_content')
        .select('data')
        .eq('id', 1)
        .single();
      if (error) throw error;
      const payload = data.data || {};
      this._cache = Object.assign({}, this.defaults, payload);
      try {
        localStorage.setItem(CMS_CACHE_KEY, JSON.stringify({ payload, ts: Date.now() }));
      } catch(e) {}
    } catch(e) {
      console.warn('CMS.init: failed, using defaults', e);
      this._cache = Object.assign({}, this.defaults);
    }
  },

  /** Bust the localStorage cache — call after saving so next page load gets fresh data. */
  bustCache() {
    try { localStorage.removeItem(CMS_CACHE_KEY); } catch(e) {}
    // Also bust all image URL caches
    try {
      Object.keys(localStorage)
        .filter(k => k.startsWith('msf_img_'))
        .forEach(k => localStorage.removeItem(k));
    } catch(e) {}
  },

  /** Synchronous — returns cache. Must call await CMS.init() first. */
  load() {
    return this._cache ? Object.assign({}, this._cache) : Object.assign({}, this.defaults);
  },

  /** Persist full content object to Supabase */
  async save(data) {
    this._cache = Object.assign({}, data);
    try {
      const { error } = await _supabase
        .from('cms_content')
        .update({ data, updated_at: new Date().toISOString() })
        .eq('id', 1);
      if (error) throw error;
      this.bustCache(); // invalidate so next visit fetches fresh data
      return true;
    } catch(e) {
      console.error('CMS.save failed', e);
      return false;
    }
  },

  async set(key, value) {
    const data = this.load();
    data[key] = value;
    return this.save(data);
  },

  /** Apply cached content to the live page */
  hydrate() {
    const c = this.load();

    // Images are applied earlier in parallel with CMS.init() — no duplicate fetch needed

    // Text nodes
    document.querySelectorAll('[data-cms]').forEach(el => {
      const v = c[el.dataset.cms];
      if (v !== undefined && v !== '') el.textContent = v;
    });

    // Image sources — URL override only (Storage blobs handled by applyToPage)
    // Only allow https:// URLs to prevent data:/javascript: injection
    document.querySelectorAll('[data-cms-img]').forEach(el => {
      const v = c[el.dataset.cmsImg];
      if (v && /^https:\/\//.test(v)) el.src = v;
    });

    // Anchor hrefs — allow https:// and mailto: URLs to prevent javascript: injection
    document.querySelectorAll('[data-cms-href]').forEach(el => {
      const v = c[el.dataset.cmsHref];
      if (v && /^(https:\/\/|mailto:)/.test(v)) el.href = v;
    });

    // Email text + href pairs — sets both the visible text and mailto: href
    document.querySelectorAll('[data-cms-email]').forEach(el => {
      const v = c[el.dataset.cmsEmail];
      if (v) { el.textContent = v; el.href = 'mailto:' + v; }
    });

    // mailto: href only — keeps existing link text, just updates the href
    document.querySelectorAll('[data-cms-mailto]').forEach(el => {
      const v = c[el.dataset.cmsMailto];
      if (v) el.href = 'mailto:' + v;
    });

    // Alt text — sets alt attribute on images
    document.querySelectorAll('[data-cms-alt]').forEach(el => {
      const v = c[el.dataset.cmsAlt];
      if (v) el.alt = v;
    });

    // VideoObject schema — desktop video
    const videoTitle = c['hero-video-title'];
    const videoDesc  = c['hero-video-desc'];
    if (videoTitle && !document.getElementById('ld-video')) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id   = 'ld-video';
      const vo = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        'name': videoTitle,
        'description': videoDesc || videoTitle,
        'thumbnailUrl': 'https://mcbeeskills.com/og-image.png',
        'uploadDate': new Date().toISOString().split('T')[0],
        'contentUrl': c['hero-video-url'] || '',
        'author': { '@id': 'https://mcbeeskills.com/#organization' }
      };
      if (c['hero-video-duration']) vo['duration'] = c['hero-video-duration'];
      s.textContent = JSON.stringify(vo);
      document.head.appendChild(s);
    }

    // VideoObject schema — mobile video
    const mobileTitle = c['hero-mobile-video-title'];
    const mobileDesc  = c['hero-mobile-video-desc'];
    if (mobileTitle && !document.getElementById('ld-video-mobile')) {
      const s = document.createElement('script');
      s.type = 'application/ld+json';
      s.id   = 'ld-video-mobile';
      const vo = {
        '@context': 'https://schema.org',
        '@type': 'VideoObject',
        'name': mobileTitle,
        'description': mobileDesc || mobileTitle,
        'thumbnailUrl': 'https://mcbeeskills.com/og-image.png',
        'uploadDate': new Date().toISOString().split('T')[0],
        'contentUrl': c['hero-mobile-video-url'] || '',
        'author': { '@id': 'https://mcbeeskills.com/#organization' }
      };
      if (c['hero-mobile-video-duration']) vo['duration'] = c['hero-mobile-video-duration'];
      s.textContent = JSON.stringify(vo);
      document.head.appendChild(s);
    }

    // Brand colours — validate #RGB / #RRGGBB format before applying
    ['ink','paper','purple','orange','muted','line'].forEach(k => {
      const v = c['color-' + k];
      if (v && /^#[0-9a-fA-F]{3,6}$/.test(v)) document.documentElement.style.setProperty('--' + k, v);
    });

    // Stats countup
    [1,2,3,4].forEach(i => {
      const el = document.querySelector('[data-cms="stat-' + i + '-num"]');
      if (!el) return;
      if (c['stat-' + i + '-num']) el.dataset.val = c['stat-' + i + '-num'];
      if (c['stat-' + i + '-suf'] !== undefined) el.dataset.suf = c['stat-' + i + '-suf'];
      if (c['stat-' + i + '-pfx']) el.dataset.pfx = c['stat-' + i + '-pfx'];
    });

    // Hero video URL fallback — only applies when a direct URL is set in CMS (not Storage upload)
    // Storage-uploaded videos are handled earlier in parallel with CMS.init() in index.html
    const heroVideo = document.getElementById('hero-video');
    if (heroVideo && !heroVideo.src) {
      const isMobile = window.innerWidth < 768;
      const urlKey = isMobile ? 'hero-mobile-video-url' : 'hero-video-url';
      const fallbackUrl = c[urlKey] || c['hero-video-url'];
      if (fallbackUrl && fallbackUrl.trim()) {
        heroVideo.src = fallbackUrl;
        heroVideo.style.display = 'block';
        const overlay = document.getElementById('hero-overlay');
        if (overlay) overlay.style.display = 'block';
      }
    }

    // SEO — only override title/desc on homepage to avoid clobbering page-specific titles
    const isHome = ['/', '/index.html', ''].includes(window.location.pathname);
    if (isHome) {
      if (c['seo-title']) document.title = c['seo-title'];
      const md = document.querySelector('meta[name="description"]');
      if (md && c['seo-desc']) md.content = c['seo-desc'];
    }

    // Logo swap — only allow https:// URLs
    const logoSrc = c['logo-dark'];
    if (logoSrc && /^https:\/\//.test(logoSrc)) {
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
