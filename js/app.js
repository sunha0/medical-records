// ===========================
// 医程 - 医疗记录管理系统 (v2)
// ===========================

const API_BASE = '/api';

const state = {
  records: [],
  currentView: 'records',
  currentRecordId: null,
  previewImages: [],
  previewIndex: 0,
  searchQuery: '',
  timeFilter: 'all',
  photoTagFilter: 'all',
  editingRecord: null,
  pendingImages: [],
  pagination: { page: 1, limit: 50, total: 0, pages: 0 },
  isLoading: false,
  isAdmin: false,
  users: [],
  pendingDeleteUserId: null,
  familyMembers: [],
  activeMemberId: null,
  theme: 'light',
  reminders: [],
  dueReminderCount: 0,
  batchMode: false,
  selectedRecords: new Set(),
  dateFrom: '',
  dateTo: '',
  costMin: '',
  costMax: ''
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// DOM Elements
const els = {
  loginPage: $('#loginPage'),
  mainApp: $('#mainApp'),
  loginForm: $('#loginForm'),
  registerForm: $('#registerForm'),
  loginError: $('#loginError'),
  registerError: $('#registerError'),
  showRegister: $('#showRegister'),
  showLogin: $('#showLogin'),
  logoutBtn: $('#logoutBtn'),
  settingsBtn: $('#settingsBtn'),
  userInfo: $('#userInfo'),
  settingsModal: $('#settingsModal'),
  settingsModalClose: $('#settingsModalClose'),
  changePasswordForm: $('#changePasswordForm'),
  passwordError: $('#passwordError'),
  cancelSettingsBtn: $('#cancelSettingsBtn'),
  searchInput: $('#searchInput'),
  addRecordBtn: $('#addRecordBtn'),
  emptyAddBtn: $('#emptyAddBtn'),
  recordsList: $('#recordsList'),
  emptyState: $('#emptyState'),
  photosGrid: $('#photosGrid'),
  photosEmptyState: $('#photosEmptyState'),
  timeFilter: $('#timeFilter'),
  recordModal: $('#recordModal'),
  modalClose: $('#modalClose'),
  modalTitle: $('#modalTitle'),
  recordForm: $('#recordForm'),
  cancelBtn: $('#cancelBtn'),
  imagePreviewModal: $('#imagePreviewModal'),
  detailModal: $('#detailModal'),
  detailContent: $('#detailContent'),
  previewImage: $('#previewImage'),
  previewInfo: $('#previewInfo'),
  toast: $('#toast'),
  monthRecords: $('#monthRecords'),
  monthCost: $('#monthCost'),
  totalCost: $('#totalCost'),
  frequencyChart: $('#frequencyChart'),
  departmentList: $('#departmentList'),
  photoTags: $('#photoTags'),
  uploadArea: $('#uploadArea'),
  imageInput: $('#imageInput'),
  imagePreview: $('#imagePreview'),
  deleteConfirmModal: $('#deleteConfirmModal'),
  confirmDeleteBtn: $('#confirmDeleteBtn'),
  cancelDeleteBtn: $('#cancelDeleteBtn'),
  exportBtn: $('#exportBtn'),
  loadMoreBtn: $('#loadMoreBtn'),
  mobileNav: $('#mobileNav'),
  deleteUserModal: $('#deleteUserModal'),
  deleteUserDesc: $('#deleteUserDesc'),
  usersTableBody: $('#usersTableBody')
};

// ===========================
// Init
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkLogin();
});

function getToken() {
  return localStorage.getItem('auth_token');
}

function getUserId() {
  return localStorage.getItem('user_id');
}

function checkLogin() {
  const token = getToken();
  console.log('[Auth] checkLogin called, token:', token ? token.substring(0, 20) + '...' : null);
  if (token && isValidJWT(token)) {
    console.log('[Auth] Token valid, showing main app');
    showMainApp();
    loadData();
  } else {
    console.log('[Auth] Token invalid or missing, showing login page');
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('username');
    showLoginPage();
  }
}

function isValidJWT(token) {
  console.log('[Auth] Validating JWT:', token ? token.substring(0, 20) + '...' : null);
  if (!token || typeof token !== 'string') {
    console.log('[Auth] Invalid: not a string');
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.log('[Auth] Invalid: not 3 parts');
    return false;
  }
  try {
    let padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded2 = padded + '=='.slice(0, (4 - padded.length % 4) % 4);
    const payload = JSON.parse(atob(padded2));
    console.log('[Auth] Token payload:', payload);
    console.log('[Auth] Token exp:', payload.exp, 'Now:', Date.now() / 1000, 'Valid:', payload.exp > Date.now() / 1000);
    return payload.exp && payload.exp > Date.now() / 1000;
  } catch (e) {
    console.log('[Auth] Parse error:', e.message);
    return false;
  }
}

function showLoginPage() {
  els.loginPage.style.display = 'flex';
  els.mainApp.style.display = 'none';
}

function showMainApp() {
  els.loginPage.style.display = 'none';
  els.mainApp.style.display = 'flex';
  els.userInfo.textContent = localStorage.getItem('username') || '';

  // Check if admin
  const username = localStorage.getItem('username');
  state.isAdmin = username === 'admin';

  // Show/hide admin menu
  const adminMenu = document.querySelector('.admin-only');
  if (adminMenu) {
    adminMenu.style.display = state.isAdmin ? 'flex' : 'none';
  }

  // Load family members
  loadFamilyMembers();

  // Load theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  setTheme(savedTheme);
}

function setTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);

  // Update header toggle icons
  const themeToggleBtn = $('#themeToggleBtn');
  if (themeToggleBtn) {
    const sunIcon = themeToggleBtn.querySelector('.sun-icon');
    const moonIcon = themeToggleBtn.querySelector('.moon-icon');
    if (theme === 'dark') {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
    } else {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
    }
  }
}

function toggleTheme() {
  const newTheme = state.theme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}

