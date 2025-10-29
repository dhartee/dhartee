// admin.js (upgraded)
// Requires: firebase (compat), quill included in admin.html
document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const postsCollection = db.collection('posts');
  const storageRef = storage.ref();
  const form = document.getElementById('post-form');
  const formTitle = document.getElementById('form-title');
  const postIdInput = document.getElementById('post-id');
  const titleInput = document.getElementById('post-title');
  const slugInput = document.getElementById('post-slug');
  const categoryInput = document.getElementById('post-category');
  const statusSelect = document.getElementById('post-status');
  const featuredFile = document.getElementById('post-image-file');
  const featuredUrl = document.getElementById('post-image-url');
  const featuredPreviewWrap = document.getElementById('featured-preview');
  const featuredPreviewImg = document.getElementById('featured-preview-img');
  const ogFile = document.getElementById('og-image-file');
  const ogUrl = document.getElementById('og-image-url');
  const ogPreviewWrap = document.getElementById('og-preview');
  const ogPreviewImg = document.getElementById('og-preview-img');
  const excerptInput = document.getElementById('post-content');
  const excerptCount = document.getElementById('excerpt-count');

  const metaTitle = document.getElementById('meta-title');
  const metaDesc = document.getElementById('meta-desc');
  const metaCount = document.getElementById('meta-count');
  const focusKeyword = document.getElementById('focus-keyword');
  const seoTitlePreview = document.getElementById('seo-title-preview');
  const seoDescPreview = document.getElementById('seo-desc-preview');
  const seoSlugPreview = document.getElementById('seo-slug');

  const composeViewBtn = document.getElementById('compose-view-btn');
  const htmlViewBtn = document.getElementById('html-view-btn');
  const editorContainer = document.getElementById('editor-container');
  const htmlEditor = document.getElementById('html-editor');

  const submitButton = document.getElementById('submit-button');
  const cancelEditButton = document.getElementById('cancel-edit');
  const postsList = document.getElementById('posts-list');
  const searchInput = document.getElementById('search-input');
  const filterCategory = document.getElementById('filter-category');
  const filterStatus = document.getElementById('filter-status');
  const refreshList = document.getElementById('refresh-list');
  const lastSaved = document.getElementById('last-saved');
  const generateSlugBtn = document.getElementById('generate-slug');
  const darkToggle = document.getElementById('dark-toggle');

  // Quill editor
  const quill = new Quill('#editor-container', {
    theme: 'snow',
    placeholder: 'Write your full article content here...',
    modules: {
      toolbar: [
        [{ header: [1,2,3,false] }],
        ['bold','italic','underline','strike'],
        ['blockquote','code-block'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        [{ color: [] }, { background: [] }], [{ align: [] }],
        ['link','image'], ['clean']
      ]
    }
  });

  // State
  let isHtmlView = false;
  let postsCache = []; // client side cache for search/filter

  const showToast = (msg, type = 'success') => {
    const t = document.getElementById('toast');
    t.innerHTML = `<div class="max-w-xs p-3 rounded shadow ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}">${msg}</div>`;
    t.classList.remove('hidden');
    setTimeout(()=> t.classList.add('hidden'), 3500);
  };

  // Toggle editor view
  const toggleEditorView = (showHtml) => {
    if (showHtml) {
      htmlEditor.value = quill.root.innerHTML;
      editorContainer.classList.add('hidden');
      htmlEditor.classList.remove('hidden');
      htmlViewBtn.classList.add('bg-slate-100');
      composeViewBtn.classList.remove('bg-slate-100');
      isHtmlView = true;
    } else {
      quill.root.innerHTML = htmlEditor.value;
      editorContainer.classList.remove('hidden');
      htmlEditor.classList.add('hidden');
      composeViewBtn.classList.add('bg-slate-100');
      htmlViewBtn.classList.remove('bg-slate-100');
      isHtmlView = false;
    }
  };
  composeViewBtn.addEventListener('click', () => toggleEditorView(false));
  htmlViewBtn.addEventListener('click', () => toggleEditorView(true));

  // Dark mode toggle
  darkToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('bg-slate-900', 'text-white');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-slate-900', 'text-white');
    }
  });

  // Slug generation utility
  const slugify = (text) => {
    return text.toString().toLowerCase()
      .replace(/\s+/g, '-')           // Replace spaces with -
      .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
      .replace(/\-\-+/g, '-')         // Replace multiple - with single -
      .replace(/^-+/, '')             // Trim - from start of text
      .replace(/-+$/, '');            // Trim - from end of text
  };

  // Live slug from title
  titleInput.addEventListener('input', () => {
    const auto = slugify(titleInput.value);
    if (!postIdInput.value) { // only auto if creating new (not editing custom slug)
      slugInput.value = auto;
    }
    seoTitlePreview.textContent = metaTitle.value || titleInput.value || 'Meta title preview';
    seoSlugPreview.textContent = slugInput.value || 'my-post';
  });
  generateSlugBtn.addEventListener('click', () => {
    slugInput.value = slugify(titleInput.value || slugInput.value);
    seoSlugPreview.textContent = slugInput.value;
  });

  // Char counters
  excerptInput.addEventListener('input', () => {
    excerptCount.textContent = `${excerptInput.value.length}/200`;
  });
  metaDesc.addEventListener('input', () => {
    metaCount.textContent = `${metaDesc.value.length}/160`;
    seoDescPreview.textContent = metaDesc.value || 'Meta description preview...';
  });
  metaTitle.addEventListener('input', () => {
    seoTitlePreview.textContent = metaTitle.value || titleInput.value || 'Meta title preview';
  });
  slugInput.addEventListener('input', () => {
    seoSlugPreview.textContent = slugInput.value || 'my-post';
  });

  // Image preview helpers
  const previewFile = (file, imgEl, wrapEl) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      imgEl.src = e.target.result;
      wrapEl.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
  };

  featuredFile.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) previewFile(f, featuredPreviewImg, featuredPreviewWrap);
  });
  ogFile.addEventListener('change', (e) => {
    const f = e.target.files[0];
    if (f) previewFile(f, ogPreviewImg, ogPreviewWrap);
  });
  featuredUrl.addEventListener('input', () => {
    const v = featuredUrl.value.trim();
    if (v) {
      featuredPreviewImg.src = v;
      featuredPreviewWrap.classList.remove('hidden');
    }
  });
  ogUrl.addEventListener('input', () => {
    const v = ogUrl.value.trim();
    if (v) {
      ogPreviewImg.src = v;
      ogPreviewWrap.classList.remove('hidden');
    }
  });

  // Upload to Firebase Storage and return URL
  const uploadToStorage = async (file, folder = 'post-images') => {
    if (!file) return null;
    const name = `${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
    const ref = storageRef.child(`${folder}/${name}`);
    const snapshot = await ref.put(file);
    const url = await snapshot.ref.getDownloadURL();
    return url;
  };

  // Render posts (client-side)
  const renderPosts = (list) => {
    postsList.innerHTML = '';
    if (!list || !list.length) {
      postsList.innerHTML = '<p class="text-slate-500">No posts found.</p>';
      return;
    }
    list.forEach(doc => {
      const id = doc.id || doc._id || '';
      const post = (doc.data) ? doc.data() : doc; // support cached objects
      const thumb = post.image || '';
      const dateStr = post.date ? new Date(post.date).toLocaleString() : '';
      const item = document.createElement('div');
      item.className = 'flex items-center justify-between p-3 rounded border';
      item.innerHTML = `
        <div class="flex items-center gap-3">
          <img src="${thumb || 'https://via.placeholder.com/120x80?text=No+Image'}" class="thumb-sm" alt="thumb" />
          <div>
            <div class="font-semibold text-slate-800">${post.title || '(no title)'}</div>
            <div class="text-xs text-slate-500">${post.category || 'Uncategorized'} • ${dateStr}</div>
            <div class="text-xs text-slate-400">${post.status || 'published'} • ${post.slug || ''}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button class="edit-btn px-3 py-1 rounded bg-yellow-500 text-white" data-id="${id}">Edit</button>
          <button class="copy-url-btn px-3 py-1 rounded border" data-url="${window.location.origin}/blog/${post.slug || ''}">Copy URL</button>
          <button class="delete-btn px-3 py-1 rounded bg-red-600 text-white" data-id="${id}">Delete</button>
        </div>
      `;
      postsList.appendChild(item);
    });
  };

  // Get and cache posts
  const fetchPosts = async () => {
    postsList.innerHTML = '<p class="text-slate-500">Loading posts...</p>';
    const snapshot = await postsCollection.orderBy('date', 'desc').get();
    const arr = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data._id = doc.id;
      arr.push(data);
    });
    postsCache = arr;
    populateCategoryFilter(arr);
    renderPosts(arr);
  };

  // Populate category select
  const populateCategoryFilter = (arr) => {
    const cats = Array.from(new Set(arr.map(p => p.category).filter(Boolean)));
    filterCategory.innerHTML = `<option value="">All Categories</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
  };

  // Search & Filter client-side
  const applyFilters = () => {
    const q = (searchInput.value || '').toLowerCase();
    const cat = filterCategory.value;
    const st = filterStatus.value;
    let filtered = postsCache.slice();
    if (q) {
      filtered = filtered.filter(p => (p.title||'').toLowerCase().includes(q) || (p.excerpt||'').toLowerCase().includes(q) || (p.metaDescription||'').toLowerCase().includes(q));
    }
    if (cat) filtered = filtered.filter(p => p.category === cat);
    if (st) filtered = filtered.filter(p => p.status === st);
    renderPosts(filtered);
  };
  searchInput.addEventListener('input', applyFilters);
  filterCategory.addEventListener('change', applyFilters);
  filterStatus.addEventListener('change', applyFilters);
  refreshList.addEventListener('click', fetchPosts);

  // Form submit: create or update
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';

    try {
      const id = postIdInput.value;
      // images: prioritize file upload, else URL, else null
      let featuredImageUrl = featuredUrl.value.trim() || null;
      let ogImageUrlFinal = ogUrl.value.trim() || null;

      if (featuredFile.files && featuredFile.files[0]) {
        featuredImageUrl = await uploadToStorage(featuredFile.files[0], 'featured-images');
      }
      if (ogFile.files && ogFile.files[0]) {
        ogImageUrlFinal = await uploadToStorage(ogFile.files[0], 'og-images');
      }

      const contentHTML = isHtmlView ? htmlEditor.value : quill.root.innerHTML;

      const postData = {
        title: titleInput.value.trim(),
        slug: slugify(slugInput.value.trim()),
        category: categoryInput.value.trim(),
        excerpt: excerptInput.value.trim(),
        image: featuredImageUrl || '',
        ogImage: ogImageUrlFinal || '',
        content: excerptInput.value.trim(),
        fullContent: contentHTML,
        metaTitle: metaTitle.value.trim(),
        metaDescription: metaDesc.value.trim(),
        focusKeyword: focusKeyword.value.trim(),
        status: statusSelect.value || 'published',
        date: new Date().toISOString()
      };

      if (id) {
        await postsCollection.doc(id).update(postData);
        showToast('Post updated');
      } else {
        await postsCollection.add(postData);
        showToast('Post published');
      }
      await fetchPosts();
      resetForm();
      lastSaved.textContent = new Date().toLocaleString();
    } catch (err) {
      console.error(err);
      showToast('Error saving post', 'error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = postIdInput.value ? 'Update Post' : 'Publish Post';
    }
  });

  // Reset form
  const resetForm = () => {
    form.reset();
    postIdInput.value = '';
    formTitle.textContent = 'Publish New Post';
    submitButton.textContent = 'Publish Post';
    cancelEditButton.classList.add('hidden');
    quill.root.innerHTML = '';
    htmlEditor.value = '';
    featuredPreviewWrap.classList.add('hidden');
    ogPreviewWrap.classList.add('hidden');
    excerptCount.textContent = '0/200';
    metaCount.textContent = '0/160';
    seoTitlePreview.textContent = 'Meta title preview';
    seoDescPreview.textContent = 'Meta description preview...';
    seoSlugPreview.textContent = 'my-post';
    toggleEditorView(false);
  };
  cancelEditButton.addEventListener('click', resetForm);

  // Delegate edit/delete/copy
  postsList.addEventListener('click', async (e) => {
    if (e.target.classList.contains('edit-btn')) {
      // load doc into form
      const id = e.target.dataset.id;
      if (!id) return;
      const doc = await postsCollection.doc(id).get();
      const p = doc.data();
      postIdInput.value = id;
      formTitle.textContent = 'Edit Post';
      submitButton.textContent = 'Update Post';
      cancelEditButton.classList.remove('hidden');

      titleInput.value = p.title || '';
      slugInput.value = p.slug || '';
      categoryInput.value = p.category || '';
      statusSelect.value = p.status || 'published';
      excerptInput.value = p.excerpt || '';
      featuredUrl.value = p.image || '';
      ogUrl.value = p.ogImage || '';
      metaTitle.value = p.metaTitle || '';
      metaDesc.value = p.metaDescription || '';
      focusKeyword.value = p.focusKeyword || '';
      quill.root.innerHTML = p.fullContent || '';
      htmlEditor.value = p.fullContent || '';

      if (p.image) {
        featuredPreviewImg.src = p.image;
        featuredPreviewWrap.classList.remove('hidden');
      }
      if (p.ogImage) {
        ogPreviewImg.src = p.ogImage;
        ogPreviewWrap.classList.remove('hidden');
      }

      seoTitlePreview.textContent = metaTitle.value || titleInput.value;
      seoDescPreview.textContent = metaDesc.value || '';
      seoSlugPreview.textContent = slugInput.value || '';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (e.target.classList.contains('delete-btn')) {
      const id = e.target.dataset.id;
      if (!id) return;
      if (confirm('Are you sure you want to delete this post?')) {
        await postsCollection.doc(id).delete();
        showToast('Post deleted');
        await fetchPosts();
      }
    }

    if (e.target.classList.contains('copy-url-btn')) {
      const url = e.target.dataset.url;
      navigator.clipboard.writeText(url).then(() => {
        showToast('URL copied to clipboard');
      });
    }
  });

  // initial fetch
  fetchPosts().catch(console.error);

  // helper: sanitize slug externally called
  window.slugify = slugify;
});
