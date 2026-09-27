const API_BASE = '/api';

const state = {
  token: localStorage.getItem('bank_token') || null,
  user: null,
};

// ---------- Helpers ----------
async function apiRequest(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }
  return data;
}

function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach((el) => el.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

function setResultText(el, message, ok) {
  el.textContent = message;
  el.className = 'result-text ' + (ok ? 'ok' : 'err');
}

// ---------- Login ----------
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';

  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await apiRequest('/auth/login', { method: 'POST', body: { username, password } });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('bank_token', data.token);
    enterApp();
  } catch (err) {
    loginError.textContent = err.message;
  }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
  state.token = null;
  state.user = null;
  localStorage.removeItem('bank_token');
  showScreen('loginScreen');
});

// ---------- Tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.add('hidden'));
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');

    if (btn.dataset.tab === 'admin') loadUsersTable();
    if (btn.dataset.tab === 'dashboard') refreshBalance();
  });
});

// ---------- Dashboard ----------
async function refreshBalance() {
  try {
    const data = await apiRequest(`/users/${state.user.username}/balance`);
    document.getElementById('myBalance').textContent = formatMoney(data.balance);
  } catch (err) {
    document.getElementById('myBalance').textContent = 'Error';
  }
}

document.getElementById('refreshBalanceBtn').addEventListener('click', refreshBalance);

function formatMoney(amount) {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD' }).format(amount);
}

// ---------- Transferencias ----------
const transferForm = document.getElementById('transferForm');
const transferResult = document.getElementById('transferResult');

transferForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  transferResult.textContent = '';

  const fromUsername = document.getElementById('fromUsername').value.trim();
  const toUsername = document.getElementById('toUsername').value.trim();
  const amount = Number(document.getElementById('transferAmount').value);

  try {
    const data = await apiRequest('/transfer', {
      method: 'POST',
      body: { fromUsername, toUsername, amount },
    });
    setResultText(transferResult, `✔ ${data.message}. Nuevo saldo de ${data.from.username}: ${formatMoney(data.from.newBalance)}`, true);
    document.getElementById('transferAmount').value = '';
    refreshBalance();
  } catch (err) {
    setResultText(transferResult, `✘ ${err.message}`, false);
  }
});

// ---------- Administración ----------
const createUserForm = document.getElementById('createUserForm');
const createUserResult = document.getElementById('createUserResult');

createUserForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  createUserResult.textContent = '';

  const username = document.getElementById('newUsername').value.trim();
  const password = document.getElementById('newPassword').value;
  const initialBalance = Number(document.getElementById('newInitialBalance').value) || 0;

  try {
    const data = await apiRequest('/users', {
      method: 'POST',
      body: { username, password, initialBalance },
    });
    setResultText(createUserResult, `✔ Usuario "${data.user.username}" creado con saldo ${formatMoney(data.user.balance)}`, true);
    createUserForm.reset();
    document.getElementById('newInitialBalance').value = 0;
    loadUsersTable();
  } catch (err) {
    setResultText(createUserResult, `✘ ${err.message}`, false);
  }
});

document.getElementById('refreshUsersBtn').addEventListener('click', loadUsersTable);

async function loadUsersTable() {
  const tbody = document.getElementById('usersTableBody');
  tbody.innerHTML = '<tr><td colspan="4">Cargando...</td></tr>';

  try {
    const users = await apiRequest('/users');
    tbody.innerHTML = users.map((u) => `
      <tr>
        <td>${u.username}</td>
        <td>${u.role}</td>
        <td>${formatMoney(u.balance)}</td>
        <td>${new Date(u.createdAt).toLocaleString()}</td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4">Error: ${err.message}</td></tr>`;
  }
}

// ---------- Entrada a la app ----------
async function enterApp() {
  try {
    if (!state.user) {
      state.user = await apiRequest('/users/me');
    }
  } catch (err) {
    // token inválido o vencido
    state.token = null;
    localStorage.removeItem('bank_token');
    showScreen('loginScreen');
    return;
  }

  document.getElementById('userLabel').textContent = `${state.user.username} (${state.user.role})`;
  document.getElementById('profileUsername').textContent = state.user.username;
  document.getElementById('profileRole').textContent = state.user.role;

  const isAdmin = state.user.role === 'admin';
  document.querySelectorAll('.admin-only').forEach((el) => el.classList.toggle('hidden', !isAdmin));

  document.getElementById('fromUsername').value = state.user.username;
  if (!isAdmin) {
    document.getElementById('fromUsername').setAttribute('readonly', 'readonly');
  }

  showScreen('appScreen');
  refreshBalance();
}

// Si ya había un token guardado, intenta entrar directo
if (state.token) {
  enterApp();
} else {
  showScreen('loginScreen');
}
