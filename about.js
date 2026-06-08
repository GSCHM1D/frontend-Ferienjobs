/* ═══════════════════════════════════════════════
   TESTIMONIALS DATA
   Add / edit entries here. Each object:
   { company, logo, person, role, quote, url }
   logo: path to image file, or "" to show company name as text
════════════════════════════════════════════════ */
const testimonials = [
  {
      company: "Aargauhotels AG",
      logo: "logos_firmen/Aargauhotels_logo_transparent.PNG",
      person: "Sabrina Schaffner",
      role: "HR",
      quote: "Für uns bedeutete die Plattform eine spürbare Entlastung im Rekrutierungsprozess.",
      url: "https://www.aargauhotels.ch"
  },
  {
      company: "AZ-Vertriebs AG",
      logo: "logos_firmen/AZVertrieb_logo.PNG",
      person: "Ramon Aeberhard",
      role: "Teamleiter Vertrieb",
      quote: "Die Plattform leistet uns grosse Unterstützung, um unsere Kunden in der Ferienzeit zu bedienen, da diese Ferienjobs eine echte Hilfe sind.",
      url: "https://www.azvertrieb.ch"
  }
];


/* ═══════════════════════════════════════════════
   BUILD TESTIMONIAL CAROUSEL
════════════════════════════════════════════════ */
function buildCarousel() {
  const track = document.getElementById('testimonial-track');
  if (!track || testimonials.length === 0) return;

  // Duplicate for seamless loop
  const items = [...testimonials, ...testimonials];

  items.forEach(t => {
    const card = document.createElement('div');
    card.className = 'testimonial-card';

    // Logo wrap – DOM methods prevent XSS
    const logoWrap = document.createElement('div');
    logoWrap.className = 'testimonial-logo-wrap';
    if (t.logo) {
      const img = document.createElement('img');
      img.src = t.logo;
      img.alt = t.company;
      img.className = 'testimonial-logo';
      logoWrap.appendChild(img);
    } else {
      const span = document.createElement('span');
      span.className = 'testimonial-logo-text';
      span.textContent = t.company;
      logoWrap.appendChild(span);
    }
    card.appendChild(logoWrap);

    // Quote
    const quote = document.createElement('p');
    quote.className = 'testimonial-quote';
    quote.textContent = t.quote;
    card.appendChild(quote);

    // Person block
    const personDiv = document.createElement('div');
    personDiv.className = 'testimonial-person';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'testimonial-name';
    nameSpan.textContent = t.person;
    personDiv.appendChild(nameSpan);

    const roleSpan = document.createElement('span');
    roleSpan.className = 'testimonial-role';
    roleSpan.textContent = `${t.role} · ${t.company}`;
    personDiv.appendChild(roleSpan);

    const link = document.createElement('a');
    link.href = t.url;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'testimonial-url';
    link.textContent = t.url.replace(/^https?:\/\//, '');
    personDiv.appendChild(link);

    card.appendChild(personDiv);
    track.appendChild(card);
  });

  // Adjust animation duration based on count
  const duration = Math.max(18, testimonials.length * 8);
  track.style.animationDuration = duration + 's';
}


/* ═══════════════════════════════════════════════
   HERO PARTICLES
════════════════════════════════════════════════ */
function initHeroParticles() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const container = document.createElement('div');
  container.className = 'hero-particles';
  hero.appendChild(container);

  const colors = ['#ff9e1f', '#ffd43a', '#74ef55', '#27f0d8', '#16d9ff', '#1277ff'];

  for (let i = 0; i < 38; i++) {
    const dot = document.createElement('div');
    dot.className = 'hero-particle';
    const size = Math.random() * 2.5 + 1;
    dot.style.cssText = [
      `left:${Math.random() * 100}%`,
      `top:${Math.random() * 100}%`,
      `width:${size}px`,
      `height:${size}px`,
      `background:${colors[Math.floor(Math.random() * colors.length)]}`,
      `animation-delay:${(Math.random() * 10).toFixed(2)}s`,
      `animation-duration:${(Math.random() * 8 + 7).toFixed(2)}s`
    ].join(';');
    container.appendChild(dot);
  }
}


/* ═══════════════════════════════════════════════
   3D CARD TILT (article cards)
════════════════════════════════════════════════ */
function initCardTilt() {
  const cards = document.querySelectorAll('.article-card');

  cards.forEach(card => {
    card.addEventListener('mouseenter', () => {
      card.style.transition = 'transform 0.08s ease, box-shadow 0.35s ease';
    });

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `translateY(-8px) rotateX(${(-dy * 6).toFixed(2)}deg) rotateY(${(dx * 6).toFixed(2)}deg)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.6s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.35s ease';
      card.style.transform = '';
    });
  });
}


/* ═══════════════════════════════════════════════
   STICKY LOGO – appears after hero
════════════════════════════════════════════════ */
function initStickyLogo() {
  const hero = document.getElementById('hero');
  const stickyLogo = document.getElementById('sticky-logo');
  if (!hero || !stickyLogo) return;

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      // hero leaving viewport → show sticky logo
      if (!entry.isIntersecting) {
        stickyLogo.classList.add('visible');
      } else {
        stickyLogo.classList.remove('visible');
      }
    });
  }, { threshold: 0.1 });

  obs.observe(hero);
}


/* ═══════════════════════════════════════════════
   FADE-IN ON SCROLL (IntersectionObserver)
════════════════════════════════════════════════ */
function initFadeIns() {
  const targets = document.querySelectorAll('.fade-up, .fade-left, .fade-right');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        obs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px'
  });

  targets.forEach(el => obs.observe(el));
}


/* ═══════════════════════════════════════════════
   INSTAGRAM SHIMMER – replay on hover
════════════════════════════════════════════════ */
function initInstaShimmer() {
  const handle = document.querySelector('.insta-handle');
  if (!handle) return;

  handle.addEventListener('mouseenter', () => {
    handle.style.animation = 'none';
    // force reflow
    void handle.offsetWidth;
    handle.style.animation = '';
  });
}


/* ═══════════════════════════════════════════════
   HERO SCROLL TRANSITION
   – Black overlay fades out as user scrolls past hero
   – Logo stays visible underneath (glassy shimmer)
   – "Wer wir sind" fades in once overlay is gone
════════════════════════════════════════════════ */
function initHeroScrollTransition() {
  const hero = document.getElementById('hero');
  const overlay = document.getElementById('hero-overlay');
  if (!hero || !overlay) return;

  function onScroll() {
    const heroH = hero.offsetHeight;
    const scrollY = window.scrollY;
    const zone = heroH * 0.6;
    const progress = Math.min(scrollY / zone, 1);
    overlay.style.opacity = String(1 - progress);
    /* Logo normal beim scrollen */
    const logoImg = document.getElementById('logo-img');
    if (logoImg) logoImg.style.opacity = String(0.15 + progress * 0.85);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}



function initFooterLink() {
  const link = document.getElementById('footer-home-link');
  const fade = document.getElementById('page-fade');
  if (!link || !fade) return;

  link.addEventListener('click', e => {
    e.preventDefault();
    const href = link.getAttribute('href');
    // Remove scroll listener control and force full black
    fade.style.transition = 'opacity 0.55s ease';
    fade.style.pointerEvents = 'all';
    fade.style.opacity = '1';
    setTimeout(() => { window.location.href = href; }, 580);
  });
}


/* ═══════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  buildCarousel();
  initHeroParticles();
  initStickyLogo();
  initFadeIns();
  initCardTilt();
  initInstaShimmer();
  initHeroScrollTransition();
  initFooterLink();
});
