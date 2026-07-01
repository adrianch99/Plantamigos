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
  if (typeof setBottomNavActive === 'function') setBottomNavActive();
});

async function loadFeed() {
  const container = document.getElementById('feed-container');
  container.innerHTML = `<div style="text-align:center;padding:40px;"><span class="spinner"></span></div>`;
  try {
    const posts = await api.getPosts(currentCategory);
    renderFeed(posts);
  } catch (err) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><i class="fa-solid fa-triangle-exclamation" style="color: rgb(45, 66, 54);"></i></div><p>${err.message}</p></div>`;
  }
}

function renderFeed(posts) {
  const container = document.getElementById('feed-container');
  if (!posts.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><i class="fa-solid fa-seedling" style="color: rgb(45, 66, 54);"></i></div><p>Sin publicaciones aún. ¡Sé el primero!</p></div>`;
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
        ${post.image_url ? `<img src="${post.image_url}" class="post-image" alt="imagen del post" data-image-url="${post.image_url}">` : ''}
        <div class="post-actions">
          <button type="button" class="post-action post-like-btn${post.likedByUser ? ' liked' : ''}" data-post-id="${post.id}">
            <i class="fa-solid fa-heart"></i> <span id="like-count-${post.id}">${post.likes || 0}</span>
          </button>
          <button type="button" class="post-action post-comment-toggle" data-post-id="${post.id}">
            <i class="fa-solid fa-comment"></i> <span id="comment-count-${post.id}">${post.comments || 0}</span>
          </button>
          ${currentUser && !isOwn ? `<button class="post-action" onclick="contactPost(${post.user_id},'${post.user_name}')">Contactar</button>` : ''}
          <a href="/profile.html?id=${post.user_id}" class="post-action">Ver perfil</a>
          ${isOwn ? `<button class="post-action" style="color:#ef4444;" onclick="removePost(${post.id})">Eliminar</button>` : ''}
        </div>
        <div class="post-comments" id="comments-panel-${post.id}" style="display:none;">
          <div class="comments-list" id="comments-list-${post.id}"></div>
          <form class="post-comment-form" data-post-id="${post.id}">
            <textarea name="comment" class="form-control" placeholder="Escribe un comentario..." required></textarea>
            <button type="submit" class="btn btn-outline btn-sm">Comentar</button>
          </form>
        </div>
      </div>`;
  }).join('');
}

function setupFeedListeners() {
  // Image fullscreen listeners
  const fullscreenModal = document.getElementById('image-fullscreen-modal');
  const fullscreenImage = document.getElementById('fullscreen-image');
  const closeBtn = document.getElementById('image-fullscreen-close');
  const downloadBtn = document.getElementById('image-fullscreen-download');
  
  if (fullscreenModal && closeBtn && downloadBtn) {
    closeBtn.addEventListener('click', () => {
      fullscreenModal.classList.remove('open');
    });
    
    fullscreenModal.addEventListener('click', (e) => {
      if (e.target === fullscreenModal) {
        fullscreenModal.classList.remove('open');
      }
    });
    
    downloadBtn.addEventListener('click', async () => {
      const imageUrl = fullscreenImage.src;
      if (!imageUrl) return;
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `imagen-plantas-${new Date().getTime()}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        showToast('Error al descargar la imagen', 'error');
      }
    });
    
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && fullscreenModal.classList.contains('open')) {
        fullscreenModal.classList.remove('open');
      }
    });
  }
  
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

  const feedContainer = document.getElementById('feed-container');
  if (feedContainer) {
    feedContainer.addEventListener('click', async (e) => {
      const postImage = e.target.closest('.post-image');
      const likeBtn = e.target.closest('.post-like-btn');
      const commentToggle = e.target.closest('.post-comment-toggle');
      
      if (postImage) {
        const imageUrl = postImage.dataset.imageUrl;
        if (imageUrl) {
          const fullscreenModal = document.getElementById('image-fullscreen-modal');
          const fullscreenImage = document.getElementById('fullscreen-image');
          if (fullscreenModal && fullscreenImage) {
            fullscreenImage.src = imageUrl;
            fullscreenModal.classList.add('open');
          }
        }
        return;
      }
      if (likeBtn) {
        const postId = likeBtn.dataset.postId;
        if (!getToken()) { window.location.href = '/login.html'; return; }
        try {
          const result = await api.togglePostLike(postId);
          const countEl = document.getElementById(`like-count-${postId}`);
          const current = parseInt(countEl?.textContent || '0', 10);
          if (countEl) countEl.textContent = result.liked ? current + 1 : Math.max(current - 1, 0);
          likeBtn.classList.toggle('liked', result.liked);
        } catch (err) {
          showToast(err.message, 'error');
        }
      }
      if (commentToggle) {
        const postId = commentToggle.dataset.postId;
        const panel = document.getElementById(`comments-panel-${postId}`);
        if (panel) {
          panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
          if (panel.style.display === 'block') await loadPostInteractions(postId);
        }
      }
    });

    feedContainer.addEventListener('submit', async (e) => {
      const form = e.target.closest('.post-comment-form');
      if (!form) return;
      e.preventDefault();
      const postId = form.dataset.postId;
      const textarea = form.querySelector('textarea[name="comment"]');
      const content = textarea.value.trim();
      if (!content) return;
      if (!getToken()) { window.location.href = '/login.html'; return; }
      const btn = form.querySelector('[type=submit]');
      btn.disabled = true;
      try {
        const comment = await api.addPostComment(postId, content);
        textarea.value = '';
        const list = document.getElementById(`comments-list-${postId}`);
        if (list) {
          list.insertAdjacentHTML('beforeend', renderComment(comment));
        }
        const commentCount = document.getElementById(`comment-count-${postId}`);
        if (commentCount) commentCount.textContent = String(parseInt(commentCount.textContent || '0', 10) + 1);
        showToast('Comentario agregado');
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });
  }

  // Close modals
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('open'); });
  });
}

