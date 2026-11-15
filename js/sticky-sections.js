/* =========================================================================
   CORTINA COM PARALLAX (GSAP ScrollTrigger + Lenis)
   -------------------------------------------------------------------------
   Uso no HTML:  <section data-section="x" data-curtain>
   - Seção curta gruda logo abaixo do menu; seção alta gruda com top negativo
     (100svh - altura), só depois de lida inteira. Nada fica cortado.
   - Enquanto a próxima seção sobe até encostar no menu, a atual sobe mais
     devagar (parallax) e escurece com overlay azul-marinho; depois some. A próxima sobe por cima como cortina (cantos e sombra
     fixos no CSS: .curtain-next).
   - Sem data-curtain (ex.: Diferenciais) a seção rola normal.
   - Anima só transform (yPercent) e opacity. Scrub com ease "none".
   - prefers-reduced-motion: nada é aplicado (seções normais empilhadas).
   Depende de: gsap, ScrollTrigger, Lenis (CDN no index.html)
   ========================================================================= */
(function () {
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* >>> ajuste aqui a intensidade do efeito <<< */
  const SETTINGS = {
    desktop: { yPercent: -20, dim: 0.4 }, /* min-width: 769px */
    mobile:  { yPercent: -10, dim: 0.3 }  /* max-width: 768px */
  };

  const root = document.documentElement;
  const mm = gsap.matchMedia();

  mm.add({
    isDesktop: '(min-width: 769px)',
    isMobile: '(max-width: 768px)',
    reduce: '(prefers-reduced-motion: reduce)'
  }, (ctx) => {
    const { isMobile, reduce } = ctx.conditions;
    if (reduce) return;

    const cfg = isMobile ? SETTINGS.mobile : SETTINGS.desktop;
    const cleanups = [];
    root.classList.add('has-curtain');

    /* ---------- Lenis sincronizado com ScrollTrigger ---------- */
    if (window.Lenis) {
      document.querySelectorAll('[class*="modal"],[class*="overlay"],.drawer,aside,.testi-grid')
        .forEach((el) => el.setAttribute('data-lenis-prevent', ''));
      const lenis = new Lenis({ lerp: 0.12, smoothWheel: true, syncTouch: false });
      lenis.on('scroll', ScrollTrigger.update);
      const tick = (t) => lenis.raf(t * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      /* modais travam a rolagem do body: pausa o Lenis junto */
      const mo = new MutationObserver(() => {
        document.body.classList.contains('scroll-locked') ? lenis.stop() : lenis.start();
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      cleanups.push(() => { mo.disconnect(); gsap.ticker.remove(tick); lenis.destroy(); });
    }

    /* ---------- z-index crescente: a próxima sempre por cima ---------- */
    const all = [...document.querySelectorAll('[data-section]')];
    all.forEach((el, i) => { el.style.zIndex = String(i + 1); });
    const footerBottom = document.querySelector('.footer-bottom');
    if (footerBottom) footerBottom.style.zIndex = String(all.length + 1);

    /* ---------- onde cada seção gruda (--stick-top) ----------
       Curta (cabe abaixo do menu): gruda logo abaixo do menu; a próxima, colada
       embaixo, começa a cobrir na hora (sem vazio acima ou abaixo).
       Alta: top negativo = 100svh - altura -> só segura depois de lida inteira. */
    const NAV = 48; /* altura do menu já encolhido */
    const curtains = [...document.querySelectorAll('[data-curtain]')];
    const isShort = (el) => el.offsetHeight + NAV <= window.innerHeight;
    const setTops = () => curtains.forEach((el) => el.style.setProperty('--stick-top',
      isShort(el) ? NAV + 'px' : `calc(100svh - ${el.offsetHeight}px)`));
    setTops();
    ScrollTrigger.addEventListener('refreshInit', setTops);
    /* qualquer mudança de altura (fontes, ícones, imagens, resize) recalcula top e triggers */
    let roTimer;
    const ro = new ResizeObserver(() => {
      clearTimeout(roTimer);
      roTimer = setTimeout(() => { setTops(); ScrollTrigger.refresh(); }, 120);
    });
    curtains.forEach((el) => ro.observe(el));
    cleanups.push(() => { ro.disconnect(); clearTimeout(roTimer); });

    /* ---------- cortina ---------- */
    curtains.forEach((el) => {
      let next = el.nextElementSibling;
      while (next && !next.matches('[data-section]')) next = next.nextElementSibling;
      if (!next) return;
      next.classList.add('curtain-next');

      const dim = document.createElement('div');
      dim.className = 'curtain-dim';
      el.appendChild(dim);

      /* gatilho = marcador estático (altura 0) na posição natural da próxima seção.
         Usar a própria seção sticky como trigger dá posições erradas se o refresh
         acontece com ela grudada (ex.: recarregar no meio da página). */
      const marker = document.createElement('div');
      marker.className = 'curtain-marker';
      marker.setAttribute('aria-hidden', 'true');
      next.before(marker);

      /* começa quando a próxima encosta na base do conteúdo da atual (seção grudou)
         e termina quando a próxima chega logo abaixo do menu (atual 100% coberta) */
      gsap.timeline({
        scrollTrigger: {
          trigger: marker,
          start: () => (isShort(el) ? `top ${NAV + el.offsetHeight}px` : 'top bottom'),
          end: `top ${NAV}px`,
          scrub: true,
          invalidateOnRefresh: true
        }
      })
        .fromTo(el, { yPercent: 0 }, { yPercent: cfg.yPercent, ease: 'none', duration: 1 }, 0)
        .fromTo(dim, { opacity: 0 }, { opacity: cfg.dim, ease: 'none', duration: 1 }, 0)
        /* 100% coberta (fim da timeline): sai de vez; volta ao rolar para cima.
           Faz parte do scrub, então segue a posição da rolagem mesmo após refresh/saltos.
           autoAlpha = visibility, não bloqueia cliques */
        .set(el, { autoAlpha: 0 }, 1);

      cleanups.push(() => {
        dim.remove();
        marker.remove();
        next.classList.remove('curtain-next');
        gsap.set(el, { clearProps: 'transform,opacity,visibility' });
      });
    });

    /* imagens (foto lazy) mudam alturas: recalcula */
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh, { once: true });
    document.querySelectorAll('[data-curtain] img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', refresh, { once: true });
    });

    return () => {
      cleanups.forEach((fn) => fn());
      ScrollTrigger.removeEventListener('refreshInit', setTops);
      curtains.forEach((el) => el.style.removeProperty('--stick-top'));
      all.forEach((el) => { el.style.zIndex = ''; });
      if (footerBottom) footerBottom.style.zIndex = '';
      root.classList.remove('has-curtain');
    };
  });
})();
