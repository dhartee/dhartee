// admin.js (v2 - Static Site Generator के साथ)
// इस कोड से अपनी पुरानी admin.js फ़ाइल को पूरी तरह बदल दें।

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
  
  // --- नया बटन ---
  const generateSiteBtn = document.getElementById('generate-site-btn');

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
      
      // --- महत्वपूर्ण बदलाव: URL को नए स्टैटिक पाथ पर ले जाएँ ---
      const postUrl = `posts/${post.slug}.html`;
      
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
          <button class="copy-url-btn px-3 py-1 rounded border" data-url="https://dhartee.in/${postUrl}">Copy URL</button>
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
      data._id = doc.id; // Store firestore id
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
        content: excerptInput.value.trim(), // 'content' field is used for the blog list excerpt
        fullContent: contentHTML, // 'fullContent' is for the post page
        metaTitle: metaTitle.value.trim(),
        metaDescription: metaDesc.value.trim(),
        focusKeyword: focusKeyword.value.trim(),
        status: statusSelect.value || 'published',
        date: new Date().toISOString()
      };

      if (id) {
        // Update existing document
        const postRef = postsCollection.doc(id);
        const doc = await postRef.get();
        if (doc.exists) {
            // Merge existing date if not provided (so we don't overwrite created date)
            const existingData = doc.data();
            await postRef.update({
                ...postData,
                date: existingData.date // Keep original date on update
            });
        }
        showToast('Post updated');
      } else {
        // Create new document
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
    featuredPreviewImg.src = '';
    ogPreviewWrap.classList.add('hidden');
    ogPreviewImg.src = '';
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
      if (!doc.exists) {
          showToast('Error: Post not found in database.', 'error');
          return;
      }
      const p = doc.data();
      postIdInput.value = id;
      formTitle.textContent = 'Edit Post';
      submitButton.textContent = 'Update Post';
      cancelEditButton.classList.remove('hidden');

      titleInput.value = p.title || '';
      slugInput.value = p.slug || '';
      categoryInput.value = p.category || '';
      statusSelect.value = p.status || 'published';
      excerptInput.value = p.excerpt || p.content || ''; // Fallback to content
      featuredUrl.value = p.image || '';
      ogUrl.value = p.ogImage || '';
      metaTitle.value = p.metaTitle || '';
      metaDesc.value = p.metaDescription || '';
      focusKeyword.value = p.focusKeyword || '';
      quill.root.innerHTML = p.fullContent || '';
      htmlEditor.value = p.fullContent || '';
      
      excerptCount.textContent = `${(p.excerpt || p.content || '').length}/200`;
      metaCount.textContent = `${(p.metaDescription || '').length}/160`;

      featuredPreviewWrap.classList.add('hidden');
      ogPreviewWrap.classList.add('hidden');

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

  // --- 
  // --- नया स्टैटिक साइट जनरेटर (SSG) फंक्शन ---
  // ---
  
  if (generateSiteBtn) {
      generateSiteBtn.addEventListener('click', async () => {
          showToast('Generating site... Please wait.', 'success');
          generateSiteBtn.disabled = true;
          generateSiteBtn.textContent = 'Generating...';

          try {
              const zip = new JSZip();
              const siteUrl = "httpsS://dhartee.in"; // आपकी वेबसाइट का URL

              // 1. Firebase से सभी 'published' पोस्ट प्राप्त करें
              const snapshot = await postsCollection
                  .where('status', '==', 'published')
                  .orderBy('date', 'desc')
                  .get();
              
              const posts = [];
              snapshot.forEach(doc => {
                  const data = doc.data();
                  data.id = doc.id; // ID को भी सेव करें
                  posts.push(data);
              });

              if (posts.length === 0) {
                  showToast('No published posts found to generate.', 'error');
                  return;
              }

              // 2. पोस्ट टेम्प्लेट और ब्लॉग लिस्ट टेम्प्लेट लोड करें
              // (हम इन्हें हार्डकोड कर रहे हैं ताकि fetch() की ज़रूरत न पड़े)
              const postTemplate = getPostTemplate();
              const blogTemplate = getBlogTemplate();
              
              const postsFolder = zip.folder('posts');
              let blogGridHtml = '';
              let sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
              
              // होमपेज और ब्लॉग इंडेक्स को sitemap में जोड़ें
              const today = new Date().toISOString().split('T')[0];
              sitemapXml += `  <url>\n    <loc>${siteUrl}/</loc>\n    <lastmod>${today}</lastmod>\n    <priority>1.00</priority>\n  </url>\n`;
              sitemapXml += `  <url>\n    <loc>${siteUrl}/blog.html</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.80</priority>\n  </url>\n`;

              // 3. हर पोस्ट के लिए लूप करें
              for (let i = 0; i < posts.length; i++) {
                  const post = posts[i];
                  const postDate = new Date(post.date).toLocaleDateString('en-IN');
                  const postUrl = `${siteUrl}/posts/${post.slug}.html`;
                  const pageTitle = `${post.metaTitle || post.title} | DharTee Services`;
                  const metaDesc = post.metaDescription || post.excerpt;
                  const postImage = post.image || 'https://i.ibb.co/WpyrsNN5/dhartee-logo.png';
                  const ogImage = post.ogImage || postImage;

                  // 3a. ब्लॉग लिस्ट पेज के लिए HTML कार्ड बनाएँ
                  blogGridHtml += `
                    <div class="blog-card bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
                        <a href="posts/${post.slug}.html" class="block">
                            <img loading="lazy" class="w-full h-56 object-cover" src="${post.image}" alt="${post.title}">
                        </a>
                        <div class="p-6 flex flex-col flex-grow">
                            <span class="text-sm font-semibold text-white bg-primary py-1 px-3 rounded-full self-start mb-4">${post.category}</span>
                            <h3 class="text-xl font-bold text-dark mb-2">
                                <a href="posts/${post.slug}.html" class="hover:text-primary transition-colors">${post.title}</a>
                            </h3>
                            <p class="text-gray-600 mb-4 flex-grow">${post.excerpt}</p>
                            <div class="mt-auto pt-4 border-t border-gray-200 flex items-center justify-between">
                                <div class="text-sm text-gray-500">
                                    <span>By Dharmendra Sharma</span><br/>
                                    <span>${postDate}</span>
                                </div>
                                <a href="posts/${post.slug}.html" class="font-bold text-primary hover:text-blue-700">Read More &rarr;</a>
                            </div>
                        </div>
                    </div>
                  `;
                  
                  // 3b. अलग पोस्ट पेज HTML बनाएँ
                  let postPageHtml = postTemplate;

                  // Meta/SEO टैग्स बदलें
                  postPageHtml = postPageHtml.replace(/{{POST_TITLE}}/g, pageTitle);
                  postPageHtml = postPageHtml.replace(/{{META_DESCRIPTION}}/g, metaDesc);
                  postPageHtml = postPageHtml.replace(/{{CANONICAL_URL}}/g, postUrl);
                  postPageHtml = postPageHtml.replace(/{{OG_TITLE}}/g, pageTitle);
                  postPageHtml = postPageHtml.replace(/{{OG_DESCRIPTION}}/g, metaDesc);
                  postPageHtml = postPageHtml.replace(/{{OG_IMAGE}}/g, ogImage);
                  postPageHtml = postPageHtml.replace(/{{OG_URL}}/g, postUrl);
                  postPageHtml = postPageHtml.replace(/{{TWITTER_TITLE}}/g, pageTitle);
                  postPageHtml = postPageHtml.replace(/{{TWITTER_DESCRIPTION}}/g, metaDesc);
                  postPageHtml = postPageHtml.replace(/{{TWITTER_IMAGE}}/g, ogImage);
                  
                  // Disqus कॉन्फ़िगरेशन जोड़ें
                  postPageHtml = postPageHtml.replace(/{{DISQUS_PAGE_URL}}/g, postUrl);
                  postPageHtml = postPageHtml.replace(/{{DISQUS_PAGE_IDENTIFIER}}/g, post.id);

                  // मुख्य कंटेंट भरें
                  const postContentHtml = `
                    <h2 class="text-lg font-semibold text-primary mb-2">${post.category}</h2>
                    <h1 class="text-3xl md:text-4xl font-bold text-dark my-4">${post.title}</h1>
                    <div class="text-sm text-gray-500 mb-6">
                        <span>By Dharmendra Sharma</span> | <span>Published on ${postDate}</span>
                    </div>
                    <img loading="lazy" class="w-full rounded-lg shadow-md mb-8" src="${post.image}" alt="${post.title}">
                    <div class="post-content text-lg leading-relaxed">
                        ${post.fullContent}
                    </div>
                  `;
                  postPageHtml = postPageHtml.replace('{{POST_CONTENT_HERE}}', postContentHtml);
                  
                  // अगला/पिछला पोस्ट नेविगेशन (अभी के लिए खाली छोड़ते हैं, बाद में जोड़ सकते हैं)
                  postPageHtml = postPageHtml.replace('{{POST_NAVIGATION_HERE}}', ''); 

                  // फ़ाइल को .zip में जोड़ें
                  postsFolder.file(`${post.slug}.html`, postPageHtml);

                  // 3c. Sitemap में एंट्री जोड़ें
                  sitemapXml += `  <url>\n    <loc>${postUrl}</loc>\n    <lastmod>${post.date.split('T')[0]}</lastmod>\n    <priority>0.80</priority>\n  </url>\n`;
              }

              // 4. ब्लॉग इंडेक्स फ़ाइल (blog.html) को पूरा करें
              let finalBlogHtml = blogTemplate.replace('{{BLOG_GRID_CONTENT}}', blogGridHtml);
              zip.file("blog.html", finalBlogHtml);
              
              // 5. Sitemap को पूरा करें
              sitemapXml += `</urlset>`;
              zip.file("sitemap.xml", sitemapXml);
              
              // 6. Zip फ़ाइल जनरेट करें और डाउनलोड करें
              zip.generateAsync({type:"blob"})
                  .then(function(content) {
                      // FileSaver.js का उपयोग करें (या एक अस्थायी लिंक बनाएँ)
                      const link = document.createElement('a');
                      link.href = URL.createObjectURL(content);
                      link.download = "dhartee_website_export.zip";
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      
                      showToast('Site generated and downloaded!', 'success');
                      generateSiteBtn.disabled = false;
                      generateSiteBtn.textContent = 'Generate & Download Site';
                  });

          } catch (error) {
              console.error("Error generating site:", error);
              showToast('Error generating site. Check console.', 'error');
              generateSiteBtn.disabled = false;
              generateSiteBtn.textContent = 'Generate & Download Site';
          }
      });
  }


  // --- 
  // --- TEMPLATE FUNCTIONS ---
  // ---

  function getBlogTemplate() {
    // यह आपके blog.html का स्ट्रक्चर है।
    // {{BLOG_GRID_CONTENT}} वह जगह है जहाँ सभी पोस्ट कार्ड डाले जाएँगे।
    // महत्वपूर्ण: मैंने blog.js स्क्रिप्ट को हटा दिया है।
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Blog | DharTee Services</title>
    <meta name="description" content="Read the latest insights and articles from DharTee Services on taxation, GST, legal matters, and technology for business growth in India.">
    <meta http-equiv="Content-Security-Policy" content="
    default-src 'self'; 
    script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://www.googletagmanager.com https://unpkg.com https://cdn.jsdelivr.net https://www.gstatic.com https://dhartee.disqus.com; 
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com; 
    img-src 'self' https: data:; 
    font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
    connect-src 'self' https://*.googleapis.com https://www.gstatic.com https://cdn.jsdelivr.net https://us-central1-dhartee-blog.cloudfunctions.net https://dhartee.disqus.com https://www.googletagmanager.com https://*.google-analytics.com;
    frame-src 'self' https://disqus.com;
">
    <link rel="canonical" href="https://dhartee.in/blog.html" />
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = { theme: { extend: { colors: { primary: '#2563eb', secondary: '#0ea5e9', accent: '#f97316', dark: '#1e293b', light: '#f8fafc' } } } }
    </script>
    <link rel="stylesheet" href="style.css">
</head>
<body class="bg-light">
<header class="fixed w-full bg-white shadow-md z-50">
    <div class="container mx-auto px-4 py-3 flex justify-between items-center">
        <div class="flex items-center">
            <a href="/">
                <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">D</div>
            </a>
            <a href="/"><span class="ml-2 text-xl font-bold text-dark">DharTee</span></a>
        </div>
        <nav class="hidden md:flex space-x-8">
            <a class="text-dark hover:text-primary font-medium" href="index.html">Home</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#services">Services</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#about">About</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#process">Process</a>
            <a class="text-primary font-bold" href="blog.html">Blog</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#testimonials">Testimonials</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#contact">Contact</a>
        </nav>
        <div class="flex items-center space-x-4">
             <a class="hidden md:flex items-center bg-accent text-white px-4 py-2 rounded-full hover:bg-orange-600 transition" href="tel:8264604505">
                <i data-feather="phone" class="mr-2"></i> Call Now
            </a>
            <a class="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition" href="https://wa.me/918264604505?text=%20Sir%20I%20want%20To%20Enquiry%20About">
                <i data-feather="message-circle"></i>
            </a>
            <button class="md:hidden text-dark" id="menu-toggle">
                <i data-feather="menu"></i>
            </button>
        </div>
    </div>
    <div class="hidden md:hidden bg-white py-4 px-4 shadow-lg" id="mobile-menu">
        <div class="flex flex-col space-y-3">
            <a class="text-dark hover:text-primary font-medium" href="index.html">Home</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#services">Services</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#about">About</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#process">Process</a>
            <a class="text-dark hover:text-primary font-medium" href="blog.html">Blog</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#testimonials">Testimonials</a>
            <a class="text-dark hover:text-primary font-medium" href="index.html#contact">Contact</a>
            <a class="flex items-center bg-accent text-white px-4 py-2 rounded-full hover:bg-orange-600 transition" href="tel:8264604505">
                <i class="mr-2" data-feather="phone"></i> Call Now
            </a>
        </div>
    </div>
</header>
<main class="pt-24 pb-16 md:pt-32 md:pb-24">
    <section id="blog-posts" class="py-12">
        <div class="container mx-auto px-4">
            <div class="text-center mb-16" data-aos="fade-up">
                <h1 class="text-4xl md:text-5xl font-bold text-dark mb-4">Our Insights & Articles</h1>
                <p class="text-gray-600 max-w-2xl mx-auto">Stay updated with the latest news in taxation, legal matters, and technology.</p>
            </div>
            <div class="text-center mb-12">
                <h2 class="text-3xl font-bold text-dark">Latest Posts</h2>
            </div>
            <div id="blog-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {{BLOG_GRID_CONTENT}}
            </div>
        </div>
    </section>
</main>
<footer class="bg-dark text-white pt-16 pb-8">
    <div class="container mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div>
                <div class="flex items-center mb-6">
                    <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">D</div>
                    <span class="ml-2 text-xl font-bold">DharTee</span>
                </div>
                <p class="text-gray-400 mb-6">Professional services for your business growth, including taxation, legal support, web design, and software solutions.</p>
                <div class="flex space-x-4 social-icon">
                    <a href="https://www.facebook.com/dharteeservices/" aria-label="DharTee on Facebook"><i data-feather="facebook"></i></a>
                    <a href="https://x.com/Dharmagour" aria-label="DharTee on Twitter"><i data-feather="twitter"></i></a>
                    <a href="https://www.instagram.com/advocate_dharmendra" aria-label="DharTee on Instagram"><i data-feather="instagram"></i></a>
                    <a href="https://www.linkedin.com/in/dharmendargour/" aria-label="DharTee on LinkedIn"><i data-feather="linkedin"></i></a>
                </div>
            </div>
            <div>
                <h3 class="text-lg font-bold mb-6">Quick Links</h3>
                <ul class="space-y-3">
                    <li><a class="text-gray-400 hover:text-white" href="index.html#home">Home</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="index.html#services">Services</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="index.html#about">About Us</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="index.html#process">Our Process</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="index.html#contact">Contact</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="sitemap.xml">Sitemap</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-lg font-bold mb-6">Services</h3>
                <ul class="space-y-3">
                    <li><a class="text-gray-400 hover:text-white" href="gst_services.html">Taxation and GST Support</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="legal_services.html">Legal Advocate Support</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="web-design.html">Web Designing</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="#">Technical Expert for Coaching</a></li>
                    <li><a class="text-gray-400 hover:text-white" href="#">A TO Z Software Services</a></li>
                </ul>
            </div>
            <div>
                <h3 class="text-lg font-bold mb-6">Newsletter</h3>
                <p class="text-gray-400 mb-4">Subscribe to our newsletter for the latest updates and offers.</p>
                <form class="flex" action="https://formspree.io/f/YOUR_UNIQUE_ID" method="POST">
                    <input class="px-4 py-2 w-full rounded-l-lg focus:outline-none text-dark" placeholder="Your Email" type="email" name="email" />
                    <button class="bg-primary px-4 rounded-r-lg hover:bg-blue-700 transition" type="submit">
                        <i data-feather="send"></i>
                    </button>
                </form>
            </div>
        </div>
        <div class="border-t border-gray-800 pt-8 text-center">
            <p class="text-gray-400">&copy; 2025 DharTee. All Rights Reserved.</p>
        </div>
    </div>
</footer>

<script src="https://unpkg.com/aos@2.3.1/dist/aos.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js" defer></script>
<script src="script.js" defer></script>
</body>
</html>`;
  }

  function getPostTemplate() {
    // यह आपके post.html का स्ट्रक्चर है।
    // {{PLACEHOLDERS}} को असली डेटा से बदल दिया जाएगा।
    // महत्वपूर्ण: मैंने post.js स्क्रिप्ट को हटा दिया है।
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title id="post-title-head">{{POST_TITLE}}</title>
    <meta name="description" content="{{META_DESCRIPTION}}" id="meta-description">
    <link rel="canonical" href="{{CANONICAL_URL}}" id="canonical-link" />
    
    <meta property="og:title" content="{{OG_TITLE}}" id="og-title">
    <meta property="og:description" content="{{OG_DESCRIPTION}}" id="og-description">
    <meta property="og:image" content="{{OG_IMAGE}}" id="og-image">
    <meta property="og:url" content="{{OG_URL}}" id="og-url">
    <meta property="og:type" content="article">
    
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{{TWITTER_TITLE}}" id="twitter-title">
    <meta name="twitter:description" content="{{TWITTER_DESCRIPTION}}" id="twitter-description">
    <meta name="twitter:image" content="{{TWITTER_IMAGE}}" id="twitter-image">

    <meta http-equiv="Content-Security-Policy" content="
    default-src 'self'; 
    script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://www.googletagmanager.com https://unpkg.com https://cdn.jsdelivr.net https://www.gstatic.com https://dhartee.disqus.com https://pagead2.googlesyndication.com https://c.disquscdn.com; 
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com https://unpkg.com; 
    img-src 'self' https: data:; 
    font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com;
    connect-src 'self' https://*.googleapis.com https://www.gstatic.com https://cdn.jsdelivr.net https://dhartee.disqus.com https://www.googletagmanager.com https://*.google-analytics.com https://*.a.run.app;
    frame-src 'self' https://disqus.com;
">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" rel="stylesheet" />
    <link href="https://unpkg.com/aos@2.3.1/dist/aos.css" rel="stylesheet" />
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '#2563eb',
                        secondary: '#0ea5e9',
                        accent: '#f97316',
                        dark: '#1e293b',
                        light: '#f8fafc'
                    }
                }
            }
        }
    </script>
    
    <link rel="stylesheet" href="../style.css"> </head>
<body class="bg-light">

    <header class="fixed w-full bg-white shadow-md z-50">
        <div class="container mx-auto px-4 py-3 flex justify-between items-center">
            <div class="flex items-center">
                <a href="/">
                    <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">D</div>
                </a>
                <a href="/"><span class="ml-2 text-xl font-bold text-dark">DharTee</span></a>
            </div>
            <nav class="hidden md:flex space-x-8">
                <a class="text-dark hover:text-primary font-medium" href="../index.html#home">Home</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#services">Services</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#about">About</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#process">Process</a> <a class="text-dark hover:text-primary font-medium" href="../blog.html">Blog</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#testimonials">Testimonials</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#contact">Contact</a> </Nave>
            <div class="flex items-center space-x-4">
                <a class="hidden md:flex items-center bg-accent text-white px-4 py-2 rounded-full hover:bg-orange-600 transition" href="tel:8264604505">
                    <i class="mr-2" data-feather="phone"></i> Call Now
                </a>
                <a class="bg-green-500 text-white p-2 rounded-full hover:bg-green-600 transition" href="https://wa.me/918264604505?text=%20Sir%20I%20want%20To%20Enquiry%20About">
                    <i data-feather="message-circle"></i>
                </a>
                <button class="md:hidden text-dark" id="menu-toggle">
                    <i data-feather="menu"></i>
                </button>
            </div>
        </div>
        <div class="hidden md:hidden bg-white py-4 px-4 shadow-lg" id="mobile-menu">
            <div class="flex flex-col space-y-3">
                <a class="text-dark hover:text-primary font-medium" href="../index.html#home">Home</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#services">Services</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#about">About</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#process">Process</a> <a class="text-dark hover:text-primary font-medium" href="../blog.html">Blog</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#testimonials">Testimonials</a> <a class="text-dark hover:text-primary font-medium" href="../index.html#contact">Contact</a> <a class="flex items-center bg-accent text-white px-4 py-2 rounded-full hover:bg-orange-600 transition" href="tel:8264604505">
                    <i class="mr-2" data-feather="phone"></i> Call Now
                </a>
            </div>
        </div>
    </header>
<main class="pt-24 pb-16 md:pt-32 md:pb-24">
        <div class="container mx-auto px-4">
            <article id="full-post-content" class="max-w-3xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                {{POST_CONTENT_HERE}}
            </article>

            <nav id="post-navigation-container" class="max-w-3xl mx-auto post-navigation">
                {{POST_NAVIGATION_HERE}}
            </nav>

            <section id="comments" class="max-w-3xl mx-auto mt-12 bg-white p-6 sm:p-8 rounded-lg shadow-lg">
                <h2 class="text-2xl font-bold text-dark mb-4">Comments</h2>
                <div id="disqus_thread"></div>
            </section>
        </div>
    </main>
    
    <footer class="bg-dark text-white pt-16 pb-8">
       <div class="container mx-auto px-4">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                <div>
                    <div class="flex items-center mb-6">
                        <div class="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-xl">D</div>
                        <span class="ml-2 text-xl font-bold">DharTee</span>
                    </div>
                    <p class="text-gray-400 mb-6">Professional services for your business growth, including taxation, legal support, web design, and software solutions.</p>
                    <div class="flex space-x-4 social-icon">
                        <a href="https://www.facebook.com/dharteeservices/" aria-label="DharTee on Facebook"><i data-feather="facebook"></i></a>
                        <a href="https://x.com/Dharmagour" aria-label="DharTee on Twitter"><i data-feather="twitter"></i></a>
                        <a href="https://www.instagram.com/advocate_dharmendra" aria-label="DharTee on Instagram"><i data-feather="instagram"></i></a>
                        <a href="https://www.linkedin.com/in/dharmendargour/" aria-label="DharTee on LinkedIn"><i data-feather="linkedin"></i></a>
                    </div>
                </div>
                <div>
                    <h3 class="text-lg font-bold mb-6">Quick Links</h3>
                    <ul class="space-y-3">
                        <li><a class="text-gray-400 hover:text-white" href="../index.html#home">Home</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../index.html#services">Services</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../index.html#about">About Us</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../index.html#process">Our Process</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../index.html#contact">Contact</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../sitemap.xml">Sitemap</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-bold mb-6">Services</h3>
                    <ul class="space-y-3">
                        <li><a class="text-gray-400 hover:text-white" href="../gst_services.html">Taxation and GST Support</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../legal_services.html">Legal Advocate Support</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="../web-design.html">Web Designing</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="#">Technical Expert for Coaching</a></li>
                        <li><a class="text-gray-400 hover:text-white" href="#">A TO Z Software Services</a></li>
                    </ul>
                </div>
                <div>
                    <h3 class="text-lg font-bold mb-6">Newsletter</h3>
                    <p class="text-gray-400 mb-4">Subscribe for updates and offers.</p>
                    <form class="flex" action="https://formspree.io/f/YOUR_UNIQUE_ID" method="POST">
                        <input class="px-4 py-2 w-full rounded-l-lg focus:outline-none text-dark" placeholder="Your Email" type="email" name="email"/>
                        <button class="bg-primary px-4 rounded-r-lg hover:bg-blue-700 transition" type="submit">
                            <i data-feather="send"></i>
                        </button>
                    </form>
                </div>
            </div>
            <div class="border-t border-gray-800 pt-8 text-center">
                <p class="text-gray-400">&copy; 2025 DharTee. All Rights Reserved.</p>
            </div>
        </div>
    </footer>

    <script>
        var disqus_config = function () {
            this.page.url = '{{DISQUS_PAGE_URL}}';
            this.page.identifier = '{{DISQUS_PAGE_IDENTIFIER}}';
        };
        (function() { 
            var d = document, s = d.createElement('script');
            s.src = 'https://dhartee.disqus.com/embed.js';
            s.setAttribute('data-timestamp', +new Date());
            (d.head || d.body).appendChild(s);
        })();
    </script>
    <noscript>Please enable JavaScript to view the <a href="https://disqus.com/?ref_noscript">comments powered by Disqus.</a></noscript>

    <script src="https://unpkg.com/aos@2.3.1/dist/aos.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/feather-icons/dist/feather.min.js" defer></script>
    <script src="../script.js" defer></script> </body>
</html>`;
  }

  // initial fetch
  fetchPosts().catch(console.error);
});
