// PlantaMigos - Feed page
let CLOUD_NAME_FEED     = 'tu_cloud_name_aqui';
const UPLOAD_PRESET_FEED = 'plantamigos_unsigned';

let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const config = await api.getConfig();
    if (config.cloudinaryCloudName) CLOUD_NAME_FEED = config.cloudinaryCloudName;
  } catch (e) {}

  loadFeed();
  setupFeedListeners();
  updateNavbar();
});

async function loadFeed() {
  const container = document.getElementById('feed-container');
  container.innerHTML = `<div style="text-align:center;padding:40px;"><span class="spinner"></span></div>`;
  try {
    const posts = await api.getPosts(currentCategory);
    renderFeed(posts);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><p>${err.message}</p></div>`;
  }
}

function renderFeed(posts) {
  const container = document.getElementById('feed-container');
  if (!posts.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon">🌱</div><p>Sin publicaciones aún. ¡Sé el primero!</p></div>`;
    return;
  }
  container.innerHTML = posts.map(post => {
    const currentUser = getUser();
    const isOwn = currentUser && currentUser.id === post.user_id;
    return `
      <div class="post-card" id="post-${post.id}">
        <div class="post-header">
          <a href="/profile.html?id=${post.user_id}" style="display:flex;align-items:center;gap:10px;flex:1;text-decoration:none;">
            ${avatarHTML({avatar_url: post.user_avatar, name: post.user_name})}
            <div class="post-user-info">
              <div class="post-user-name" style="color:#2D4236;">${post.user_name}</div>
              <div class="post-meta">${post.neighborhood||post.city||''} · ${timeAgo(post.created_at)}</div>
            </div>
          </a>
          ${categoryBadge(post.category)}
        </div>
        <div class="post-body">
          <div class="post-title">${post.title}</div>
          ${post.content ? `<div class="post-content">${post.content}</div>` : ''}
        </div>
        ${post.image_url ? `<img src="${post.image_url}" class="post-image" alt="imagen del post">` : ''}
        <div class="post-footer">
          ${currentUser && !isOwn ? `<button class="post-action" onclick="contactPost(${post.user_id},'${post.user_name}')">Contactar</button>` : ''}
          <a href="/profile.html?id=${post.user_id}" class="post-action">Ver perfil</a>
          ${isOwn ? `<button class="post-action" style="color:#ef4444;" onclick="removePost(${post.id})">Eliminar</button>` : ''}
        </div>
      </div>`;
  }).join('');
}

function setupFeedListeners() {
  // Category filters
  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentCategory = chip.dataset.cat;
      loadFeed();
    });
  });

  // FAB - new post
  document.getElementById('fab-new-post').addEventListener('click', () => {
    if (!getToken()) { window.location.href = '/login.html'; return; }
    document.getElementById('form-new-post').reset();
    document.getElementById('post-image-url').value = '';
    document.getElementById('post-image-preview').innerHTML = '';
    openModal('modal-new-post');
  });

  // Image upload for post
  document.getElementById('btn-post-image').addEventListener('click', () => {
    openCloudinaryWidget(CLOUD_NAME_FEED, UPLOAD_PRESET_FEED, (url) => {
      document.getElementById('post-image-url').value = url;
      document.getElementById('post-image-preview').innerHTML =
        `<img src="${url}" style="max-height:120px;border-radius:8px;margin-top:8px;">`;
    });
  });

  // Submit new post
  document.getElementById('form-new-post').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('[type=submit]');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Publicando...';
    try {
      await api.createPost({
        title:     document.getElementById('post-title').value,
        content:   document.getElementById('post-content').value,
        image_url: document.getElementById('post-image-url').value,
        category:  document.getElementById('post-category').value,
      });
      closeModal('modal-new-post');
      showToast('Publicación creada correctamente');
      loadFeed();
    } catch (err) { showToast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = 'Publicar'; }
  });

  // Close modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
}

function contactPost(userId, userName) {
  if (!getToken()) { window.location.href = '/login.html'; return; }
  window.location.href = `/messages.html?with=${userId}&name=${encodeURIComponent(userName)}`;
}

async function removePost(postId) {
  if (!confirm('¿Eliminar esta publicación?')) return;
  try {
    await api.deletePost(postId);
    document.getElementById(`post-${postId}`)?.remove();
    showToast('Publicación eliminada');
  } catch (err) { showToast(err.message, 'error'); }
}

function updateNavbar() {
  const user = getUser();
  const navAuth = document.getElementById('nav-auth');
  if (user && navAuth) {
    navAuth.innerHTML = `
      <a href="/profile.html" class="navbar-user">
        ${avatarHTML(user, 30)}
        <span>${user.name.split(' ')[0]}</span>
      </a>
      <button class="btn btn-ghost btn-sm" onclick="logout()">Salir</button>`;
  }
}
