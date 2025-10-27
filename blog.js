// blog.js
document.addEventListener('DOMContentLoaded', async () => {
    const postsCollection = db.collection('posts');
    const blogGrid = document.getElementById('blog-grid');
    const noPostsMessage = document.getElementById('no-posts-message');

    const snapshot = await postsCollection.orderBy('date', 'desc').get();

    if (snapshot.empty) {
        noPostsMessage.classList.remove('hidden');
        return;
    }

    blogGrid.innerHTML = ''; // Clear loader/default text
    snapshot.forEach(doc => {
        const post = doc.data();
        const postCard = `
            <div class="blog-card bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" data-aos="fade-up">
                <img class="w-full h-56 object-cover" src="${post.image}" alt="${post.title}">
                <div class="p-6 flex flex-col flex-grow">
                    <span class="text-sm font-semibold text-white bg-primary py-1 px-3 rounded-full self-start mb-4">${post.category}</span>
                    <h3 class="text-xl font-bold text-dark mb-2">${post.title}</h3>
                    <p class="text-gray-600 mb-4 flex-grow">${post.content}</p>
                    <div class="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between">
                        <div class="text-sm text-gray-500">
                            <span>By Dharmendra Sharma</span><br/>
                            <span>${new Date(post.date).toLocaleDateString()}</span>
                        </div>
                        <a href="/blog/${post.slug}" class="font-bold text-primary hover:text-blue-700">Read More &rarr;</a>
                    </div>
                </div>
            </div>
        `;
        blogGrid.innerHTML += postCard;
    });
    
    // Re-initialize AOS after posts are loaded
    AOS.init({ duration: 1000, once: true });

});


    // Initialize Feather Icons
    feather.replace();

    // Mobile menu toggle
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // --- NEW: Close menu on link click ---
    const mobileMenuLinks = document.querySelectorAll('#mobile-menu a');
    if (mobileMenu && mobileMenuLinks.length > 0) {
        mobileMenuLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Add the 'hidden' class to close the menu
                mobileMenu.classList.add('hidden');
            });
        });
    }
    // --- End of new code ---

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