// ===========================
// API Helpers
// ===========================
async function apiFetch(url, options = {}) {
  const token = getToken();
  const headers = { ...options.headers };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (options.method !== 'GET' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  console.log('[API] Calling:', url, 'Token:', token ? token.substring(0, 20) + '...' : null);

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  console.log('[API] Response status:', res.status, 'url:', url);

  if (res.status === 401) {
    console.log('[API] Got 401, logging out');
    handleLogout();
    showToast('登录已过期，请重新登录', 'error');
    return null;
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

// ===========================
// Auth
// ===========================
function initEventListeners() {
  els.loginForm.addEventListener('submit', handleLogin);
  els.registerForm.addEventListener('submit', handleRegister);
  els.showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    els.loginForm.style.display = 'none';
    els.registerForm.style.display = 'flex';
  });
  els.showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    els.registerForm.style.display = 'none';
    els.loginForm.style.display = 'flex';
  });
  els.logoutBtn.addEventListener('click', handleLogout);
  $('#mobileLogoutBtn') && $('#mobileLogoutBtn').addEventListener('click', handleLogout);

  // Navigation
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });
  $$('.mobile-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  els.searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value;
    state.pagination.page = 1;
    loadData();
  }, 400));

  els.timeFilter.addEventListener('change', (e) => {
    state.timeFilter = e.target.value;
    state.pagination.page = 1;
    loadData();
  });

  $$('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
      $$('.tag').forEach(t => t.classList.remove('active'));
      tag.classList.add('active');
      state.photoTagFilter = tag.dataset.tag;
      renderPhotos();
    });
  });

  els.addRecordBtn.addEventListener('click', () => openModal());
  els.emptyAddBtn.addEventListener('click', () => openModal());

  els.modalClose.addEventListener('click', closeModal);
  els.cancelBtn.addEventListener('click', closeModal);
  els.recordModal.querySelector('.modal-backdrop').addEventListener('click', closeModal);

  els.recordForm.addEventListener('submit', handleFormSubmit);

  els.uploadArea.addEventListener('click', () => els.imageInput.click());
  els.uploadArea.addEventListener('dragover', handleDragOver);
  els.uploadArea.addEventListener('dragleave', handleDragLeave);
  els.uploadArea.addEventListener('drop', handleDrop);
  els.imageInput.addEventListener('change', handleFileSelect);

  $('#imageModalClose').addEventListener('click', closeImagePreview);
  els.imagePreviewModal.querySelector('.modal-backdrop').addEventListener('click', closeImagePreview);
  $('#prevImage').addEventListener('click', () => navigatePreview(-1));
  $('#nextImage').addEventListener('click', () => navigatePreview(1));

  $('#detailModalClose').addEventListener('click', closeDetailModal);
  els.detailModal.querySelector('.modal-backdrop').addEventListener('click', closeDetailModal);
  $('#editRecordBtn').addEventListener('click', handleEditFromDetail);
  $('#deleteRecordBtn').addEventListener('click', handleDeleteRecord);

  // Delete confirm
  els.cancelDeleteBtn.addEventListener('click', closeDeleteConfirm);
  els.confirmDeleteBtn.addEventListener('click', confirmDelete);

  // Settings
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.settingsModalClose.addEventListener('click', closeSettingsModal);
  els.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  els.settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettingsModal);
  els.changePasswordForm.addEventListener('submit', handleChangePassword);

  // Export
  els.exportBtn && els.exportBtn.addEventListener('click', handleExport);

  // Load more
  els.loadMoreBtn && els.loadMoreBtn.addEventListener('click', handleLoadMore);

  // Admin modals
  els.cancelDeleteUserBtn = $('#cancelDeleteUserBtn');
  els.confirmDeleteUserBtn = $('#confirmDeleteUserBtn');
  els.cancelDeleteUserBtn && els.cancelDeleteUserBtn.addEventListener('click', closeDeleteUserConfirm);
  els.confirmDeleteUserBtn && els.confirmDeleteUserBtn.addEventListener('click', confirmDeleteUser);
  els.deleteUserModal.querySelector('.modal-backdrop').addEventListener('click', closeDeleteUserConfirm);

  // Family member modal
  const familyMemberModal = $('#familyMemberModal');
  const familyMemberClose = $('#familyMemberClose');
  familyMemberClose && familyMemberClose.addEventListener('click', closeFamilyMemberModal);
  familyMemberModal && familyMemberModal.querySelector('.modal-backdrop').addEventListener('click', closeFamilyMemberModal);

  const addMemberBtn = $('#addMemberBtn');
  const cancelAddMemberBtn = $('#cancelAddMemberBtn');
  const saveMemberBtn = $('#saveMemberBtn');
  addMemberBtn && addMemberBtn.addEventListener('click', openAddFamilyMemberForm);
  cancelAddMemberBtn && cancelAddMemberBtn.addEventListener('click', cancelAddFamilyMember);
  saveMemberBtn && saveMemberBtn.addEventListener('click', addFamilyMember);

  // Password visibility toggle
  $$('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
      } else {
        input.type = 'password';
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
      }
    });
  });

  // Password strength
  const regPassword = els.registerForm.querySelector('#regPassword');
  const strengthBar = $('#passwordStrength');
  regPassword && regPassword.addEventListener('input', () => {
    updatePasswordStrength(regPassword.value, strengthBar);
  });

  // Advanced filters
  const dateFromFilter = $('#dateFromFilter');
  const dateToFilter = $('#dateToFilter');
  const costMinFilter = $('#costMinFilter');
  const costMaxFilter = $('#costMaxFilter');
  dateFromFilter && dateFromFilter.addEventListener('change', (e) => { state.dateFrom = e.target.value; });
  dateToFilter && dateToFilter.addEventListener('change', (e) => { state.dateTo = e.target.value; });
  costMinFilter && costMinFilter.addEventListener('input', (e) => { state.costMin = e.target.value; });
  costMaxFilter && costMaxFilter.addEventListener('input', (e) => { state.costMax = e.target.value; });

  // Apply advanced filters
  window.applyAdvancedFilters = function() {
    state.pagination.page = 1;
    loadData();
  };

  // Theme toggle button in header
  const themeToggleBtn = $('#themeToggleBtn');
  themeToggleBtn && themeToggleBtn.addEventListener('click', toggleTheme);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeImagePreview();
      closeDetailModal();
      closeSettingsModal();
      closeDeleteConfirm();
    }
    if (els.imagePreviewModal.classList.contains('active')) {
      if (e.key === 'ArrowLeft') navigatePreview(-1);
      if (e.key === 'ArrowRight') navigatePreview(1);
    }
  });
}

