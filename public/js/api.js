// PlantaMigos API Wrapper
const BASE = '/api';

function getToken() { return localStorage.getItem('pm_token'); }
function getUser()  { 
  const u = localStorage.getItem('pm_user');
  return u ? JSON.parse(u) : null;
}
function saveAuth(token, user) {
  localStorage.setItem('pm_token', token);
  localStorage.setItem('pm_user', JSON.stringify(user));
}
function logout() {
  localStorage.removeItem('pm_token');
  localStorage.removeItem('pm_user');
  window.location.href = '/login.html';
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...options, headers });
  const content = await res.text();
  let data;
  try {
    data = content ? JSON.parse(content) : {};
  } catch {
    data = { error: content.trim() || 'Respuesta inválida del servidor' };
  }
  if (!res.ok) {
    const message = data.error || `Error ${res.status} ${res.statusText}`;
    const err = new Error(message);
    err.status = res.status;
    err.url = BASE + path;
    err.body = content;
    throw err;
  }
  return data;
}

const api = {
  // Auth
  register: (body) => apiFetch('/auth/register', { method:'POST', body:JSON.stringify(body) }),
  login:    (body) => apiFetch('/auth/login',    { method:'POST', body:JSON.stringify(body) }),

  // Users
  getUsers:    ()       => apiFetch('/users'),
  getUser:     (id)     => apiFetch(`/users/${id}`),
  updateUser:  (id, b)  => apiFetch(`/users/${id}`, { method:'PUT', body:JSON.stringify(b) }),
  addPlant:    (id, b)  => apiFetch(`/users/${id}/plants`, { method:'POST', body:JSON.stringify(b) }),
  deletePlant: (uid,pid)=> apiFetch(`/users/${uid}/plants/${pid}`, { method:'DELETE' }),

  // Posts
  getPosts:            (cat)  => apiFetch(`/posts${cat && cat!=='all' ? `?category=${cat}` : ''}`),
  createPost:          (body) => apiFetch('/posts', { method:'POST', body:JSON.stringify(body) }),
  deletePost:          (id)   => apiFetch(`/posts/${id}`, { method:'DELETE' }),
  getPostInteractions: (id)   => apiFetch(`/posts/${id}/interactions`),
  togglePostLike:      (id)   => apiFetch(`/posts/${id}/like`, { method:'POST' }),
  addPostComment:      (id, content) => apiFetch(`/posts/${id}/comment`, { method:'POST', body: JSON.stringify({ content }) }),

  // Messages
  getConversations: ()      => apiFetch('/messages/conversations'),
  getMessages:      (uid)   => apiFetch(`/messages/${uid}`),
  sendMessage:      (body)  => apiFetch('/messages', { method:'POST', body:JSON.stringify(body) }),
  getUnread:        ()      => apiFetch('/messages/unread/count'),
  getConfig:        ()      => apiFetch('/config'),
};

// Toast notifications
function showToast(msg, type='success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  const icons = { success:'✅', error:'❌', info:'ℹ️' };
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${icons[type]||'💬'}</span><span>${msg}</span>`;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Modal helpers
function openModal(id)  { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }

// Avatar helper
function avatarHTML(user, size=36) {
  if (user.avatar_url) {
    return `<img src="${user.avatar_url}" class="avatar" width="${size}" height="${size}" alt="${user.name||''}">`;
  }
  const letter = (user.name || '?')[0].toUpperCase();
  return `<div class="avatar-placeholder" style="width:${size}px;height:${size}px;font-size:${size*0.4}px;">${letter}</div>`;
}

// Time ago
function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'hace un momento';
  if (diff < 3600)  return `hace ${Math.floor(diff/60)}m`;
  if (diff < 86400) return `hace ${Math.floor(diff/3600)}h`;
  return `hace ${Math.floor(diff/86400)}d`;
}

// Category badges
const CAT_LABELS = {
  intercambio:'🔄 Intercambio', regalo:'🎁 Regalo',
  donacion:'💚 Donación', tip:'💡 Tip', pregunta:'❓ Pregunta',
};
const CAT_CLASSES = {
  intercambio:'badge-blue', regalo:'badge-amber', donacion:'badge-green', tip:'badge-green', pregunta:'badge-red',
};
function categoryBadge(cat) {
  return `<span class="badge ${CAT_CLASSES[cat]||'badge-green'}">${CAT_LABELS[cat]||cat}</span>`;
}

// Cloudinary Upload Widget helper
function openCloudinaryWidget(cloudName, uploadPreset, onSuccess) {
  if (!cloudName || cloudName === 'tu_cloud_name_aqui') {
    const url = prompt('Pega la URL de tu imagen (o configura Cloudinary):');
    if (url) onSuccess(url);
    return;
  }
  window.cloudinary.openUploadWidget({
    cloudName, uploadPreset, sources:['local','url','camera'],
    multiple:false, language:'es',
    styles:{ palette:{ window:'#0a1628', windowBorder:'#22c55e', tabIcon:'#22c55e', menuIcons:'#22c55e', textDark:'#f0fdf4', textLight:'#94a3b8', link:'#22c55e', action:'#22c55e', inactiveTabIcon:'#94a3b8', error:'#ef4444', inProgress:'#22c55e', complete:'#4ade80' }},
  }, (err, result) => {
    if (!err && result.event === 'success') onSuccess(result.info.secure_url);
  });
}

// ===== NAV HELPERS =====
// Set the active class on the bottom navbar based on the current pathname
function setBottomNavActive() {
  const links = document.querySelectorAll('.nav-link-bottom');
  if (!links || !links.length) return;
  links.forEach(l => l.classList.remove('active'));
  const path = (location.pathname || '/').replace(/\/$/, '') || '/';
  let matched = false;
  links.forEach(l => {
    try {
      const hrefPath = new URL(l.href).pathname.replace(/\/$/, '') || '/';
      if (hrefPath === path) {
        l.classList.add('active');
        matched = true;
      }
    } catch (e) { /* ignore invalid hrefs */ }
  });
  if (!matched) {
    // Fallback: if we're on root, mark the first link; otherwise try to match by contains
    if (path === '/' || path === '') {
      const first = links[0];
      if (first) first.classList.add('active');
    } else {
      // try contains match (e.g., /feed.html -> /feed.html#something)
      links.forEach(l => {
        try {
          const hrefPath = new URL(l.href).pathname;
          if (path.indexOf(hrefPath.replace(/\/$/, '')) === 0) l.classList.add('active');
        } catch (e) {}
      });
    }
  }
}
