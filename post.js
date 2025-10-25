// post.js
document.addEventListener('DOMContentLoaded', async () => {
    const postContentEl = document.getElementById('full-post-content');
    const postTitleHead = document.getElementById('post-title-head');
    
    // Get post ID from URL
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('id');

    if (!postId) {
        postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Post not found.</h1><p class="text-center">No post ID was provided in the URL.</p>';
        return;
    }

    try {
        const docRef = db.collection('posts').doc(postId);
        const doc = await docRef.get();

        if (doc.exists) {
            const post = doc.data();
            postTitleHead.textContent = `${post.title} | DharTee Services`;
            
            postContentEl.innerHTML = `
                <span class="text-sm font-semibold text-white bg-primary py-1 px-3 rounded-full">${post.category}</span>
                <h1 class="text-3xl md:text-4xl font-bold text-dark my-4">${post.title}</h1>
                <div class="text-sm text-gray-500 mb-6">
                    <span>By Dharmendra Sharma</span> | <span>Published on ${new Date(post.date).toLocaleDateString()}</span>
                </div>
                <img class="w-full rounded-lg shadow-md mb-8" src="${post.image}" alt="${post.title}">
                <div class="post-content text-lg leading-relaxed">
                    ${post.fullContent}
                </div>
            `;
        } else {
            console.error("No such document!");
            postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Post not found.</h1>';
        }
    } catch (error) {
        console.error("Error getting document:", error);
        postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Error loading post.</h1>';
    }
});