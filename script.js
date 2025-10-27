document.addEventListener("DOMContentLoaded", function() {

    // Initialize Animate on Scroll (AOS) library
    AOS.init({
        duration: 1000,
        once: true
    });

    // Initialize Feather Icons
    feather.replace();

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Chat widget toggle
    const chatToggle = document.getElementById('chat-toggle');
    const closeChat = document.getElementById('close-chat');
    const chatWindow = document.getElementById('chat-window');
    if (chatToggle && closeChat && chatWindow) {
        chatToggle.addEventListener('click', function() {
            chatWindow.classList.toggle('hidden');
        });
        closeChat.addEventListener('click', function() {
            chatWindow.classList.add('hidden');
        });
    }

    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Intersection Observer for service card animations
    const cards = document.querySelectorAll('.service-card');
    if (cards.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        cards.forEach(card => {
            observer.observe(card);
        });
    }

});
// Add this code to the bottom of script.js

document.addEventListener('DOMContentLoaded', () => {
    const heroForm = document.getElementById('hero-contact-form');
    const mainForm = document.getElementById('main-contact-form');
    const functionUrl = 'https://us-central1-dhartee-blog.cloudfunctions.net/submitContactForm'; // <-- IMPORTANT

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
                setTimeout(() => {
                    submitButton.innerHTML = originalButtonText;
                    submitButton.disabled = false;
                }, 3000);
            } else {
                throw new Error('Server responded with an error.');
            }
        } catch (error) {
            console.error('Form submission error:', error);
            submitButton.innerHTML = 'Submission Failed';
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
});



