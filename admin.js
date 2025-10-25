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

    // NEW: Editor Elements
    const composeViewBtn = document.getElementById('compose-view-btn');
    const htmlViewBtn = document.getElementById('html-view-btn');
    const editorContainer = document.getElementById('editor-container');
    const htmlEditor = document.getElementById('html-editor');
    let isHtmlView = false;

    // Initialize Quill Rich Text Editor
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
    
    // NEW: Function to toggle between Compose and HTML views
    const toggleEditorView = (showHtml) => {
        if (showHtml) {
            // Sync from Quill to HTML textarea
            htmlEditor.value = quill.root.innerHTML;
            editorContainer.classList.add('hidden');
            htmlEditor.classList.remove('hidden');
            htmlViewBtn.classList.add('active');
            composeViewBtn.classList.remove('active');
            isHtmlView = true;
        } else {
            // Sync from HTML textarea to Quill
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

    // RENDER existing posts
    const renderPosts = async () => { /* ... (no changes here) ... */ };

    // SUBMIT form (Create/Update)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = postIdInput.value;
        
        // NEW: Get content from the currently active editor
        const fullContent = isHtmlView ? htmlEditor.value : quill.root.innerHTML;

        const postData = {
            title: titleInput.value,
            slug: slugInput.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            category: categoryInput.value,
            image: imageInput.value,
            content: contentInput.value,
            fullContent: fullContent, // Use the content from the active view
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
            
            // Populate all fields
            postIdInput.value = id;
            titleInput.value = postToEdit.title;
            slugInput.value = postToEdit.slug;
            categoryInput.value = postToEdit.category;
            imageInput.value = postToEdit.image;
            contentInput.value = postToEdit.content;
            
            // NEW: Set content for BOTH editors
            quill.root.innerHTML = postToEdit.fullContent || '';
            htmlEditor.value = postToEdit.fullContent || '';

            cancelEditButton.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
        // ... (delete logic remains the same) ...
    });

    // Reset form to default state
    const resetForm = () => {
        form.reset();
        postIdInput.value = '';
        slugInput.value = '';
        formTitle.textContent = 'Publish New Post';
        submitButton.textContent = 'Publish Post';
        cancelEditButton.classList.add('hidden');
        
        // NEW: Clear both editors and reset to compose view
        quill.root.innerHTML = '';
        htmlEditor.value = '';
        toggleEditorView(false); 
    }
    
    cancelEditButton.addEventListener('click', resetForm);

    renderPosts(); // Initial load of posts
});
