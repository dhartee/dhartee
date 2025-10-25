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
                        <a href="post.html?id=${doc.id}" class="font-bold text-primary hover:text-blue-700">Read More &rarr;</a>
                    </div>
                </div>
            </div>
        `;
        blogGrid.innerHTML += postCard;
    });
    
    // Re-initialize AOS after posts are loaded
    AOS.init({ duration: 1000, once: true });
});