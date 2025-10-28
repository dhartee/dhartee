// post.js (Final Corrected Version)
document.addEventListener('DOMContentLoaded', () => {
    // A short delay to ensure Firebase is fully initialized
    setTimeout(async () => {
        if (typeof firebase === 'undefined' || typeof firebase.firestore === 'undefined') {
            console.error("Firebase is not initialized.");
            return;
        }

        const db = firebase.firestore();
        const postsCollection = db.collection('posts');
        const postContentEl = document.getElementById('full-post-content');
        const postTitleHead = document.getElementById('post-title-head');
        const navigationContainer = document.getElementById('post-navigation-container');
        
        try {
            // Get the slug from the URL
            const path = window.location.pathname;
            const slug = path.split('/').pop();

            if (!slug || !postContentEl) {
                if (postContentEl) postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Post Not Found</h1>';
                return;
            }

            // --- 1. Fetch the Current Post ---
            const snapshot = await postsCollection.where('slug', '==', slug).limit(1).get();

            if (snapshot.empty) {
                postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Post not found.</h1>';
                return;
            } 
            
            const currentPostDoc = snapshot.docs[0];
            const post = currentPostDoc.data();
            
            // Populate the article content
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
            
            // --- 2. Fetch Previous and Next Posts ---
            const fetchAdjacentPosts = async () => {
                // Previous Post: Order by date descending, find first one older than current
                const prevQuery = await postsCollection
                    .orderBy('date', 'desc')
                    .where('date', '<', post.date)
                    .limit(1)
                    .get();
                
                // Next Post: Order by date ascending, find first one newer than current
                const nextQuery = await postsCollection
                    .orderBy('date', 'asc')
                    .where('date', '>', post.date)
                    .limit(1)
                    .get();

                let navHTML = '';
                
                if (!prevQuery.empty) {
                    const prevPost = prevQuery.docs[0].data();
                    navHTML += `
                        <a href="/blog/${prevPost.slug}" class="prev-post">
                            <div class="nav-label">&larr; Previous Article</div>
                            <div class="nav-title">${prevPost.title}</div>
                        </a>
                    `;
                } else {
                     navHTML += `<div></div>`; // Empty div for spacing
                }

                if (!nextQuery.empty) {
                    const nextPost = nextQuery.docs[0].data();
                    navHTML += `
                        <a href="/blog/${nextPost.slug}" class="next-post">
                            <div class="nav-label">Next Article &rarr;</div>
                            <div class="nav-title">${nextPost.title}</div>
                        </a>
                    `;
                }
                
                if (navigationContainer) navigationContainer.innerHTML = navHTML;
            };

            fetchAdjacentPosts();

            // --- 3. Load Disqus Comments ---
            loadDisqus(currentPostDoc.id, post.slug);

        } catch (error) {
            console.error("Error getting document:", error);
            if (postContentEl) postContentEl.innerHTML = '<h1 class="text-2xl font-bold text-center">Error loading post.</h1>';
        }
    }, 100);
});

// Function to load Disqus
function loadDisqus(postId, postSlug) {
    const disqus_config = function () {
        this.page.url = `https://dhartee.in/blog/${postSlug}`;
        this.page.identifier = postId;
    };
    
    // Replace 'YOUR_DISQUS_SHORTNAME' with your actual shortname
    const shortname = 'dhartee'; 
    
    (function() { 
        const d = document, s = d.createElement('script');
        s.src = `https://${shortname}.disqus.com/embed.js`;
        s.setAttribute('data-timestamp', +new Date());
        (d.head || d.body).appendChild(s);
    })();
}
