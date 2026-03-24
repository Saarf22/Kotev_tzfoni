let currentLang = localStorage.getItem('lang') || 'he';

function toggleLanguage() {
    currentLang = currentLang === 'he' ? 'en' : 'he';
    setLanguage(currentLang);
}

function setLanguage(lang) {
    const html = document.documentElement;
    html.setAttribute('lang', lang);
    html.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');

    // Update all translatable elements
    document.querySelectorAll('[data-he][data-en]').forEach(el => {
        el.textContent = el.getAttribute('data-' + lang);
    });

    // Update language toggle button label
    document.getElementById('langToggle').textContent = lang === 'he' ? 'EN' : 'עב';

    // Update page title
    document.title = lang === 'he'
        ? 'הקוטב הצפוני - מיזוג אוויר וחשמל | איציק דרורי'
        : 'The North Pole - AC & Electrical Services | Itzik Drori';

    localStorage.setItem('lang', lang);
}

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved/default language
    setLanguage(currentLang);

    // Navbar scroll shadow
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        navbar.style.boxShadow = window.scrollY > 40
            ? '0 4px 32px rgba(0,0,0,0.35)'
            : 'none';
    }, { passive: true });

    // Smooth scroll for internal anchor links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', e => {
            const target = document.querySelector(a.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    // Fade-in on scroll (Intersection Observer)
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll(
        '.service-card, .why-card, .testimonial-card, .area-list li, .hours-row, .contact-card'
    ).forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });
});
