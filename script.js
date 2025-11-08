document.addEventListener('DOMContentLoaded', () => {
    // --- Core Site Interactivity ---
    if (typeof AOS !== 'undefined') { AOS.init({ duration: 1000, once: true }); }
    if (typeof feather !== 'undefined') { feather.replace(); }

    const mobileMenu = document.getElementById('mobile-menu');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                if (mobileMenu && !mobileMenu.classList.contains('hidden') && mobileMenu.contains(this)) {
                    mobileMenu.classList.add('hidden');
                }
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
    
    
    // --- Email Obfuscation ---
    const emailLink = document.getElementById('email-link');
    if (emailLink) {
        const user = 'info';
        const domain = 'dhartee.in';
        emailLink.href = 'mailto:' + user + '@' + domain;
        emailLink.textContent = user + '@' + domain;
    }
});


