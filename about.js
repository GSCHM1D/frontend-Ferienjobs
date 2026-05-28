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

    const logoHTML = t.logo
      ? `<img src="${t.logo}" alt="${t.company}" class="testimonial-logo" />`
      : `<span class="testimonial-logo-text">${t.company}</span>`;

    card.innerHTML = `
      <div class="testimonial-logo-wrap">${logoHTML}</div>
      <p class="testimonial-quote">${t.quote}</p>
      <div class="testimonial-person">
        <span class="testimonial-name">${t.person}</span>
        <span class="testimonial-role">${t.role} · ${t.company}</span>
        <a href="${t.url}" target="_blank" rel="noopener" class="testimonial-url">${t.url.replace(/^https?:\/\//, '')}</a>
      </div>
    `;
    track.appendChild(card);
  });

  // Adjust animation duration based on count
  const duration = Math.max(18, testimonials.length * 8);
  track.style.animationDuration = duration + 's';
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
  initStickyLogo();
  initFadeIns();
  initInstaShimmer();
  initHeroScrollTransition();
  initFooterLink();
});
