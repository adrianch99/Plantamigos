// PlantaMigos - Auth page logic
let miniMap, selectedLocation = null;

document.addEventListener('DOMContentLoaded', () => {
  if (getToken()) { window.location.href = '/'; return; }
  initMiniMap();
  initForms();
});

function initMiniMap() {
  const mapEl = document.getElementById('mini-map');
  if (!mapEl) return;

  miniMap = L.map('mini-map').setView([4.711, -74.0721], 12);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '', subdomains: 'abcd', maxZoom: 19
  }).addTo(miniMap);

  let marker = null;

  miniMap.on('click', async (e) => {
    const { lat, lng } = e.latlng;
    if (marker) miniMap.removeLayer(marker);
    marker = L.marker([lat, lng]).addTo(miniMap);
    document.getElementById('location-info').textContent = '🔍 Buscando dirección...';
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
      const data = await res.json();
      const addr = data.address || {};
      selectedLocation = {
        lat, lng,
        city:         addr.city || addr.town || addr.village || addr.county || '',
        neighborhood: addr.suburb || addr.neighbourhood || addr.district || '',
        street:       addr.road || addr.pedestrian || '',
      };
      const parts = [selectedLocation.street, selectedLocation.neighborhood, selectedLocation.city].filter(Boolean);
      document.getElementById('location-info').textContent = '📍 ' + parts.join(', ');
    } catch {
      selectedLocation = { lat, lng, city: '', neighborhood: '', street: '' };
      document.getElementById('location-info').textContent = `📍 ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  });

  // Auto-geolocate
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      miniMap.setView([lat, lng], 15);
      if (marker) miniMap.removeLayer(marker);
      marker = L.marker([lat, lng]).addTo(miniMap);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const addr = data.address || {};
        selectedLocation = {
          lat, lng,
          city:         addr.city || addr.town || addr.village || '',
          neighborhood: addr.suburb || addr.neighbourhood || '',
          street:       addr.road || '',
        };
        const parts = [selectedLocation.street, selectedLocation.neighborhood, selectedLocation.city].filter(Boolean);
        document.getElementById('location-info').textContent = '📍 ' + parts.join(', ');
      } catch {
        selectedLocation = { lat, lng, city: '', neighborhood: '', street: '' };
        document.getElementById('location-info').textContent = `📍 Ubicación detectada`;
      }
    }, () => {});
  }
}

function initForms() {
  // LOGIN FORM
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = loginForm.querySelector('[type=submit]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Ingresando...';
      const email    = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;
      try {
        const { token, user } = await api.login({ email, password });
        saveAuth(token, user);
        setTimeout(() => window.location.href = '/', 1000);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Ingresar';
      }
    });
  }

  // REGISTER FORM
  const regForm = document.getElementById('register-form');
  if (regForm) {
    regForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = regForm.querySelector('[type=submit]');
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Registrando...';
      const name     = document.getElementById('reg-name').value.trim();
      const email    = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      if (password.length < 6) {
        showToast('La contraseña debe tener al menos 6 caracteres', 'error');
        btn.disabled = false;
        btn.textContent = 'Crear cuenta ';
        return;
      }
      try {
        const payload = { name, email, password };
        if (selectedLocation) Object.assign(payload, selectedLocation);
        const { token, user } = await api.register(payload);
        saveAuth(token, user);
        showToast(`Cuenta creada correctamente`, 'success');
        setTimeout(() => window.location.href = '/', 1000);
      } catch (err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Crear cuenta';
      }
    });
  }
}