async function handleLogin(e) {
  e.preventDefault();
  els.loginError.textContent = '';
  const btn = els.loginForm.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const username = els.loginForm['username'].value;
  const password = els.loginForm['password'].value;

  try {
    const data = await apiFetch('/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_id', data.userId);
      localStorage.setItem('username', data.username);
      showMainApp();
      loadData();
    }
  } catch (err) {
    els.loginError.textContent = err.message;
  } finally {
    setButtonLoading(btn, false);
  }
}

async function handleRegister(e) {
  e.preventDefault();
  els.registerError.textContent = '';
  const btn = els.registerForm.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const username = els.registerForm['regUsername'].value;
  const password = els.registerForm['regPassword'].value;
  const confirmPassword = els.registerForm['regConfirmPassword'].value;

  if (password !== confirmPassword) {
    els.registerError.textContent = '两次输入的密码不一致';
    setButtonLoading(btn, false);
    return;
  }

  try {
    const data = await apiFetch('/register', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });

    if (data) {
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_id', data.userId);
      localStorage.setItem('username', data.username);
      showMainApp();
      showToast('注册成功', 'success');
      loadData();
    }
  } catch (err) {
    els.registerError.textContent = err.message;
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleLogout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user_id');
  localStorage.removeItem('username');
  state.records = [];
  showLoginPage();
}

// ===========================
// Data Loading
// ===========================
async function loadData() {
  const token = getToken();
  if (!token) {
    console.log('[Data] No token, skipping loadData');
    return;
  }

  state.isLoading = true;
  showLoading(true);

  try {
    const params = new URLSearchParams({
      page: state.pagination.page,
      limit: state.pagination.limit,
      search: state.searchQuery,
      timeFilter: state.timeFilter,
      memberId: state.activeMemberId || '',
      dateFrom: state.dateFrom,
      dateTo: state.dateTo,
      costMin: state.costMin,
      costMax: state.costMax
    });

    const data = await apiFetch(`/records?${params}`);
    if (!data) {
      console.log('[Data] apiFetch returned null');
      return;
    }

    if (state.pagination.page === 1) {
      state.records = data.records;
    } else {
      state.records = [...state.records, ...data.records];
    }

    state.pagination = data.pagination;
    render();

    // Load reminders after records
    await loadDueReminders();
  } catch (err) {
    showToast(err.message || '加载数据失败', 'error');
  } finally {
    state.isLoading = false;
    showLoading(false);
  }
}

async function loadDueReminders() {
  try {
    const data = await apiFetch('/reminders/due');
    if (data) {
      state.dueReminderCount = data.count;
      renderReminderBadge();
      if (data.count > 0) {
        showToast(`您有 ${data.count} 条复诊提醒待处理`, 'warning');
      }
    }
  } catch (err) {
    console.error('加载提醒失败:', err);
  }
}

