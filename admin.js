document.addEventListener('DOMContentLoaded', () => {
    // Firebase and Form Elements
    const postsCollection = db.collection('posts');
    const form = document.getElementById('post-form');
    const formTitle = document.getElementById('form-title');
    const postIdInput = document.getElementById('post-id');
    const titleInput = document.getElementById('post-title');
    const slugInput = document.getElementById('post-slug');
    const categoryInput = document.getElementById('post-category');
    const imageInput = document.getElementById('post-image');
    const contentInput = document.getElementById('post-content');
    const postsList = document.getElementById('posts-list');
    const submitButton = document.getElementById('submit-button');
    const cancelEditButton = document.getElementById('cancel-edit');
    const composeViewBtn = document.getElementById('compose-view-btn');
    const htmlViewBtn = document.getElementById('html-view-btn');
    const editorContainer = document.getElementById('editor-container');
    const htmlEditor = document.getElementById('html-editor');
    let isHtmlView = false;

    // Initialize Quill Editor
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Write your full article content here...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'], ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                [{ 'color': [] }, { 'background': [] }], [{ 'align': [] }],
                ['link', 'image'], ['clean']
            ]
        }
    });

    const toggleEditorView = (showHtml) => {
        if (showHtml) {
            htmlEditor.value = quill.root.innerHTML;
            editorContainer.classList.add('hidden');
            htmlEditor.classList.remove('hidden');
            htmlViewBtn.classList.add('active');
            composeViewBtn.classList.remove('active');
            isHtmlView = true;
        } else {
            quill.root.innerHTML = htmlEditor.value;
            editorContainer.classList.remove('hidden');
            htmlEditor.classList.add('hidden');
            composeViewBtn.classList.add('active');
            htmlViewBtn.classList.remove('active');
            isHtmlView = false;
        }
    };

    composeViewBtn.addEventListener('click', () => toggleEditorView(false));
    htmlViewBtn.addEventListener('click', () => toggleEditorView(true));

    // **FIXED**: RENDER posts from Firebase
    const renderPosts = async () => {
        postsList.innerHTML = '';
        const snapshot = await postsCollection.orderBy('date', 'desc').get();
        if (snapshot.empty) {
            postsList.innerHTML = '<p class="text-gray-500">No posts have been published yet.</p>';
            return;
        }
        snapshot.forEach(doc => {
            const post = doc.data();
            const postElement = document.createElement('div');
            postElement.className = 'post-item';
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

    // Form submission logic
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = postIdInput.value;
        const fullContent = isHtmlView ? htmlEditor.value : quill.root.innerHTML;
        const postData = {
            title: titleInput.value,
            slug: slugInput.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            category: categoryInput.value,
            image: imageInput.value,
            content: contentInput.value,
            fullContent: fullContent,
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

    // Edit/Delete click handler
    postsList.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        if (e.target.classList.contains('edit-btn')) {
            const doc = await postsCollection.doc(id).get();
            const postToEdit = doc.data();
            formTitle.textContent = 'Edit Post';
            submitButton.textContent = 'Update Post';
            postIdInput.value = id;
            titleInput.value = postToEdit.title;
            slugInput.value = postToEdit.slug;
            categoryInput.value = postToEdit.category;
            imageInput.value = postToEdit.image;
            contentInput.value = postToEdit.content;
            quill.root.innerHTML = postToEdit.fullContent || '';
            htmlEditor.value = postToEdit.fullContent || '';
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
        quill.root.innerHTML = '';
        htmlEditor.value = '';
        toggleEditorView(false); 
    };
    
    cancelEditButton.addEventListener('click', resetForm);

    renderPosts();
});
