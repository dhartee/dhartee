document.addEventListener('DOMContentLoaded', () => {

    // --- Core Site Interactivity ---

    AOS.init({ duration: 1000, once: true });
    feather.replace();

    const mobileMenu = document.getElementById('mobile-menu');
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- UNIFIED SCROLLING & MENU CLOSE SCRIPT (THE FIX) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault(); // Stop the default jump

            // If the mobile menu is open and contains the clicked link, close it
            if (mobileMenu && !mobileMenu.classList.contains('hidden')) {
                if (mobileMenu.contains(this)) {
                    mobileMenu.classList.add('hidden');
                }
            }

            // Perform the smooth scroll
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Chat widget toggle
    const chatToggle = document.getElementById('chat-toggle');
    const closeChat = document.getElementById('close-chat');
    const chatWindow = document.getElementById('chat-window');
    if (chatToggle && closeChat && chatWindow) {
        chatToggle.addEventListener('click', () => {
            chatWindow.classList.toggle('hidden');
        });
        closeChat.addEventListener('click', () => {
            chatWindow.classList.add('hidden');
        });
    }

    // --- Firebase Form Submission ---
    const heroForm = document.getElementById('hero-contact-form');
    const mainForm = document.getElementById('main-contact-form');
    const functionUrl = 'https://us-central1-dhartee-blog.cloudfunctions.net/submitContactForm';

    const handleFormSubmit = async (event, formElement) => {
        event.preventDefault();
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        
        const submitButton = formElement.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.innerHTML;
        submitButton.innerHTML = 'Sending...';
        submitButton.disabled = true;

        try {
            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (response.ok) {
                formElement.reset();
                submitButton.innerHTML = 'Message Sent!';
            } else {
                throw new Error('Server responded with an error.');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            submitButton.innerHTML = 'Submission Failed';
        } finally {
            setTimeout(() => {
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            }, 3000);
        }
    };

    if (heroForm) {
        heroForm.addEventListener('submit', (e) => handleFormSubmit(e, heroForm));
    }
    if (mainForm) {
        mainForm.addEventListener('submit', (e) => handleFormSubmit(e, mainForm));
    }

    // --- Email Obfuscation ---
    const emailLink = document.getElementById('email-link');
    if (emailLink) {
        const user = 'info';
        const domain = 'dhartee.in';
        emailLink.href = 'mailto:' + user + '@' + domain;
        emailLink.textContent = user + '@' + domain;
    }

});
