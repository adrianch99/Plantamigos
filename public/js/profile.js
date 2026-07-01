// PlantaMigos - Profile page
let CLOUD_NAME = "tu_cloud_name_aqui";
const UPLOAD_PRESET = "plantamigos_unsigned";

let profileUser = null,
  currentUser = null,
  isOwnProfile = false;
const postInteractionsCache = new Map();

document.addEventListener("DOMContentLoaded", async () => {
  currentUser = getUser();
  try {
    const config = await api.getConfig();
    if (config.cloudinaryCloudName) CLOUD_NAME = config.cloudinaryCloudName;
  } catch (e) {}

  const params = new URLSearchParams(location.search);
  const targetId = params.get("id")
    ? parseInt(params.get("id"))
    : currentUser?.id;
  if (!targetId) {
    window.location.href = "/login.html";
    return;
  }
  isOwnProfile = currentUser && currentUser.id === targetId;
  await loadProfile(targetId);
  setupEventListeners();
});

async function loadProfile(userId) {
  try {
    profileUser = await api.getUser(userId);
    renderProfile();
    renderPlants();
    renderPosts();
  } catch (err) {
    showToast("Error cargando perfil", "error");
  }
}

function renderProfile() {
  const u = profileUser;
  // Avatar
  const avatarEl = document.getElementById("profile-avatar");
  if (u.avatar_url) {
    avatarEl.innerHTML = `<img src="${u.avatar_url}" class="profile-avatar" alt="${u.name}">`;
    if (isOwnProfile) {
      avatarEl.innerHTML += `<button class="profile-edit-avatar" id="btn-edit-avatar" title="Cambiar foto"><i class="fa-solid fa-camera" style="color: rgb(45, 66, 54);"></i></button>`;
    }
  } else {
    const letter = (u.name || "?")[0].toUpperCase();
    avatarEl.innerHTML = `<div class="profile-avatar" style="display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#22c55e,#16a34a);font-size:2.5rem;font-weight:700;color:#000;">${letter}</div>`;
    if (isOwnProfile) {
      avatarEl.innerHTML += `<button class="profile-edit-avatar" id="btn-edit-avatar" title="Cambiar foto"><i class="fa-solid fa-camera" style="color: rgb(45, 66, 54);"></i></button>`;
    }
  }
  document.getElementById("profile-name").textContent = u.name;
  document.getElementById("profile-location").innerHTML =
    [u.neighborhood, u.city].filter(Boolean).join(", ") || "<i class='fa-solid fa-location-dot' style='color: rgb(45, 66, 54);'></i> Sin ubicación";
  document.getElementById("profile-bio").textContent = u.bio || "";
  document.getElementById("stat-plants").textContent = u.plants?.length || 0;
  document.getElementById("stat-posts").textContent = u.posts?.length || 0;
  document.getElementById("profile-since").textContent = new Date(
    u.created_at,
  ).toLocaleDateString("es", { year: "numeric", month: "long" });

  // Show edit/contact buttons
  if (isOwnProfile) {
    document.getElementById("btn-edit-profile").style.display = "flex";
    document.getElementById("btn-add-plant").style.display = "flex";
    document.getElementById("btn-contact-user").style.display = "none";
    if (document.getElementById("btn-edit-avatar")) {
      document.getElementById("btn-edit-avatar").style.display = "flex";
    }
  } else {
    document.getElementById("btn-edit-profile").style.display = "none";
    document.getElementById("btn-add-plant").style.display = "none";
    document.getElementById("btn-contact-user").style.display = currentUser
      ? "flex"
      : "none";
  }
}

