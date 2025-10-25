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
    const postsList = document.getElementById('posts-list');
    const submitButton = document.getElementById('submit-button');
    const cancelEditButton = document.getElementById('cancel-edit');

    // Initialize Quill editor
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Write your full article content here...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'script': 'sub'}, { 'script': 'super' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'direction': 'rtl' }],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'align': [] }],
                ['link', 'image', 'video'], // 'video' if you want video embed
                ['clean']
            ]
        }
    });

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
            postElement.className = 'post-item'; // Use the class from style.css
            postElement.innerHTML = `
                <div class="post-item-info">
                    <p class="font-semibold text-gray-800">${post.title}</p>
                    <p class="text-sm text-gray-500">${post.category} - ${new Date(post.date).toLocaleDateString()}</p>
                </div>
                <div class="post-item-actions">
                    <button class="edit-btn px-3 py-1.5 text-xs font-medium bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors" data-id="${doc.id}">Edit</button>
                    <button class="delete-btn px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors" data-id="${doc.id}">Delete</button>
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
            // Get HTML content from Quill editor
            fullContent: quill.root.innerHTML, 
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
            
            // Set HTML content to Quill editor
            quill.root.innerHTML = postToEdit.fullContent || ''; 

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

    // Reset form to default state
    const resetForm = () => {
        form.reset();
        postIdInput.value = '';
        formTitle.textContent = 'Publish New Post';
        submitButton.textContent = 'Publish Post';
        cancelEditButton.classList.add('hidden');
        quill.root.innerHTML = ''; // Clear Quill editor content
    }
    
    cancelEditButton.addEventListener('click', resetForm);

    renderPosts();
});
