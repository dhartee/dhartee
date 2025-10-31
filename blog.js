// blog.js (Final Corrected Version)
document.addEventListener('DOMContentLoaded', () => {
    // A short delay to ensure Firebase is fully initialized by other scripts
    setTimeout(() => {
        if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined') {
            console.error("Firebase is not initialized. Cannot fetch blog posts.");
            return;
        }

        const db = firebase.firestore();
        const postsCollection = db.collection('posts');
        const blogGrid = document.getElementById('blog-grid');
        const noPostsMessage = document.getElementById('no-posts-message');

        postsCollection.orderBy('date', 'desc').get()
            .then(snapshot => {
                if (snapshot.empty) {
                    if(noPostsMessage) noPostsMessage.classList.remove('hidden');
                    return;
                }

                if(blogGrid) blogGrid.innerHTML = '';
                snapshot.forEach(doc => {
                    const post = doc.data();
                    const postCard = `
                        <div class="blog-card bg-white rounded-lg shadow-lg overflow-hidden flex flex-col" data-aos="fade-up">
                            <a href="/blog/${post.slug}" class="block">
                                <img loading="lazy" class="w-full h-56 object-cover" src="${post.image}" alt="${post.title}">
                            </a>
                            <div class="p-6 flex flex-col flex-grow">
                                <span class="text-sm font-semibold text-white bg-primary py-1 px-3 rounded-full self-start mb-4">${post.category}</span>
                                <h3 class="text-xl font-bold text-dark mb-2">
                                    <a href="/blog/${post.slug}" class="hover:text-primary transition-colors">${post.title}</a>
                                </h3>
                                <p class="text-gray-600 mb-4 flex-grow">${post.content}</p>
                                <div class="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between">
                                    <div class="text-sm text-gray-500">
                                        <span>By Dharmendra Sharma</span><br/>
                                        <span>${new Date(post.date).toLocaleDateString('en-IN')}</span>
                                    </div>
                                    <a href="/blog/${post.slug}" class="font-bold text-primary hover:text-blue-700">Read More &rarr;</a>
                                </div>
                            </div>
                        </div>
                    `;
                    if(blogGrid) blogGrid.innerHTML += postCard;
                });
                
                if (typeof AOS !== 'undefined') {
                    AOS.refresh(); // Re-initialize animations for new elements
                }
            })
            .catch(error => {
                console.error("Error fetching blog posts:", error);
                if(noPostsMessage) {
                    noPostsMessage.classList.remove('hidden');
                    noPostsMessage.textContent = "Error loading posts. Please try again later.";
                }
            });
    }, 100); // 100ms delay to ensure Firebase is ready
});