function renderReminderBadge() {
  const badge = $('#reminderBadge');
  if (!badge) return;

  if (state.dueReminderCount > 0) {
    badge.textContent = state.dueReminderCount;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function loadReminders() {
  try {
    const data = await apiFetch('/reminders');
    if (data) {
      state.reminders = data.reminders || [];
      renderReminders();
    }
  } catch (err) {
    console.error('加载提醒列表失败:', err);
  }
}

function renderReminders() {
  const container = $('#remindersList');
  if (!container) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];

  if (state.reminders.length === 0) {
    container.innerHTML = '<div class="reminders-empty"><p>暂无复诊提醒</p></div>';
    return;
  }

  container.innerHTML = state.reminders.map(r => {
    const isOverdue = r.followUpDate < today;
    const isToday = r.followUpDate === today;
    const statusClass = isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming';
    const statusText = isOverdue ? '已过期' : isToday ? '今天' : formatDate(r.followUpDate);

    return `
      <div class="reminder-item ${statusClass}">
        <div class="reminder-status">${statusText}</div>
        <div class="reminder-info">
          <span class="reminder-patient">${escapeHtml(r.patient)}</span>
          <span class="reminder-dept">${escapeHtml(r.hospital)} · ${escapeHtml(r.department)}</span>
          ${r.note ? `<span class="reminder-note">${escapeHtml(r.note)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

async function loadStats() {
  const token = getToken();
  if (!token) return;

  try {
    const data = await apiFetch('/stats');
    if (!data) return;

    els.monthRecords.textContent = data.thisMonth.count;
    els.monthCost.textContent = '¥' + data.thisMonth.cost.toFixed(0);
    els.totalCost.textContent = '¥' + data.lastYear.cost.toFixed(0);

    // Department chart
    const sortedDepts = data.departments;
    const maxCount = sortedDepts[0]?.[1] || 1;
    els.departmentList.innerHTML = sortedDepts.map(([dept, count]) => `
      <div class="dept-item">
        <span class="dept-name">${escapeHtml(dept)}</span>
        <div class="dept-bar" style="width: ${(count / maxCount) * 100}%"></div>
        <span class="dept-count">${count}次</span>
      </div>
    `).join('');

    // Monthly frequency chart
    const months = data.monthlyFrequency;
    const maxMonthCount = Math.max(...months.map(m => m.count), 1);
    const chartHeight = 100;
    els.frequencyChart.innerHTML = months.map(m => {
      const h = maxMonthCount > 0 ? Math.max((m.count / maxMonthCount) * chartHeight, m.count > 0 ? 5 : 0) : 0;
      return `
        <div class="bar-wrapper" title="${m.count}次就医">
          <div class="bar" style="height: ${h}px"></div>
          <span class="bar-label">${m.label}</span>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('加载统计失败:', err);
  }
}

async function loadUsers() {
  if (!state.isAdmin) return;

  try {
    const data = await apiFetch('/admin/users');
    if (!data) return;

    state.users = data.users;
    renderUsers();
  } catch (err) {
    showToast(err.message || '加载用户列表失败', 'error');
  }
}

async function loadFamilyMembers() {
  try {
    const data = await apiFetch('/family/members');
    if (!data) return;

    state.familyMembers = data.members || [];
    state.activeMemberId = data.activeMemberId;
    renderFamilySwitcher();
  } catch (err) {
    console.error('加载家庭成员失败:', err);
  }
}

function renderFamilySwitcher() {
  const container = $('#familySwitcher');
  if (!container || state.familyMembers.length === 0) return;

  const activeMember = state.familyMembers.find(m => m.memberId === state.activeMemberId) || state.familyMembers[0];

  container.innerHTML = `
    <button class="family-switcher-btn" id="familySwitcherBtn">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
      <span>${escapeHtml(activeMember?.name || '选择成员')}</span>
      <svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
    <div class="family-dropdown" id="familyDropdown">
      ${state.familyMembers.map(m => `
        <button class="family-dropdown-item ${m.memberId === state.activeMemberId || (!state.activeMemberId && m.relation === '自己') ? 'active' : ''}"
                onclick="switchFamilyMember('${m.memberId}')">
          <span class="member-avatar">${escapeHtml(m.name.charAt(0))}</span>
          <div class="member-info">
            <span class="member-name">${escapeHtml(m.name)}</span>
            <span class="member-relation">${escapeHtml(m.relation)}</span>
          </div>
          ${m.memberId === state.activeMemberId || (!state.activeMemberId && m.relation === '自己') ? '<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </button>
      `).join('')}
      <div class="family-dropdown-divider"></div>
      <button class="family-dropdown-item manage" onclick="openFamilyMemberModal()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        管理家庭成员
      </button>
    </div>
  `;

  // Toggle dropdown
  const btn = $('#familySwitcherBtn');
  const dropdown = $('#familyDropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('active');
    btn.classList.toggle('active');
  });

  // Close on outside click
  document.addEventListener('click', () => {
    dropdown.classList.remove('active');
    btn.classList.remove('active');
  });
}

async function switchFamilyMember(memberId) {
  try {
    const data = await apiFetch('/family/switch', {
      method: 'POST',
      body: JSON.stringify({ memberId })
    });
    if (data) {
      state.activeMemberId = memberId;
      state.pagination.page = 1;
      await loadData();
      renderFamilySwitcher();
    }
  } catch (err) {
    showToast(err.message || '切换成员失败', 'error');
  }
}

// Family Member Modal
function openFamilyMemberModal() {
  const modal = $('#familyMemberModal');
  const list = $('#familyMemberList');
  const dropdown = $('#familyDropdown');
  const btn = $('#familySwitcherBtn');

  // Close dropdown
  dropdown.classList.remove('active');
  btn.classList.remove('active');

  renderFamilyMemberList();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeFamilyMemberModal() {
  $('#familyMemberModal').classList.remove('active');
  document.body.style.overflow = '';
}

function renderFamilyMemberList() {
  const list = $('#familyMemberList');
  list.innerHTML = state.familyMembers.map(m => `
    <div class="family-member-item">
      <div class="member-avatar-lg">${escapeHtml(m.name.charAt(0))}</div>
      <div class="member-details">
        <span class="member-name-lg">${escapeHtml(m.name)}</span>
        <span class="member-relation-lg">${escapeHtml(m.relation)}</span>
      </div>
      ${m.relation !== '自己' ? `
        <button class="btn btn-sm btn-ghost" onclick="deleteFamilyMember('${m.memberId}', '${escapeHtml(m.name)}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      ` : ''}
    </div>
  `).join('');
}

function openAddFamilyMemberForm() {
  const form = $('#addFamilyMemberForm');
  form.classList.add('active');
  $('#newMemberName').value = '';
  $('#newMemberRelation').value = '';
}

function cancelAddFamilyMember() {
  $('#addFamilyMemberForm').classList.remove('active');
}

async function addFamilyMember() {
  const name = $('#newMemberName').value.trim();
  const relation = $('#newMemberRelation').value.trim();

  if (!name || !relation) {
    showToast('请填写姓名和关系', 'error');
    return;
  }

  try {
    const data = await apiFetch('/family/members', {
      method: 'POST',
      body: JSON.stringify({ name, relation })
    });
    if (data) {
      state.familyMembers.push(data.member);
      cancelAddFamilyMember();
      renderFamilyMemberList();
      renderFamilySwitcher();
      showToast('添加成功', 'success');
    }
  } catch (err) {
    showToast(err.message || '添加失败', 'error');
  }
}

async function deleteFamilyMember(memberId, name) {
  if (!confirm(`确定要删除家庭成员「${name}」吗？`)) return;

  try {
    const data = await apiFetch(`/family/members/${memberId}`, { method: 'DELETE' });
    if (data) {
      state.familyMembers = state.familyMembers.filter(m => m.memberId !== memberId);
      renderFamilyMemberList();
      renderFamilySwitcher();
      showToast('删除成功', 'success');
    }
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  }
}

function renderUsers() {
  if (!state.users || state.users.length === 0) {
    els.usersTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">暂无用户数据</td></tr>';
    return;
  }

  els.usersTableBody.innerHTML = state.users.map(user => `
    <tr>
      <td><strong>${escapeHtml(user.username)}</strong></td>
      <td><code>${user.userId.substring(0, 8)}...</code></td>
      <td>${user.recordCount} 条</td>
      <td>${user.createdAt ? formatDate(new Date(user.createdAt).toISOString().split('T')[0]) : '未知'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="openDeleteUserConfirm('${user.userId}', '${escapeHtml(user.username)}')">
          删除
        </button>
      </td>
    </tr>
  `).join('');
}

function openDeleteUserConfirm(userId, username) {
  state.pendingDeleteUserId = userId;
  els.deleteUserDesc.textContent = `确定要删除用户「${username}」吗？该操作将同时删除用户的所有数据，且不可恢复。`;
  els.deleteUserModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDeleteUserConfirm() {
  els.deleteUserModal.classList.remove('active');
  document.body.style.overflow = '';
  state.pendingDeleteUserId = null;
}

async function confirmDeleteUser() {
  if (!state.pendingDeleteUserId) return;

  setButtonLoading(els.confirmDeleteUserBtn, true);

  try {
    const data = await apiFetch(`/admin/users/${state.pendingDeleteUserId}`, { method: 'DELETE' });
    if (data) {
      state.users = state.users.filter(u => u.userId !== state.pendingDeleteUserId);
      closeDeleteUserConfirm();
      renderUsers();
      showToast(data.message || '用户已删除', 'success');
    }
  } catch (err) {
    showToast(err.message || '删除用户失败', 'error');
  } finally {
    setButtonLoading(els.confirmDeleteUserBtn, false);
  }
}

async function handleExport() {
  try {
    const data = await apiFetch('/export');
    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `医程记录_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('导出成功', 'success');
  } catch (err) {
    showToast(err.message || '导出失败', 'error');
  }
}

async function handleLoadMore() {
  state.pagination.page++;
  await loadData();
}

// ===========================
// Stats & Charts
// ===========================
async function loadStats() {
  const token = getToken();
  if (!token) return;

  try {
    const data = await apiFetch('/stats');
    if (!data) return;

    els.monthRecords.textContent = data.thisMonth.count;
    els.monthCost.textContent = '¥' + data.thisMonth.cost.toFixed(0);
    els.totalCost.textContent = '¥' + data.lastYear.cost.toFixed(0);

    // Render charts
    renderCostTrendChart(data.monthlyFrequency);
    renderDepartmentPieChart(data.departments);
    renderHealthTimeline(state.records);
  } catch (err) {
    console.error('加载统计失败:', err);
  }
}

let costTrendChart = null;
let departmentPieChart = null;

function renderCostTrendChart(monthlyData) {
  const ctx = $('#costTrendChart');
  if (!ctx) return;

  if (costTrendChart) {
    costTrendChart.destroy();
  }

  const labels = monthlyData.map(m => m.label);
  const values = monthlyData.map(m => m.count);

  costTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '就医次数',
        data: values,
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#3B82F6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F8FAFC',
          bodyColor: '#CBD5E1',
          padding: 12,
          cornerRadius: 8
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: 'rgba(148, 163, 184, 0.1)' }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderDepartmentPieChart(departments) {
  const ctx = $('#departmentPieChart');
  if (!ctx) return;

  if (departmentPieChart) {
    departmentPieChart.destroy();
  }

  const labels = departments.map(d => d[0]);
  const values = departments.map(d => d[1]);

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  departmentPieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            usePointStyle: true,
            font: { size: 12 }
          }
        }
      },
      cutout: '60%'
    }
  });
}

function renderHealthTimeline(records) {
  const container = $('#healthTimeline');
  if (!container || records.length === 0) {
    if (container) container.innerHTML = '<div class="timeline-empty">暂无健康记录</div>';
    return;
  }

  const sortedRecords = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
  const groupedByMonth = {};

  sortedRecords.forEach(r => {
    const monthKey = r.date.substring(0, 7);
    if (!groupedByMonth[monthKey]) {
      groupedByMonth[monthKey] = [];
    }
    groupedByMonth[monthKey].push(r);
  });

  const months = Object.keys(groupedByMonth);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  container.innerHTML = `
    <div class="timeline-line"></div>
    ${months.map((month, idx) => `
      <div class="timeline-month">
        <div class="timeline-dot" style="background: ${colors[idx % colors.length]}"></div>
        <div class="timeline-month-label">${formatDate(month + '-01')}</div>
        <div class="timeline-records">
          ${groupedByMonth[month].map(r => `
            <div class="timeline-record" onclick="openDetailModal('${r.id}')">
              <span class="timeline-patient">${escapeHtml(r.patient)}</span>
              <span class="timeline-hospital">${escapeHtml(r.hospital)}</span>
              <span class="timeline-dept">${escapeHtml(r.department)}</span>
              ${r.diagnosis ? `<span class="timeline-diagnosis">${escapeHtml(r.diagnosis)}</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('')}
  `;
}

// ===========================
// Rendering
// ===========================
function switchView(view) {
  state.currentView = view;
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  $$('.mobile-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  $$('.view').forEach(v => {
    v.classList.toggle('active', v.id === view + 'View');
  });

  if (view === 'stats') {
    loadStats();
  } else if (view === 'users') {
    loadUsers();
  } else {
    // records and photos views need render()
    render();
  }
}

function render() {
  renderRecords();
  renderPhotos();
  updateSidebarStats();
  updateSidebarReminders();
  updateLoadMoreBtn();
}

function updateSidebarReminders() {
  loadReminders();
}

// Batch Operations
function toggleBatchMode() {
  state.batchMode = !state.batchMode;
  state.selectedRecords.clear();

  const batchBar = $('#batchActionsBar');
  const cards = els.recordsList.querySelectorAll('.record-card');

  cards.forEach(card => {
    const checkbox = card.querySelector('.card-checkbox input');
    if (checkbox) {
      checkbox.checked = false;
      card.classList.remove('selected');
    }
  });

  if (batchBar) {
    batchBar.classList.toggle('active', state.batchMode);
  }

  updateBatchCount();
}

function toggleRecordSelection(recordId) {
  if (state.selectedRecords.has(recordId)) {
    state.selectedRecords.delete(recordId);
  } else {
    state.selectedRecords.add(recordId);
  }

  const card = els.recordsList.querySelector(`[data-id="${recordId}"]`);
  if (card) {
    card.classList.toggle('selected', state.selectedRecords.has(recordId));
    const checkbox = card.querySelector('.card-checkbox input');
    if (checkbox) {
      checkbox.checked = state.selectedRecords.has(recordId);
    }
  }

  updateBatchCount();
}

function updateBatchCount() {
  const countEl = $('#batchSelectedCount');
  if (countEl) {
    countEl.innerHTML = `已选择 <strong>${state.selectedRecords.size}</strong> 条记录`;
  }
}

async function batchDeleteRecords() {
  if (state.selectedRecords.size === 0) {
    showToast('请先选择要删除的记录', 'warning');
    return;
  }

  if (!confirm(`确定要删除选中的 ${state.selectedRecords.size} 条记录吗？此操作不可撤销。`)) {
    return;
  }

  const ids = Array.from(state.selectedRecords);
  let deleted = 0;

  for (const id of ids) {
    try {
      await apiFetch(`/records/${id}`, { method: 'DELETE' });
      deleted++;
    } catch (err) {
      console.error('删除记录失败:', id, err);
    }
  }

  state.records = state.records.filter(r => !state.selectedRecords.has(r.id));
  state.selectedRecords.clear();
  toggleBatchMode();
  render();
  showToast(`已删除 ${deleted} 条记录`, 'success');
}

async function batchExportRecords() {
  if (state.selectedRecords.size === 0) {
    showToast('请先选择要导出的记录', 'warning');
    return;
  }

  const selectedRecords = state.records.filter(r => state.selectedRecords.has(r.id));
  const exportData = {
    exportedAt: new Date().toISOString(),
    count: selectedRecords.length,
    records: selectedRecords
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `健康记_批量导出_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(`已导出 ${selectedRecords.length} 条记录`, 'success');
}

function clearFilters() {
  state.searchQuery = '';
  state.timeFilter = 'all';
  state.dateFrom = '';
  state.dateTo = '';
  state.costMin = '';
  state.costMax = '';
  state.pagination.page = 1;

  els.searchInput.value = '';
  els.timeFilter.value = 'all';

  const dateFromInput = $('#dateFromFilter');
  const dateToInput = $('#dateToFilter');
  const costMinInput = $('#costMinFilter');
  const costMaxInput = $('#costMaxFilter');

  if (dateFromInput) dateFromInput.value = '';
  if (dateToInput) dateToInput.value = '';
  if (costMinInput) costMinInput.value = '';
  if (costMaxInput) costMaxInput.value = '';

  loadData();
}

function renderRecords() {
  if (state.records.length === 0 && state.pagination.page === 1) {
    els.recordsList.innerHTML = '';
    els.emptyState.classList.add('visible');
    return;
  }

  els.emptyState.classList.remove('visible');

  // Clear existing cards when on page 1 (fresh load)
  if (state.pagination.page === 1) {
    els.recordsList.innerHTML = '';
  }

  state.records.forEach(record => {
    const card = document.createElement('div');
    card.innerHTML = createRecordCard(record);
    const article = card.firstElementChild;
    article.addEventListener('click', () => openDetailModal(record.id));
    els.recordsList.appendChild(article);
  });
}

function updateLoadMoreBtn() {
  if (!els.loadMoreBtn) return;
  const hasMore = state.pagination.page < state.pagination.pages;
  els.loadMoreBtn.style.display = hasMore ? 'inline-flex' : 'none';
}

function createRecordCard(record) {
  const imagesHtml = record.images && record.images.length > 0
    ? `<div class="card-images">
        ${record.images.slice(0, 3).map(img => `<img src="${img.url}" alt="" class="card-image-thumb" loading="lazy">`).join('')}
        ${record.images.length > 3 ? `<div class="card-images-more">+${record.images.length - 3}</div>` : ''}
       </div>`
    : '';

  const checkboxHtml = state.batchMode
    ? `<label class="card-checkbox"><input type="checkbox" onclick="event.stopPropagation(); toggleRecordSelection('${record.id}');"></label>`
    : '';

  return `
    <article class="record-card" data-id="${record.id}">
      ${checkboxHtml}
      <div class="card-header">
        <span class="card-patient">${escapeHtml(record.patient)}</span>
        <span class="card-date">${formatDate(record.date)}</span>
      </div>
      <h3 class="card-hospital">${escapeHtml(record.hospital)}</h3>
      <p class="card-dept">${escapeHtml(record.department)}${record.doctor ? ` · ${escapeHtml(record.doctor)}` : ''}</p>
      <div class="card-diagnosis">${escapeHtml(record.diagnosis)}</div>
      ${imagesHtml}
      <div class="card-footer">
        <span class="card-doctor">${record.doctor ? escapeHtml(record.doctor) : ''}</span>
        ${record.cost ? `<span class="card-cost">¥${record.cost.toFixed(2)}</span>` : ''}
      </div>
    </article>
  `;
}

function renderPhotos() {
  console.log('[Render] renderPhotos called, records count:', state.records.length);
  const allImages = [];
  state.records.forEach(record => {
    if (record.images && record.images.length > 0) {
      console.log('[Render] Found images in record:', record.id, 'count:', record.images.length);
      record.images.forEach((img, i) => {
        allImages.push({ ...img, recordId: record.id, imageIndex: i });
      });
    }
  });

  console.log('[Render] Total images:', allImages.length);

  let filteredImages = allImages;
  if (state.photoTagFilter !== 'all') {
    filteredImages = allImages.filter(img => img.tags === state.photoTagFilter);
  }

  if (filteredImages.length === 0) {
    els.photosGrid.innerHTML = '';
    els.photosEmptyState.style.display = 'flex';
    return;
  }

  els.photosEmptyState.style.display = 'none';
  els.photosGrid.innerHTML = filteredImages.map((img, i) => `
    <div class="photo-item" data-record-id="${img.recordId}" data-image-index="${img.imageIndex}">
      <img src="${img.url}" alt="" loading="lazy">
      <div class="photo-overlay">
        ${img.tags && typeof img.tags === 'string' ? `<span class="photo-tag">${escapeHtml(img.tags)}</span>` : ''}
      </div>
    </div>
  `).join('');

  els.photosGrid.querySelectorAll('.photo-item').forEach(item => {
    item.addEventListener('click', () => {
      openImagePreview(item.dataset.recordId, parseInt(item.dataset.imageIndex));
    });
  });
}

function updateSidebarStats() {
  const now = new Date();
  const thisMonth = state.records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  els.monthRecords.textContent = thisMonth.length;
  els.monthCost.textContent = '¥' + thisMonth.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(0);
}

// ===========================
// Modals
// ===========================
function openModal(recordId = null) {
  state.editingRecord = recordId;
  els.recordForm.reset();
  els.imagePreview.innerHTML = '';
  state.pendingImages = [];

  // Populate member dropdown
  const memberSelect = els.recordForm['recordMember'];
  memberSelect.innerHTML = state.familyMembers.map(m =>
    `<option value="${m.memberId}">${escapeHtml(m.name)} (${escapeHtml(m.relation)})</option>`
  ).join('');

  if (recordId) {
    const record = state.records.find(r => r.id === recordId);
    if (record) {
      els.modalTitle.textContent = '编辑就医记录';
      els.recordForm['recordId'].value = record.id;
      els.recordForm['recordMember'].value = record.memberId || '';
      els.recordForm['recordDate'].value = record.date || '';
      els.recordForm['recordHospital'].value = record.hospital || '';
      els.recordForm['recordDepartment'].value = record.department || '';
      els.recordForm['recordDoctor'].value = record.doctor || '';
      els.recordForm['recordDiagnosis'].value = record.diagnosis || '';
      els.recordForm['recordSymptoms'].value = record.symptoms || '';
      els.recordForm['recordPrescription'].value = record.prescription || '';
      els.recordForm['recordCost'].value = record.cost || '';

      // Set reminder fields
      if (record.reminder?.enabled) {
        els.recordForm['recordReminder'].value = record.reminder.followUpDate || '';
        els.recordForm['recordReminderNote'].value = record.reminder.note || '';
      }

      if (record.images && record.images.length > 0) {
        state.pendingImages = [...record.images];
        renderImagePreview();
      }
    }
  } else {
    els.modalTitle.textContent = '添加就医记录';
    els.recordForm['recordId'].value = '';
    // Default to active member
    if (state.activeMemberId) {
      memberSelect.value = state.activeMemberId;
    }
  }

  els.recordModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  els.recordModal.classList.remove('active');
  document.body.style.overflow = '';
  state.editingRecord = null;
}

function openDetailModal(recordId) {
  const record = state.records.find(r => r.id === recordId);
  if (!record) return;

  state.currentRecordId = recordId;

  const imagesHtml = record.images && record.images.length > 0
    ? `<div class="detail-section detail-images-section">
        <div class="detail-label">检查图片</div>
        <div class="detail-images">
          ${record.images.map((img, i) => `<img src="${img.url}" alt="" data-index="${i}" loading="lazy">`).join('')}
        </div>
       </div>`
    : '';

  els.detailContent.innerHTML = `
    <div class="detail-header">
      <h2 class="modal-title">就医详情</h2>
      <span class="detail-date">${formatDate(record.date)}</span>
    </div>
    <div class="detail-section"><div class="detail-label">患者姓名</div><div class="detail-value detail-patient">${escapeHtml(record.patient)}</div></div>
    <div class="detail-section"><div class="detail-label">医院</div><div class="detail-value detail-hospital">${escapeHtml(record.hospital)}</div></div>
    <div class="detail-section"><div class="detail-label">科室</div><div class="detail-value">${escapeHtml(record.department)}</div></div>
    ${record.doctor ? `<div class="detail-section"><div class="detail-label">医生</div><div class="detail-value">${escapeHtml(record.doctor)}</div></div>` : ''}
    <div class="detail-section"><div class="detail-label">诊断结果</div><div class="detail-value detail-diagnosis">${escapeHtml(record.diagnosis)}</div></div>
    ${record.symptoms ? `<div class="detail-section"><div class="detail-label">症状描述</div><div class="detail-value">${escapeHtml(record.symptoms)}</div></div>` : ''}
    ${record.prescription ? `<div class="detail-section"><div class="detail-label">医嘱</div><div class="detail-value">${escapeHtml(record.prescription)}</div></div>` : ''}
    ${record.cost ? `<div class="detail-section"><div class="detail-label">费用</div><div class="detail-value" style="color: var(--accent); font-weight: 600;">¥${record.cost.toFixed(2)}</div></div>` : ''}
    ${imagesHtml}
  `;

  els.detailContent.querySelectorAll('.detail-images img').forEach(img => {
    img.addEventListener('click', () => {
      openImagePreview(recordId, parseInt(img.dataset.index));
    });
  });

  els.detailModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  els.detailModal.classList.remove('active');
  document.body.style.overflow = '';
  state.currentRecordId = null;
}

function openSettingsModal() {
  els.changePasswordForm.reset();
  els.passwordError.textContent = '';
  els.settingsModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeSettingsModal() {
  els.settingsModal.classList.remove('active');
  document.body.style.overflow = '';
}

function openDeleteConfirm() {
  els.deleteConfirmModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeDeleteConfirm() {
  els.deleteConfirmModal.classList.remove('active');
  document.body.style.overflow = '';
}

async function confirmDelete() {
  if (!state.currentRecordId) return;
  setButtonLoading(els.confirmDeleteBtn, true);

  try {
    const data = await apiFetch(`/records/${state.currentRecordId}`, { method: 'DELETE' });
    if (data) {
      state.records = state.records.filter(r => r.id !== state.currentRecordId);
      closeDeleteConfirm();
      closeDetailModal();
      render();
      showToast('记录已删除', 'success');
    }
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  } finally {
    setButtonLoading(els.confirmDeleteBtn, false);
  }
}

// ===========================
// Image Preview
// ===========================
function openImagePreview(recordId, imageIndex) {
  const record = state.records.find(r => r.id === recordId);
  if (!record || !record.images || record.images.length === 0) return;

  state.previewImages = record.images;
  state.previewIndex = imageIndex;

  updatePreviewImage();
  els.imagePreviewModal.classList.add('active');
}

function closeImagePreview() {
  els.imagePreviewModal.classList.remove('active');
}

function updatePreviewImage() {
  const img = state.previewImages[state.previewIndex];
  els.previewImage.src = img.url;
  els.previewInfo.textContent = `${state.previewIndex + 1} / ${state.previewImages.length}`;
}

function navigatePreview(direction) {
  state.previewIndex = (state.previewIndex + direction + state.previewImages.length) % state.previewImages.length;
  updatePreviewImage();
}

// ===========================
// Form Submit
// ===========================
async function handleFormSubmit(e) {
  e.preventDefault();

  const selectedMemberId = els.recordForm['recordMember'].value;
  const selectedMember = state.familyMembers.find(m => m.memberId === selectedMemberId);

  const formData = {
    memberId: selectedMemberId,
    patient: selectedMember ? selectedMember.name : '',
    date: els.recordForm['recordDate'].value,
    hospital: els.recordForm['recordHospital'].value.trim(),
    department: els.recordForm['recordDepartment'].value.trim(),
    doctor: els.recordForm['recordDoctor'].value.trim(),
    diagnosis: els.recordForm['recordDiagnosis'].value.trim(),
    symptoms: els.recordForm['recordSymptoms'].value.trim(),
    prescription: els.recordForm['recordPrescription'].value.trim(),
    cost: parseFloat(els.recordForm['recordCost'].value) || 0,
    images: state.pendingImages,
    reminder: {
      enabled: !!els.recordForm['recordReminder'].value,
      followUpDate: els.recordForm['recordReminder'].value || null,
      note: els.recordForm['recordReminderNote'].value.trim()
    }
  };

  if (!formData.date || !formData.hospital || !formData.department || !formData.diagnosis) {
    showToast('请填写必填项', 'error');
    return;
  }

  const btn = els.recordForm.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  try {
    const recordId = els.recordForm['recordId'].value;

    if (recordId) {
      const data = await apiFetch(`/records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (data) {
        const index = state.records.findIndex(r => r.id === recordId);
        if (index !== -1) {
          state.records[index] = data.record;
        }
      }
    } else {
      const data = await apiFetch('/records', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (data) {
        state.records.unshift(data.record);
      }
    }

    closeModal();
    render();
    showToast('保存成功', 'success');
  } catch (err) {
    showToast(err.message || '保存失败', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

function handleEditFromDetail() {
  const recordId = state.currentRecordId;
  closeDetailModal();
  openModal(recordId);
}

function handleDeleteRecord() {
  openDeleteConfirm();
}

async function handleChangePassword(e) {
  e.preventDefault();
  els.passwordError.textContent = '';
  const btn = els.changePasswordForm.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const oldPassword = els.changePasswordForm['oldPassword'].value;
  const newPassword = els.changePasswordForm['newPassword'].value;
  const confirmPassword = els.changePasswordForm['confirmPassword'].value;

  if (newPassword !== confirmPassword) {
    els.passwordError.textContent = '两次输入的新密码不一致';
    setButtonLoading(btn, false);
    return;
  }

  if (newPassword.length < 6) {
    els.passwordError.textContent = '新密码至少6位';
    setButtonLoading(btn, false);
    return;
  }

  try {
    const data = await apiFetch('/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword })
    });

    if (data) {
      closeSettingsModal();
      showToast('密码修改成功', 'success');
    }
  } catch (err) {
    els.passwordError.textContent = err.message;
  } finally {
    setButtonLoading(btn, false);
  }
}

// ===========================
// Image Upload
// ===========================
function handleDragOver(e) {
  e.preventDefault();
  els.uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  els.uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  els.uploadArea.classList.remove('dragover');
  const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
  processFiles(files);
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files);
  processFiles(files);
}

async function processFiles(files) {
  const remaining = 9 - state.pendingImages.length;
  if (remaining <= 0) {
    showToast('最多只能上传9张图片', 'error');
    return;
  }

  const toUpload = files.slice(0, remaining);
  const formData = new FormData();
  toUpload.forEach(f => formData.append('images', f));

  const uploadArea = els.uploadArea;
  uploadArea.classList.add('uploading');

  try {
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getToken()}` },
      body: formData
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || '上传失败');
    }

    const data = await res.json();
    if (data.images) {
      state.pendingImages = [...state.pendingImages, ...data.images];
      renderImagePreview();
      showToast(`成功上传 ${data.images.length} 张图片`, 'success');
    }
  } catch (err) {
    showToast(err.message || '上传失败', 'error');
  } finally {
    uploadArea.classList.remove('uploading');
    els.imageInput.value = '';
  }
}

function renderImagePreview() {
  els.imagePreview.innerHTML = state.pendingImages.map((img, index) => `
    <div class="preview-item">
      <img src="${img.url}" alt="Preview">
      <button type="button" class="remove-btn" data-index="${index}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
    </div>
  `).join('');

  els.imagePreview.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.pendingImages.splice(parseInt(btn.dataset.index), 1);
      renderImagePreview();
    });
  });
}

