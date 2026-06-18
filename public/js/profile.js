// PlantaMigos - Profile page
let CLOUD_NAME = "tu_cloud_name_aqui";
const UPLOAD_PRESET = "plantamigos_unsigned";

let profileUser = null,
  currentUser = null,
  isOwnProfile = false;

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
        ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : "<div style='display:flex;align-items:center;justify-content:center;height:100%;color:#4ade80;font-size:2rem;'><i class='fa-solid fa-seedling'></i></div>"}
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
    <div class="post-card">
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
      ${p.image_url ? `<img src="${p.image_url}" class="post-image" alt="">` : ""}
      <div class="post-footer">
        ${isOwnProfile ? `<button class="post-action" onclick="deletePost(${p.id})"><i class="fa-solid fa-trash" style="color: rgb(45, 66, 54);"></i></button>` : ""}
      </div>
    </div>`,
    )
    .join("");
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