function renderComment(comment) {
  return `
    <div class="comment-item">
      ${avatarHTML({ avatar_url: comment.user_avatar, name: comment.user_name }, 28)}
      <div class="comment-content">
        <strong>${comment.user_name}</strong>
        <div>${comment.content}</div>
        <div class="comment-time">${timeAgo(comment.created_at)}</div>
      </div>
    </div>`;
}

async function loadPostInteractions(postId) {
  try {
    const data = await api.getPostInteractions(postId);
    const likeCount = document.getElementById(`like-count-${postId}`);
    const commentCount = document.getElementById(`comment-count-${postId}`);
    const likeBtn = document.querySelector(`.post-like-btn[data-post-id="${postId}"]`);
    const list = document.getElementById(`comments-list-${postId}`);
    if (likeCount) likeCount.textContent = String(data.likes);
    if (commentCount) commentCount.textContent = String(data.comments.length);
    if (likeBtn) likeBtn.classList.toggle('liked', data.likedByUser);
    if (list) {
      list.innerHTML = data.comments.map(c => renderComment(c)).join('') || '<div class="comment-empty">Sé el primero en comentar.</div>';
    }
  } catch (err) {
    console.error('Error cargando interacciones:', err);
    showToast(err.message || 'No se pudieron cargar los comentarios.', 'error');
  }
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
  const hamburgerProfile = document.getElementById('hamburger-profile');
  const hamburgerLogin = document.getElementById('hamburger-login');
  const hamburgerRegister = document.getElementById('hamburger-register');
  const hamburgerLogout = document.getElementById('hamburger-logout');
  
  if (user) {
    // Usuario logueado
    if (navAuth) {
      navAuth.innerHTML = `
        <a href="/profile.html" class="navbar-user">
          ${avatarHTML(user, 30)}
          <span class="navbar-user-label">Ver perfil</span>
        </a>
        <button class="btn btn-ghost btn-sm navbar-logout" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket" style="color: rgb(45, 66, 54);"></i>Salir</button>`;
    }
    if (hamburgerProfile) hamburgerProfile.style.display = 'block';
    if (hamburgerLogin) hamburgerLogin.style.display = 'none';
    if (hamburgerRegister) hamburgerRegister.style.display = 'none';
    if (hamburgerLogout) {
      hamburgerLogout.style.display = 'block';
      hamburgerLogout.onclick = logout;
    }
  } else {
    // Usuario no logueado
    if (navAuth) navAuth.innerHTML = `
      <a href="/login.html" class="btn btn-outline btn-sm">Iniciar sesión</a>
      <a href="/login.html?tab=register" class="btn btn-primary btn-sm">Registrarse</a>`;
    if (hamburgerProfile) hamburgerProfile.style.display = 'none';
    if (hamburgerLogin) hamburgerLogin.style.display = 'block';
    if (hamburgerRegister) hamburgerRegister.style.display = 'block';
    if (hamburgerLogout) hamburgerLogout.style.display = 'none';
  }
}
