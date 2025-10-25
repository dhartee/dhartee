// Replace the entire contents of post.js with this
document.addEventListener('DOMContentLoaded', async () => {
    const postContentEl = document.getElementById('full-post-content');
    const postTitleHead = document.getElementById('post-title-head');

    try {
        // Get the slug from the URL path (e.g., /blog/my-first-post)
        const path = window.location.pathname;
        const slug = path.split('/').pop();

        if (!slug) {
            postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Post Not Found</h1>';
            return;
        }

        // Query Firestore to find the post with the matching slug
        const postsCollection = db.collection('posts');
        const snapshot = await postsCollection.where('slug', '==', slug).limit(1).get();

        if (snapshot.empty) {
            console.error("No such document!");
            postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Post not found.</h1>';
            return;
        } 

        const post = snapshot.docs[0].data();
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

    } catch (error) {
        console.error("Error getting document:", error);
        postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Error loading post.</h1>';
    }
});