// ===========================
// Utilities
// ===========================
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  const toast = els.toast;
  const iconMap = {
    success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };
  toast.innerHTML = `<span class="toast-icon">${iconMap[type] || iconMap.info}</span><span class="toast-message">${escapeHtml(message)}</span>`;
  toast.className = `toast visible ${type}`;
  setTimeout(() => { toast.classList.remove('visible'); }, 3000);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}

function setButtonLoading(btn, loading) {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add('loading');
  } else {
    btn.disabled = false;
    btn.classList.remove('loading');
    if (btn.dataset.originalText) {
      btn.innerHTML = btn.dataset.originalText;
    }
  }
}

function showLoading(show) {
  const existing = els.recordsList.querySelector('.loading-indicator');
  if (show && !existing) {
    const indicator = document.createElement('div');
    indicator.className = 'loading-indicator';
    indicator.innerHTML = '<div class="spinner"></div><span>加载中...</span>';
    els.recordsList.appendChild(indicator);
  } else if (!show && existing) {
    existing.remove();
  }
}

function updatePasswordStrength(password, bar) {
  if (!bar) return;
  let strength = 0;
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ['太弱', '弱', '中等', '强', '很强'];
  const colors = ['#C75D5D', '#E8B4A0', '#D4956A', '#5B8A72', '#3D6B54'];
  const idx = Math.min(strength, 4);

  bar.style.width = `${(idx + 1) * 20}%`;
  bar.style.background = colors[idx];
  bar.parentElement.querySelector('.strength-label').textContent = labels[idx];
}