function renderPlants() {
  const grid = document.getElementById("plants-grid");
  const plants = profileUser.plants || [];
  if (!plants.length) {
    grid.innerHTML = `<div class="empty-state"><div class="icon"><i class="fa-solid fa-seedling" style="color: rgb(45, 66, 54);"></i></div><p>${isOwnProfile ? "¡Agrega tu primera planta!" : "Sin plantas aún"}</p></div>`;
    return;
  }
  grid.innerHTML = plants
    .map(
      (p) => `
    <div class="plant-card" id="plant-${p.id}">
      <div class="plant-img">
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}" class="plant-image" data-image-url="${p.image_url}">` : "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#4ade80;font-size:2rem;'><i class='fa-solid fa-seedling'></i></div>"}
      </div>
      <div class="plant-info">
        <div class="plant-name">${p.name}</div>
        ${p.description ? `<div class="plant-desc">${p.description}</div>` : ""}
        <div class="plant-footer">
          ${categoryBadge(p.exchange_type)}
          ${isOwnProfile ? `<button class="plant-delete" onclick="deletePlant(${p.id})" title="Eliminar"><i class="fa-solid fa-trash" style="color: rgb(45, 66, 54);"></i></button>` : ""}
        </div>
      </div>
    </div>`,
    )
    .join("");
}

function renderPosts() {
  const container = document.getElementById("user-posts");
  const posts = profileUser.posts || [];
  if (!posts.length) {
    container.innerHTML = `<div class="empty-state"><div class="icon"><i class="fa-solid fa-file-pen" style="color: rgb(45, 66, 54);"></i></div><p>Sin publicaciones aún</p></div>`;
    return;
  }
  container.innerHTML = posts
    .map(
      (p) => `
    <div class="post-card" id="profile-post-${p.id}">
      <div class="post-header">
        ${avatarHTML({ avatar_url: p.user_avatar, name: p.user_name })}
        <div class="post-user-info">
          <div class="post-user-name">${p.user_name}</div>
          <div class="post-meta">${timeAgo(p.created_at)}</div>
        </div>
        ${categoryBadge(p.category)}
      </div>
      <div class="post-body">
        <div class="post-title">${p.title}</div>
        ${p.content ? `<div class="post-content">${p.content}</div>` : ""}
      </div>
      ${p.image_url ? `<img src="${p.image_url}" class="post-image" alt="Imagen del post" data-image-url="${p.image_url}">` : ""}
      <div class="post-actions">
        <button type="button" class="post-action post-like-btn${p.likedByUser ? " liked" : ""}" data-post-id="${p.id}">
          <i class="fa-solid fa-heart"></i> <span id="like-count-${p.id}">${p.likes || 0}</span>
        </button>
        <button type="button" class="post-action post-comment-toggle" data-post-id="${p.id}">
          <i class="fa-solid fa-comment"></i> <span id="comment-count-${p.id}">${p.comments || 0}</span>
        </button>
        ${isOwnProfile ? `<button class="post-action" onclick="deletePost(${p.id})"><i class="fa-solid fa-trash" style="color: rgb(45, 66, 54);"></i> Eliminar</button>` : ""}
      </div>
      <div class="post-comments" id="comments-panel-${p.id}" style="display:none;">
        <div class="comments-list" id="comments-list-${p.id}"></div>
        <form class="post-comment-form" data-post-id="${p.id}">
          <textarea name="comment" class="form-control" placeholder="Escribe un comentario..." required></textarea>
          <button type="submit" class="btn btn-outline btn-sm">Comentar</button>
        </form>
      </div>
    </div>`,
    )
    .join("");

  posts.forEach((post) => {
    loadPostInteractions(post.id, { silent: true }).catch(() => {});
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

async function loadPostInteractions(postId, options = {}) {
  const { forceReload = false, silent = false } = options;
  if (!forceReload && postInteractionsCache.has(postId)) {
    const cached = postInteractionsCache.get(postId);
    const likeCount = document.getElementById(`like-count-${postId}`);
    const commentCount = document.getElementById(`comment-count-${postId}`);
    const likeBtn = document.querySelector(`.post-like-btn[data-post-id="${postId}"]`);
    const list = document.getElementById(`comments-list-${postId}`);
    if (likeCount) likeCount.textContent = String(cached.likes ?? 0);
    if (commentCount) commentCount.textContent = String((cached.comments || []).length);
    if (likeBtn) likeBtn.classList.toggle("liked", Boolean(cached.likedByUser));
    if (list) {
      list.innerHTML = (cached.comments || []).map((c) => renderComment(c)).join("") || '<div class="comment-empty">Sé el primero en comentar.</div>';
    }
    return cached;
  }

  try {
    const data = await api.getPostInteractions(postId);
    const normalized = {
      likes: Number(data.likes || 0),
      likedByUser: Boolean(data.likedByUser),
      comments: Array.isArray(data.comments) ? data.comments : [],
    };
    postInteractionsCache.set(postId, normalized);

    const likeCount = document.getElementById(`like-count-${postId}`);
    const commentCount = document.getElementById(`comment-count-${postId}`);
    const likeBtn = document.querySelector(`.post-like-btn[data-post-id="${postId}"]`);
    const list = document.getElementById(`comments-list-${postId}`);
    if (likeCount) likeCount.textContent = String(normalized.likes);
    if (commentCount) commentCount.textContent = String(normalized.comments.length);
    if (likeBtn) likeBtn.classList.toggle("liked", normalized.likedByUser);
    if (list) {
      list.innerHTML = normalized.comments.map((c) => renderComment(c)).join("") || '<div class="comment-empty">Sé el primero en comentar.</div>';
    }
    return normalized;
  } catch (err) {
    console.error("Error cargando interacciones:", err);
    if (!silent) showToast(err.message || "No se pudieron cargar los comentarios.", "error");
    throw err;
  }
}

function setupEventListeners() {
  // Edit profile modal
  document.getElementById("btn-edit-profile").addEventListener("click", () => {
    const u = profileUser;
    document.getElementById("edit-name").value = u.name || "";
    document.getElementById("edit-bio").value = u.bio || "";
    document.getElementById("edit-avatar").value = u.avatar_url || "";
    document.getElementById("edit-city").value = u.city || "";
    document.getElementById("edit-neighborhood").value = u.neighborhood || "";
    document.getElementById("edit-street").value = u.street || "";
    openModal("modal-edit-profile");
  });
  document
    .getElementById("form-edit-profile")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const updated = await api.updateUser(profileUser.id, {
          name: document.getElementById("edit-name").value,
          bio: document.getElementById("edit-bio").value,
          avatar_url: document.getElementById("edit-avatar").value,
          lat: profileUser.lat,
          lng: profileUser.lng,
          city: document.getElementById("edit-city").value,
          neighborhood: document.getElementById("edit-neighborhood").value,
          street: document.getElementById("edit-street").value,
        });
        Object.assign(profileUser, updated);
        const stored = getUser();
        Object.assign(stored, updated);
        localStorage.setItem("pm_user", JSON.stringify(stored));
        renderProfile();
        closeModal("modal-edit-profile");
        showToast("Perfil actualizado correctamente");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
      }
    });

  // Avatar image upload
  document.addEventListener("click", (e) => {
    const target = e.target;
    const isAvatarButton =
      target.id === "btn-edit-avatar" || target.closest?.("#btn-edit-avatar");
    const isUploadButton =
      target.id === "btn-upload-profile-pic" ||
      target.closest?.("#btn-upload-profile-pic");

    if (!isOwnProfile && !isUploadButton) return;
    if (isAvatarButton || isUploadButton) {
      openCloudinaryWidget(CLOUD_NAME, UPLOAD_PRESET, (url) => {
        document.getElementById("edit-avatar").value = url;
        openModal("modal-edit-profile");
      });
    }
  });

  // Add plant modal
  document.getElementById("btn-add-plant").addEventListener("click", () => {
    document.getElementById("form-add-plant").reset();
    document.getElementById("plant-image-url").value = "";
    openModal("modal-add-plant");
  });
  document.getElementById("btn-plant-image").addEventListener("click", () => {
    openCloudinaryWidget(CLOUD_NAME, UPLOAD_PRESET, (url) => {
      document.getElementById("plant-image-url").value = url;
      document.getElementById("plant-image-preview").innerHTML =
        `<img src="${url}" style="max-height:100px;border-radius:8px;">`;
    });
  });
  document
    .getElementById("form-add-plant")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = e.target.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const plant = await api.addPlant(profileUser.id, {
          name: document.getElementById("plant-name").value,
          description: document.getElementById("plant-description").value,
          image_url: document.getElementById("plant-image-url").value,
          type: document.getElementById("plant-type").value,
          exchange_type: document.getElementById("plant-exchange").value,
        });
        profileUser.plants.unshift(plant);
        renderPlants();
        document.getElementById("stat-plants").textContent =
          profileUser.plants.length;
        closeModal("modal-add-plant");
        showToast("Planta agregada correctamente");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
      }
    });

  // Contact button
  document.getElementById("btn-contact-user")?.addEventListener("click", () => {
    if (!currentUser) {
      window.location.href = "/login.html";
      return;
    }
    window.location.href = `/messages.html?with=${profileUser.id}&name=${encodeURIComponent(profileUser.name)}`;
  });

  const plantsGrid = document.getElementById("plants-grid");
  if (plantsGrid) {
    plantsGrid.addEventListener("click", (e) => {
      const plantImage = e.target.closest(".plant-image");
      if (plantImage) {
        const imageUrl = plantImage.dataset.imageUrl;
        if (imageUrl) {
          const modal = document.getElementById("image-fullscreen-modal");
          const image = document.getElementById("fullscreen-image");
          if (modal && image) {
            image.src = imageUrl;
            modal.classList.add("open");
          }
        }
      }
    });
  }

  const postsContainer = document.getElementById("user-posts");
  if (postsContainer) {
    postsContainer.addEventListener("click", async (e) => {
      const postImage = e.target.closest(".post-image");
      const likeBtn = e.target.closest(".post-like-btn");
      const commentToggle = e.target.closest(".post-comment-toggle");

      if (postImage) {
        const imageUrl = postImage.dataset.imageUrl;
        if (imageUrl) {
          const modal = document.getElementById("image-fullscreen-modal");
          const image = document.getElementById("fullscreen-image");
          if (modal && image) {
            image.src = imageUrl;
            modal.classList.add("open");
          }
        }
        return;
      }

      if (likeBtn) {
        const postId = likeBtn.dataset.postId;
        if (!currentUser) {
          window.location.href = "/login.html";
          return;
        }
        try {
          const result = await api.togglePostLike(postId);
          const countEl = document.getElementById(`like-count-${postId}`);
          const cached = postInteractionsCache.get(postId) || { likes: 0, likedByUser: false, comments: [] };
          const nextLikes = Math.max(0, (cached.likes || 0) + (result.liked ? 1 : -1));
          cached.likes = nextLikes;
          cached.likedByUser = result.liked;
          postInteractionsCache.set(postId, cached);

          const current = parseInt(countEl?.textContent || "0", 10);
          if (countEl) countEl.textContent = result.liked ? current + 1 : Math.max(current - 1, 0);
          likeBtn.classList.toggle("liked", result.liked);
        } catch (err) {
          showToast(err.message, "error");
        }
        return;
      }

      if (commentToggle) {
        const postId = commentToggle.dataset.postId;
        const panel = document.getElementById(`comments-panel-${postId}`);
        if (panel) {
          panel.style.display = panel.style.display === "none" ? "block" : "none";
          if (panel.style.display === "block") await loadPostInteractions(postId);
        }
      }
    });

    postsContainer.addEventListener("submit", async (e) => {
      const form = e.target.closest(".post-comment-form");
      if (!form) return;
      e.preventDefault();
      const postId = form.dataset.postId;
      const textarea = form.querySelector('textarea[name="comment"]');
      const content = textarea.value.trim();
      if (!content) return;
      if (!currentUser) {
        window.location.href = "/login.html";
        return;
      }
      const btn = form.querySelector("[type=submit]");
      btn.disabled = true;
      try {
        const comment = await api.addPostComment(postId, content);
        textarea.value = "";
        const list = document.getElementById(`comments-list-${postId}`);
        if (list) {
          list.insertAdjacentHTML("beforeend", renderComment(comment));
        }
        const cached = postInteractionsCache.get(postId) || { likes: 0, likedByUser: false, comments: [] };
        cached.comments = [...(cached.comments || []), comment];
        postInteractionsCache.set(postId, cached);
        const commentCount = document.getElementById(`comment-count-${postId}`);
        if (commentCount) commentCount.textContent = String((cached.comments || []).length);
        showToast("Comentario agregado");
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  const fullscreenModal = document.getElementById("image-fullscreen-modal");
  const fullscreenImage = document.getElementById("fullscreen-image");
  const closeBtn = document.getElementById("image-fullscreen-close");
  const downloadBtn = document.getElementById("image-fullscreen-download");

  if (fullscreenModal && closeBtn && downloadBtn) {
    closeBtn.addEventListener("click", () => {
      fullscreenModal.classList.remove("open");
    });

    fullscreenModal.addEventListener("click", (e) => {
      if (e.target === fullscreenModal) {
        fullscreenModal.classList.remove("open");
      }
    });

    downloadBtn.addEventListener("click", async () => {
      const imageUrl = fullscreenImage?.src;
      if (!imageUrl) return;
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `imagen-plantas-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (err) {
        showToast("Error al descargar la imagen", "error");
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && fullscreenModal.classList.contains("open")) {
        fullscreenModal.classList.remove("open");
      }
    });
  }

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });
}

async function deletePlant(plantId) {
  if (!confirm("¿Eliminar esta planta?")) return;
  try {
    await api.deletePlant(profileUser.id, plantId);
    profileUser.plants = profileUser.plants.filter((p) => p.id !== plantId);
    renderPlants();
    document.getElementById("stat-plants").textContent =
      profileUser.plants.length;
    showToast("Planta eliminada correctamente");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deletePost(postId) {
  if (!confirm("¿Eliminar esta publicación?")) return;
  try {
    await api.deletePost(postId);
    profileUser.posts = profileUser.posts.filter((p) => p.id !== postId);
    renderPosts();
    showToast("Publicación eliminada correctamente");
  } catch (err) {
    showToast(err.message, "error");
  }
}

