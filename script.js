/* ============================================================
   LANGUAGE
============================================================ */
let currentLang = localStorage.getItem('lang') || 'he';

function toggleLanguage() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setLanguage(currentLang);
}

function setLanguage(lang) {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');

    document.querySelectorAll('[data-he][data-en]').forEach(el => {
        el.textContent = el.getAttribute('data-' + lang);
    });

    document.getElementById('langToggle').textContent = lang === 'he' ? 'EN' : 'עב';

    document.title = lang === 'he'
        ? 'הקוטב הצפוני - מיזוג אוויר וחשמל | איציק דרורי'
        : 'The North Pole - AC & Electrical Services | Itzik Drori';

    localStorage.setItem('lang', lang);
}

/* ============================================================
   SNOWFLAKE PARTICLES
============================================================ */
function createParticles() {
    const container = document.getElementById('heroParticles');
    if (!container) return;

    const symbols = ['❄', '✦', '·', '❅', '✧'];
    const count = 22;

    for (let i = 0; i < count; i++) {
        const p = document.createElement('span');
        p.className = 'particle';
        const size = 8 + Math.random() * 18;
        const left = Math.random() * 100;
        const duration = 7 + Math.random() * 10;
        const delay = Math.random() * 12;
        const opacity = 0.08 + Math.random() * 0.25;

        p.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        p.style.cssText = `
            left: ${left}%;
            font-size: ${size}px;
            opacity: ${opacity};
            animation-duration: ${duration}s;
            animation-delay: -${delay}s;
        `;
        container.appendChild(p);
    }
}

/* ============================================================
   COUNTER ANIMATION
============================================================ */
function animateCounters() {
    const nums = document.querySelectorAll('.stat-num[data-target]');
    if (!nums.length) return;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            const target = parseFloat(el.getAttribute('data-target'));
            const decimals = parseInt(el.getAttribute('data-decimal')) || 0;
            const duration = 1600;
            const steps = 60;
            const increment = target / steps;
            let current = 0;
            let step = 0;

            const timer = setInterval(() => {
                step++;
                current = Math.min(current + increment, target);
                el.textContent = decimals > 0
                    ? current.toFixed(decimals)
                    : Math.round(current).toString();

                if (step >= steps) {
                    clearInterval(timer);
                    el.textContent = decimals > 0
                        ? target.toFixed(decimals)
                        : target.toString();
                }
            }, duration / steps);

            observer.unobserve(el);
        });
    }, { threshold: 0.5 });

    nums.forEach(el => observer.observe(el));
}

/* ============================================================
   FLOATING CTA
============================================================ */
function initFloatingCTA() {
    const cta = document.getElementById('floatCta');
    if (!cta) return;

    const hero = document.getElementById('hero');

    window.addEventListener('scroll', () => {
        const heroBottom = hero ? hero.getBoundingClientRect().bottom : 400;
        if (heroBottom < 0) {
            cta.classList.add('visible');
        } else {
            cta.classList.remove('visible');
        }
    }, { passive: true });
}

/* ============================================================
   NAVBAR SCROLL SHADOW
============================================================ */
function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    window.addEventListener('scroll', () => {
        navbar.style.boxShadow = window.scrollY > 50
            ? '0 4px 40px rgba(0,0,0,0.5)'
            : 'none';
    }, { passive: true });
}

/* ============================================================
   SCROLL FADE-IN
============================================================ */
function initFadeIn() {
    const targets = document.querySelectorAll(
        '.service-card, .why-card, .testimonial-card, .gallery-card, ' +
        '.area-list li, .hours-row, .contact-card, .about-photo-side, .about-content'
    );

    const observer = new IntersectionObserver(entries => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, i * 60);
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    targets.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
}

/* ============================================================
   SMOOTH SCROLL
============================================================ */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                const offset = 70;
                const top = target.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: 'smooth' });
            }
        });
    });
}

/* ============================================================
   MOBILE NAV TOGGLE
============================================================ */
function initNavToggle() {
    const btn = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    if (!btn || !links) return;

    btn.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        btn.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open);
    });

    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            links.classList.remove('open');
            btn.classList.remove('open');
            btn.setAttribute('aria-expanded', 'false');
        });
    });
}

/* ============================================================
   VIDEO CARD CLICK
============================================================ */
function initVideoCard() {
    const card = document.getElementById('videoCard');
    if (card) {
        card.addEventListener('click', () => {
            window.open('https://www.facebook.com/reel/604479014451875/', '_blank', 'noopener');
        });
    }
}

/* ============================================================
   INIT
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLang);
    createParticles();
    animateCounters();
    initFloatingCTA();
    initNavbar();
    initFadeIn();
    initSmoothScroll();
    initVideoCard();
    initNavToggle();
});
