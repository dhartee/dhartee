// admin.js
document.addEventListener('DOMContentLoaded', () => {
    const postsCollection = db.collection('posts');
    const form = document.getElementById('post-form');
    const formTitle = document.getElementById('form-title');
    const postIdInput = document.getElementById('post-id');
    const titleInput = document.getElementById('post-title');
    const categoryInput = document.getElementById('post-category');
    const imageInput = document.getElementById('post-image');
    const contentInput = document.getElementById('post-content');
    const fullContentInput = document.getElementById('post-full-content');
    const postsList = document.getElementById('posts-list');
    const submitButton = document.getElementById('submit-button');
    const cancelEditButton = document.getElementById('cancel-edit');

    // RENDER posts from Firebase
    const renderPosts = async () => {
        postsList.innerHTML = '';
        const snapshot = await postsCollection.orderBy('date', 'desc').get();
        if (snapshot.empty) {
            postsList.innerHTML = '<p class="text-gray-500">No posts yet.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const post = doc.data();
            const postElement = document.createElement('div');
            postElement.className = 'flex items-center justify-between p-3 bg-gray-50 rounded-lg border';
            postElement.innerHTML = `
                <div>
                    <p class="font-semibold text-gray-800">${post.title}</p>
                    <p class="text-sm text-gray-500">${post.category} - ${new Date(post.date).toLocaleDateString()}</p>
                </div>
                <div class="space-x-2">
                    <button class="edit-btn px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600" data-id="${doc.id}">Edit</button>
                    <button class="delete-btn px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600" data-id="${doc.id}">Delete</button>
                </div>
            `;
            postsList.appendChild(postElement);
        });
    };

    // SUBMIT form (Create/Update)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = postIdInput.value;
        const postData = {
            title: titleInput.value,
            category: categoryInput.value,
            image: imageInput.value,
            content: contentInput.value,
            fullContent: fullContentInput.value,
            date: new Date().toISOString()
        };

        if (id) {
            await postsCollection.doc(id).update(postData);
        } else {
            await postsCollection.add(postData);
        }
        renderPosts();
        resetForm();
    });

    // CLICK handler for Edit/Delete
    postsList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-btn')) {
            const doc = await postsCollection.doc(id).get();
            const postToEdit = doc.data();
            formTitle.textContent = 'Edit Post';
            submitButton.textContent = 'Update Post';
            postIdInput.value = id;
            titleInput.value = postToEdit.title;
            categoryInput.value = postToEdit.category;
            imageInput.value = postToEdit.image;
            contentInput.value = postToEdit.content;
            fullContentInput.value = postToEdit.fullContent;
            cancelEditButton.classList.remove('hidden');
            window.scrollTo(0, 0);
        }

        if (e.target.classList.contains('delete-btn')) {
            if (confirm('Are you sure you want to delete this post?')) {
                await postsCollection.doc(id).delete();
                renderPosts();
            }
        }
    });

    const resetForm = () => {
        form.reset();
        postIdInput.value = '';
        formTitle.textContent = 'Publish New Post';
        submitButton.textContent = 'Publish Post';
        cancelEditButton.classList.add('hidden');
    };
    
    cancelEditButton.addEventListener('click', resetForm);

    renderPosts();
});