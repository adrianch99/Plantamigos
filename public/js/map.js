// PlantaMigos - Map Logic
let map, userLayer, currentPopup;

function initMap(containerId = 'map', lat = 4.711, lng = -74.0721, zoom = 13) {
  map = L.map(containerId, { zoomControl: false }).setView([lat, lng], zoom);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    subdomains: 'abcd', maxZoom: 19,
  }).addTo(map);

  L.control.zoom({ position: 'bottomright' }).addTo(map);
  userLayer = L.layerGroup().addTo(map);
  return map;
}

function createMarkerIcon(user, isCurrentUser = false) {
  const color = isCurrentUser ? '#22c55e' : '#4ade80';
  const ring  = isCurrentUser ? '#16a34a' : '#22c55e';
  let inner;
  if (user.avatar_url) {
    inner = `<img src="${user.avatar_url}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;">`;
  } else {
    const letter = (user.name || '?')[0].toUpperCase();
    inner = `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,${color},#16a34a);display:flex;align-items:center;justify-content:center;font-weight:700;color:#000;font-size:14px;">${letter}</div>`;
  }
  const html = `
    <div style="position:relative;width:44px;height:52px;">
      <div style="position:absolute;top:0;left:0;width:44px;height:44px;border-radius:50%;border:3px solid ${ring};background:#0a1628;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px ${ring}44;">
        ${inner}
      </div>
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:10px solid ${ring};"></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [44, 52], iconAnchor: [22, 52], popupAnchor: [0, -54] });
}

function createPopupHTML(user) {
  const currentUser = getUser();
  const isMe = currentUser && currentUser.id === user.id;
  const avatarHtml = user.avatar_url
    ? `<img src="${user.avatar_url}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #22c55e;">`
    : `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-weight:700;color:#000;">${(user.name||'?')[0].toUpperCase()}</div>`;
  const contactBtn = isMe
    ? `<a href="/profile.html" style="display:block;text-align:center;padding:7px;background:rgba(34,197,94,0.2);border-radius:8px;color:#4ade80;font-size:0.78rem;font-weight:600;">Mi perfil</a>`
    : `<button onclick="openChatWith(${user.id},'${user.name}')" style="display:block;width:100%;padding:7px;background:linear-gradient(135deg,#22c55e,#16a34a);border:none;border-radius:8px;color:#000;font-size:0.78rem;font-weight:700;cursor:pointer;">Contactar</button>`;
  return `
    <div class="popup-card" style="font-family:'Inter',sans-serif;color:#f0fdf4;">
      <div class="popup-user">
        ${avatarHtml}
        <div>
          <div class="popup-name" style="color:#2D4236;">${user.name}</div>
          <div class="popup-location" style="font-size:0.72rem;color:#64748b;">📍 ${user.neighborhood || user.city || 'Sin ubicación'}</div>
        </div>
      </div>
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <span style="font-size:0.75rem;color:#4ade80;"> ${user.plant_count || 0} plantas</span>
        ${user.bio ? `<span style="font-size:0.72rem;color:#94a3b8;">${user.bio.substring(0,40)}${user.bio.length>40?'...':''}</span>` : ''}
      </div>
      <div style="display:flex;gap:6px;flex-direction:column;">
        <a href="/profile.html?id=${user.id}" style="display:block;text-align:center;padding:6px;border:1px solid rgba(34,197,94,0.3);border-radius:8px;color:#4ade80;font-size:0.78rem;font-weight:600;">Ver perfil</a>
        ${contactBtn}
      </div>
    </div>`;
}

async function loadMapUsers(filterCity = '', filterNeighborhood = '') {
  userLayer.clearLayers();
  try {
    let users = await api.getUsers();
    if (filterCity) users = users.filter(u => u.city?.toLowerCase().includes(filterCity.toLowerCase()));
    if (filterNeighborhood) users = users.filter(u => u.neighborhood?.toLowerCase().includes(filterNeighborhood.toLowerCase()));

    const currentUser = getUser();
    users.forEach(user => {
      if (!user.lat || !user.lng) return;
      const isMe = currentUser && currentUser.id === user.id;
      const marker = L.marker([user.lat, user.lng], { icon: createMarkerIcon(user, isMe) });
      marker.bindPopup(createPopupHTML(user), { closeButton: false, maxWidth: 240 });
      userLayer.addLayer(marker);
    });

    // Self-locate current user on map
    if (currentUser) {
      const me = users.find(u => u.id === currentUser.id);
      if (me?.lat) map.setView([me.lat, me.lng], 15);
    }
  } catch (err) {
    console.error('Error cargando usuarios:', err);
  }
}

function geolocateUser(callback) {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      map.setView([lat, lng], 15);

      // Reverse geocode with Nominatim
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const addr = data.address || {};
        const info = {
          lat, lng,
          city:         addr.city || addr.town || addr.village || addr.county || '',
          neighborhood: addr.suburb || addr.neighbourhood || addr.district || '',
          street:       addr.road || addr.pedestrian || '',
        };
        if (callback) callback(info);
      } catch {
        if (callback) callback({ lat, lng, city:'', neighborhood:'', street:'' });
      }
    },
    () => { /* geolocation denied */ }
  );
}

// Global: open chat with user from popup
function openChatWith(userId, userName) {
  const currentUser = getUser();
  if (!currentUser) { window.location.href = '/login.html'; return; }
  window.location.href = `/messages.html?with=${userId}&name=${encodeURIComponent(userName)}`;
}
