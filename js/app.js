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
  costMax: '',
  // Calendar
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  calendarSelectedDate: null,
  // Metrics
  metricsChart: null,
  // Templates
  templates: JSON.parse(localStorage.getItem('recordTemplates') || '[]')
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
  exportModal: $('#exportModal'),
  exportModalClose: $('#exportModalClose'),
  exportCancelBtn: $('#exportCancelBtn'),
  exportConfirmBtn: $('#exportConfirmBtn'),
  loadMoreBtn: $('#loadMoreBtn'),
  mobileNav: $('#mobileNav'),
  deleteUserModal: $('#deleteUserModal'),
  deleteUserDesc: $('#deleteUserDesc'),
  usersTableBody: $('#usersTableBody'),
  // Health Metrics
  metricsTypeFilter: $('#metricsTypeFilter'),
  addMetricBtn: $('#addMetricBtn'),
  metricsList: $('#metricsList'),
  metricsEmpty: $('#metricsEmpty'),
  metricsTrendChart: $('#metricsTrendChart'),
  metricModal: $('#metricModal'),
  metricModalClose: $('#metricModalClose'),
  metricForm: $('#metricForm'),
  metricMember: $('#metricMember'),
  metricType: $('#metricType'),
  metricValue: $('#metricValue'),
  metricUnit: $('#metricUnit'),
  metricDate: $('#metricDate'),
  metricNotes: $('#metricNotes'),
  metricCancelBtn: $('#metricCancelBtn'),
  // Medications
  addMedicationBtn: $('#addMedicationBtn'),
  medicationsList: $('#medicationsList'),
  medicationsEmpty: $('#medicationsEmpty'),
  medicationModal: $('#medicationModal'),
  medicationModalClose: $('#medicationModalClose'),
  medicationModalTitle: $('#medicationModalTitle'),
  medicationForm: $('#medicationForm'),
  medicationId: $('#medicationId'),
  medMember: $('#medMember'),
  medName: $('#medName'),
  medDosage: $('#medDosage'),
  medUnit: $('#medUnit'),
  medTimes: $('#medTimes'),
  medTimeSlots: $('#medTimeSlots'),
  medStartDate: $('#medStartDate'),
  medEndDate: $('#medEndDate'),
  medNotes: $('#medNotes'),
  medicationCancelBtn: $('#medicationCancelBtn'),
  // Calendar
  calendarGrid: $('#calendarGrid'),
  calendarMonthLabel: $('#calendarMonthLabel'),
  calendarPrevBtn: $('#calendarPrevBtn'),
  calendarNextBtn: $('#calendarNextBtn'),
  calendarEvents: $('#calendarEvents'),
  calendarEventsTitle: $('#calendarEventsTitle'),
  calendarEventsList: $('#calendarEventsList'),
  // Search Suggestions
  searchSuggestions: $('#searchSuggestions'),
  // Overview Cards
  overviewCards: $('#overviewCards'),
  overviewMonthCount: $('#overviewMonthCount'),
  overviewMonthChange: $('#overviewMonthChange'),
  overviewReminders: $('#overviewReminders'),
  overviewReminderCount: $('#overviewReminderCount'),
  overviewReminderDesc: $('#overviewReminderDesc'),
  overviewLatestList: $('#overviewLatestList'),
  // Reminder List Modal
  reminderListModal: $('#reminderListModal'),
  reminderListContainer: $('#reminderListContainer'),
  reminderListSubtitle: $('#reminderListSubtitle'),
  // Templates
  templateSelect: $('#templateSelect'),
  saveTemplateBtn: $('#saveTemplateBtn'),
  deleteTemplateBtn: $('#deleteTemplateBtn'),
  // Import
  importBtn: $('#importBtn'),
  importModal: $('#importModal'),
  importModalClose: $('#importModalClose'),
  importFileInput: $('#importFileInput'),
  importDropZone: $('#importDropZone'),
  importPreview: $('#importPreview'),
  importModeGroup: $('#importModeGroup'),
  importConfirmBtn: $('#importConfirmBtn'),
  importCancelBtn: $('#importCancelBtn'),
  // Timeline
  timelineContainer: $('#timelineContainer'),
  timelineMemberFilter: $('#timelineMemberFilter'),
  timelineStartDate: $('#timelineStartDate'),
  timelineEndDate: $('#timelineEndDate')
};

// ===========================
// Init
// ===========================
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkLogin();
  setInterval(loadDueReminders, 300000);
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
    buildSearchSuggestions(e.target.value);
  }, 200));

  // Search suggestions: keyboard nav
  els.searchInput.addEventListener('keydown', (e) => {
    const container = els.searchSuggestions;
    if (!container || container.style.display === 'none') return;
    const items = container.querySelectorAll('.suggestion-item');
    const active = container.querySelector('.suggestion-item.active');
    let idx = Array.from(items).indexOf(active);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      idx = Math.min(idx + 1, items.length - 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      idx = Math.max(idx - 1, 0);
    } else if (e.key === 'Enter' && active) {
      e.preventDefault();
      selectSuggestion(active.dataset.value);
      return;
    } else {
      return;
    }

    items.forEach(el => el.classList.remove('active'));
    if (items[idx]) {
      items[idx].classList.add('active');
      items[idx].scrollIntoView({ block: 'nearest' });
    }
  });

  // Focus: show suggestions if there's a query
  els.searchInput.addEventListener('focus', () => {
    if (els.searchInput.value.trim().length > 0) {
      buildSearchSuggestions(els.searchInput.value);
    }
  });

  // Blur: hide suggestions (delay to allow click)
  els.searchInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (els.searchSuggestions) els.searchSuggestions.style.display = 'none';
    }, 200);
  });

  // Overview cards: click reminder card to open reminder list modal
  els.overviewReminders && els.overviewReminders.addEventListener('click', openReminderListModal);

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
  $('#duplicateRecordBtn').addEventListener('click', handleDuplicateRecord);

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
  els.exportModalClose && els.exportModalClose.addEventListener('click', closeExportModal);
  els.exportCancelBtn && els.exportCancelBtn.addEventListener('click', closeExportModal);
  els.exportConfirmBtn && els.exportConfirmBtn.addEventListener('click', confirmExport);
  els.exportModal && els.exportModal.querySelector('.modal-backdrop').addEventListener('click', closeExportModal);

  // Import
  els.importBtn && els.importBtn.addEventListener('click', openImportModal);
  els.importModalClose && els.importModalClose.addEventListener('click', closeImportModal);
  els.importCancelBtn && els.importCancelBtn.addEventListener('click', closeImportModal);
  els.importModal && els.importModal.querySelector('.modal-backdrop').addEventListener('click', closeImportModal);
  els.importDropZone && els.importDropZone.addEventListener('click', () => els.importFileInput.click());
  els.importDropZone && els.importDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    els.importDropZone.style.borderColor = 'var(--primary)';
    els.importDropZone.style.background = 'var(--primary-light)';
  });
  els.importDropZone && els.importDropZone.addEventListener('dragleave', () => {
    els.importDropZone.style.borderColor = '';
    els.importDropZone.style.background = '';
  });
  els.importDropZone && els.importDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    els.importDropZone.style.borderColor = '';
    els.importDropZone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file) handleImportFile(file);
  });
  els.importFileInput && els.importFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleImportFile(file);
  });
  els.importConfirmBtn && els.importConfirmBtn.addEventListener('click', confirmImport);

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

  // Reminder button - scroll to reminders in sidebar
  const reminderBtn = $('#reminderBtn');
  if (reminderBtn) {
    reminderBtn.addEventListener('click', () => {
      const remindersSection = $('.sidebar-reminders');
      if (remindersSection) {
        remindersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeImagePreview();
      closeDetailModal();
      closeSettingsModal();
      closeDeleteConfirm();
      closeExportModal();
      closeMetricModal();
      closeMedicationModal();
    }
    if (els.imagePreviewModal.classList.contains('active')) {
      if (e.key === 'ArrowLeft') navigatePreview(-1);
      if (e.key === 'ArrowRight') navigatePreview(1);
    }
  });

  // --- Metrics Event Listeners ---
  els.metricsTypeFilter && els.metricsTypeFilter.addEventListener('change', (e) => {
    loadMetrics(e.target.value);
  });
  els.addMetricBtn && els.addMetricBtn.addEventListener('click', openMetricModal);
  els.metricModalClose && els.metricModalClose.addEventListener('click', closeMetricModal);
  els.metricCancelBtn && els.metricCancelBtn.addEventListener('click', closeMetricModal);
  els.metricModal && els.metricModal.querySelector('.modal-backdrop').addEventListener('click', closeMetricModal);
  els.metricForm && els.metricForm.addEventListener('submit', handleMetricSubmit);

  // Update unit when metric type changes
  els.metricType && els.metricType.addEventListener('change', (e) => {
    const units = { blood_pressure: 'mmHg', blood_sugar: 'mmol/L', weight: 'kg', heart_rate: '次/分', height: 'cm' };
    els.metricUnit.value = units[e.target.value] || '';
  });

  // --- Medication Event Listeners ---
  els.addMedicationBtn && els.addMedicationBtn.addEventListener('click', () => openMedicationModal());
  els.medicationModalClose && els.medicationModalClose.addEventListener('click', closeMedicationModal);
  els.medicationCancelBtn && els.medicationCancelBtn.addEventListener('click', closeMedicationModal);
  els.medicationModal && els.medicationModal.querySelector('.modal-backdrop').addEventListener('click', closeMedicationModal);
  els.medicationForm && els.medicationForm.addEventListener('submit', handleMedicationSubmit);

  // --- Reminder List Modal ---
  els.reminderListModal && els.reminderListModal.querySelector('.modal-close').addEventListener('click', closeReminderListModal);
  els.reminderListModal && els.reminderListModal.querySelector('.modal-backdrop').addEventListener('click', closeReminderListModal);

  // --- Calendar Event Listeners ---
  els.calendarPrevBtn && els.calendarPrevBtn.addEventListener('click', () => {
    state.calendarMonth -= 1;
    if (state.calendarMonth < 0) { state.calendarMonth = 11; state.calendarYear -= 1; }
    renderCalendar();
  });
  els.calendarNextBtn && els.calendarNextBtn.addEventListener('click', () => {
    state.calendarMonth += 1;
    if (state.calendarMonth > 11) { state.calendarMonth = 0; state.calendarYear += 1; }
    renderCalendar();
  });

  // --- Template Event Listeners ---
  els.templateSelect && els.templateSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val !== '') loadTemplate(parseInt(val));
  });
  els.saveTemplateBtn && els.saveTemplateBtn.addEventListener('click', saveTemplate);
  els.deleteTemplateBtn && els.deleteTemplateBtn.addEventListener('click', deleteTemplate);
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

    // 如果 activeMemberId 存在，强制在参数中传递，确保后端只返回该成员的数据
    if (state.activeMemberId) {
      params.set('memberId', state.activeMemberId);
    }

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
      renderOverviewCards();
      if (data.count > 0) {
        showToast(`您有 ${data.count} 条复诊提醒待处理`, 'warning');
        if (!document.hasFocus()) {
          showDesktopNotification('复诊提醒', `您有 ${data.count} 条复诊提醒待处理`);
        }
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
      // 前端再次过滤，只显示当前激活成员的数据（双重保险）
      const activeMemberId = state.activeMemberId;
      state.reminders = activeMemberId
        ? (data.reminders || []).filter(r => {
            const record = state.records.find(rec => rec.id === r.recordId);
            return record && record.memberId === activeMemberId;
          })
        : (data.reminders || []);
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
      <div class="reminder-item ${statusClass}" onclick="viewReminderRecord('${r.recordId}')" style="cursor: pointer;" title="点击查看就医记录">
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

function viewReminderRecord(recordId) {
  const record = state.records.find(r => r.id === recordId);
  if (record) {
    openDetailModal(record.id);
  } else {
    showToast('未找到该记录', 'error');
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
      // 重新加载提醒数据（按新成员过滤）
      await loadDueReminders();
      await loadReminders();
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
    <div class="family-member-item" data-member-id="${m.memberId}">
      <div class="drag-handle" title="拖拽排序">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2v20M2 12h20M7 7h10M7 17h10M2 7h2M2 17h2M20 7h2M20 17h2"/>
        </svg>
      </div>
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

  // Initialize SortableJS
  if (typeof Sortable !== 'undefined') {
    Sortable.create(list, {
      handle: '.drag-handle',
      animation: 150,
      onEnd: async function() {
        const items = list.querySelectorAll('.family-member-item');
        const orderedIds = Array.from(items).map(item => item.dataset.memberId);
        await updateFamilyOrder(orderedIds);
      }
    });
  }
}

async function updateFamilyOrder(orderedIds) {
  try {
    const data = await apiFetch('/family/reorder', {
      method: 'PUT',
      body: JSON.stringify({ orderedIds })
    });
    if (data) {
      state.familyMembers = data.members;
      renderFamilySwitcher();
    }
  } catch (err) {
    console.error('更新顺序失败:', err);
  }
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
  // Update selected count display
  const selectedCount = state.selectedRecords.size;
  const selectedCountEl = $('#exportSelectedCount');
  const allCountEl = $('#exportAllCount');

  if (allCountEl) allCountEl.textContent = `包含所有 ${state.records.length} 条就医记录`;
  if (selectedCountEl) {
    selectedCountEl.textContent = selectedCount > 0
      ? `已选择 ${selectedCount} 条记录`
      : '请先勾选要导出的记录';
  }

  // Disable "selected" option if nothing selected
  const selectedRadio = document.querySelector('input[name="exportScope"][value="selected"]');
  if (selectedRadio) {
    selectedRadio.disabled = selectedCount === 0;
    if (selectedCount === 0) {
      document.querySelector('input[name="exportScope"][value="all"]').checked = true;
    }
  }

  els.exportModal.classList.add('active');
}

function closeExportModal() {
  els.exportModal.classList.remove('active');
}

async function confirmExport() {
  const format = document.querySelector('input[name="exportFormat"]:checked').value;
  const scope = document.querySelector('input[name="exportScope"]:checked').value;
  closeExportModal();

  try {
    let recordsToExport;

    if (scope === 'selected' && state.selectedRecords.size > 0) {
      recordsToExport = state.records.filter(r => state.selectedRecords.has(r.id));
    } else {
      recordsToExport = state.records;
    }

    const exportData = { records: recordsToExport, count: recordsToExport.length };

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `医程记录_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('导出成功', 'success');
    } else if (format === 'pdf') {
      await generatePDF(exportData);
    }
  } catch (err) {
    showToast(err.message || '导出失败', 'error');
  }
}

// ===========================
// Import
// ===========================
let importFileData = null;

function openImportModal() {
  importFileData = null;
  els.importPreview.style.display = 'none';
  els.importModeGroup.style.display = 'none';
  els.importConfirmBtn.disabled = true;
  els.importFileInput.value = '';
  els.importDropZone.querySelector('p').innerHTML = '将 JSON 文件拖拽到此处，或 <span style="color:var(--primary);cursor:pointer;">点击选择文件</span>';
  els.importModal.classList.add('active');
}

function closeImportModal() {
  els.importModal.classList.remove('active');
  importFileData = null;
}

function handleImportFile(file) {
  if (!file.name.endsWith('.json')) {
    showToast('请选择 JSON 格式的文件', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      const records = data.records || data;
      if (!Array.isArray(records) || records.length === 0) {
        showToast('文件中没有有效的就医记录', 'error');
        return;
      }

      // Validate required fields
      for (let i = 0; i < Math.min(records.length, 5); i++) {
        const r = records[i];
        if (!r.date || !r.hospital || !r.department || !r.diagnosis) {
          showToast(`第 ${i + 1} 条记录缺少必填字段（date/hospital/department/diagnosis）`, 'error');
          return;
        }
      }

      importFileData = records;
      renderImportPreview(records);
      els.importModeGroup.style.display = 'block';
      els.importConfirmBtn.disabled = false;
      showToast(`文件有效，共 ${records.length} 条记录`, 'success');
    } catch (err) {
      showToast('文件解析失败，请确保是有效的 JSON 文件', 'error');
    }
  };
  reader.readAsText(file);
}

function renderImportPreview(records) {
  const dates = records.map(r => r.date).filter(Boolean).sort();
  const hospitals = [...new Set(records.map(r => r.hospital).filter(Boolean))];
  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);

  els.importPreview.style.display = 'block';
  els.importPreview.innerHTML = `
    <div class="stats-card" style="padding:16px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div><span style="color:var(--text-muted);font-size:0.85rem;">记录总数</span><br><strong style="font-size:1.2rem;">${records.length}</strong></div>
        <div><span style="color:var(--text-muted);font-size:0.85rem;">总费用</span><br><strong style="font-size:1.2rem;">¥${totalCost.toFixed(0)}</strong></div>
        <div><span style="color:var(--text-muted);font-size:0.85rem;">日期范围</span><br><strong>${dates[0] || '-'} ~ ${dates[dates.length - 1] || '-'}</strong></div>
        <div><span style="color:var(--text-muted);font-size:0.85rem;">涉及医院</span><br><strong>${hospitals.length} 家</strong></div>
      </div>
      <div style="margin-top:8px;font-size:0.85rem;color:var(--text-muted);">${hospitals.slice(0, 3).join('、')}${hospitals.length > 3 ? ` 等${hospitals.length}家` : ''}</div>
    </div>
  `;
}

async function confirmImport() {
  const mode = document.querySelector('input[name="importMode"]:checked').value;
  if (!importFileData || importFileData.length === 0) return;

  if (mode === 'replace') {
    if (!confirm('替换导入将删除所有现有记录，此操作不可撤销。是否继续？')) return;
  }

  els.importConfirmBtn.disabled = true;
  els.importConfirmBtn.textContent = '导入中...';

  try {
    const data = await apiFetch('/import', {
      method: 'POST',
      body: JSON.stringify({ records: importFileData, mode })
    });

    if (data && data.success) {
      showToast(`成功导入 ${data.count} 条记录`, 'success');
      closeImportModal();
      loadData();
    }
  } catch (err) {
    showToast(err.message || '导入失败', 'error');
    els.importConfirmBtn.disabled = false;
  } finally {
    els.importConfirmBtn.textContent = '开始导入';
  }
}

async function generatePDF(data) {
  const { jsPDF } = window.jspdf;

  // Create a temporary HTML container for rendering
  const container = document.createElement('div');
  container.style.cssText = 'position: fixed; left: -9999px; top: 0; width: 800px; font-family: "Noto Sans SC", sans-serif; background: white; padding: 40px;';

  // Build HTML content with proper Chinese text
  let html = `
    <div style="text-align: center; margin-bottom: 20px;">
      <h1 style="color: #3B82F6; font-size: 24px; margin: 0;">健康记录报告</h1>
      <p style="color: #64748B; font-size: 12px; margin-top: 8px;">生成日期：${new Date().toLocaleDateString('zh-CN')}</p>
    </div>
    <div style="border-top: 1px solid #E2E8F0; margin-bottom: 20px;"></div>
  `;

  const records = data.records || [];

  records.forEach((record, index) => {
    html += `
      <div style="margin-bottom: 16px; page-break-inside: avoid;">
        <div style="background: #F1F5F9; padding: 8px 12px; font-weight: bold; font-size: 14px; color: #1E293B;">
          ${index + 1}. ${record.patient || '未知'} - ${record.date || '未知'}
        </div>
        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
          <tr><td style="color: #64748B; padding: 6px 12px; width: 80px;">医院</td><td style="color: #334155; padding: 6px 12px;">${record.hospital || '-'}</td></tr>
          <tr><td style="color: #64748B; padding: 6px 12px;">科室</td><td style="color: #334155; padding: 6px 12px;">${record.department || '-'}</td></tr>
          <tr><td style="color: #64748B; padding: 6px 12px;">诊断</td><td style="color: #334155; padding: 6px 12px;">${record.diagnosis || '-'}</td></tr>
          <tr><td style="color: #64748B; padding: 6px 12px;">费用</td><td style="color: #334155; padding: 6px 12px; font-weight: bold;">${record.cost ? '¥' + record.cost.toFixed(2) : '-'}</td></tr>
          ${record.doctor ? `<tr><td style="color: #64748B; padding: 6px 12px;">医生</td><td style="color: #334155; padding: 6px 12px;">${record.doctor}</td></tr>` : ''}
          ${record.symptoms ? `<tr><td style="color: #64748B; padding: 6px 12px;">症状</td><td style="color: #334155; padding: 6px 12px;">${record.symptoms.substring(0, 100)}${record.symptoms.length > 100 ? '...' : ''}</td></tr>` : ''}
          ${record.prescription ? `<tr><td style="color: #64748B; padding: 6px 12px;">医嘱</td><td style="color: #334155; padding: 6px 12px;">${record.prescription.substring(0, 100)}${record.prescription.length > 100 ? '...' : ''}</td></tr>` : ''}
        </table>
      </div>
    `;
  });

  // Summary
  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  html += `
    <div style="border-top: 1px solid #E2E8F0; margin-top: 20px; padding-top: 16px;">
      <h3 style="font-size: 14px; color: #1E293B; margin-bottom: 8px;">统计摘要</h3>
      <p style="font-size: 12px; color: #64748B;">总记录数：${records.length} 条</p>
      <p style="font-size: 12px; color: #64748B;">总费用：¥${totalCost.toFixed(2)}</p>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // Use html2canvas to render the container to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    // Convert canvas to PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 20;
    const contentWidth = pageWidth - 2 * margin;
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const pageContentHeight = pageHeight - 2 * margin;

    pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, imgHeight);
    let heightLeft = imgHeight - pageContentHeight;
    let position = margin;

    while (heightLeft > 0) {
      position = position - pageContentHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;
    }

    pdf.save(`健康报告_${new Date().toISOString().slice(0, 10)}.pdf`);
    showToast('PDF导出成功', 'success');
  } catch (err) {
    console.error('PDF生成失败:', err);
    showToast('PDF导出失败', 'error');
  } finally {
    document.body.removeChild(container);
  }
}

// ===========================
// Search Suggestions
// ===========================
function buildSearchSuggestions(query) {
  const container = els.searchSuggestions;
  if (!container) return;

  const trimmed = query.trim().toLowerCase();
  if (!trimmed || !state.records || state.records.length === 0) {
    container.style.display = 'none';
    return;
  }

  // Extract unique hospitals and departments
  const hospitals = new Set();
  const departments = new Set();
  state.records.forEach(r => {
    if (r.hospital && r.hospital.toLowerCase().includes(trimmed)) {
      hospitals.add(r.hospital);
    }
    if (r.department && r.department.toLowerCase().includes(trimmed)) {
      departments.add(r.department);
    }
  });

  const hospitalArr = Array.from(hospitals).slice(0, 5);
  const departmentArr = Array.from(departments).slice(0, 5);

  if (hospitalArr.length === 0 && departmentArr.length === 0) {
    container.style.display = 'none';
    return;
  }

  let html = '';
  if (hospitalArr.length > 0) {
    html += '<div class="suggestion-header">医院</div>';
    html += hospitalArr.map(h =>
      `<div class="suggestion-item" data-value="${escapeAttr(h)}">
        <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>${escapeHtml(h)}</span>
        <span class="suggestion-type">医院</span>
      </div>`
    ).join('');
  }
  if (departmentArr.length > 0) {
    html += '<div class="suggestion-header">科室</div>';
    html += departmentArr.map(d =>
      `<div class="suggestion-item" data-value="${escapeAttr(d)}">
        <svg class="suggestion-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
        <span>${escapeHtml(d)}</span>
        <span class="suggestion-type">科室</span>
      </div>`
    ).join('');
  }

  container.innerHTML = html;
  container.style.display = '';

  // Click handlers
  container.querySelectorAll('.suggestion-item').forEach(el => {
    el.addEventListener('click', () => {
      selectSuggestion(el.dataset.value);
    });
  });
}

function selectSuggestion(value) {
  els.searchInput.value = value;
  els.searchSuggestions.style.display = 'none';
  state.searchQuery = value;
  state.pagination.page = 1;
  loadData();
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

    if (els.monthRecords) els.monthRecords.textContent = data.thisMonth.count;
    if (els.monthCost) els.monthCost.textContent = '¥' + data.thisMonth.cost.toFixed(0);
    if (els.totalCost) els.totalCost.textContent = '¥' + data.lastYear.cost.toFixed(0);

    // Render charts
    renderCostTrendChart(data.monthlyFrequency);
    renderDepartmentPieChart(data.departments);
    renderDepartmentCostChart(data.departmentCosts);
    renderFrequencyChart(data.monthlyFrequency);
    renderHealthTimeline(state.records);
    renderMiniCostChart(data.monthlyFrequency);
  } catch (err) {
    console.error('加载统计失败:', err);
  }
}

let costTrendChart = null;
let departmentPieChart = null;
let departmentCostChart = null;

function renderCostTrendChart(monthlyData) {
  const ctx = $('#costTrendChart');
  if (!ctx) return;

  if (costTrendChart) {
    costTrendChart.destroy();
  }

  const labels = monthlyData.map(m => m.label);
  const values = monthlyData.map(m => m.cost);

  costTrendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: '医疗费用',
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
          cornerRadius: 8,
          callbacks: {
            label: ctx => '¥' + (ctx.parsed.y || 0).toFixed(0)
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: val => '¥' + val
          },
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

function renderDepartmentCostChart(deptData) {
  const ctx = $('#departmentCostChart');
  if (!ctx) return;

  if (departmentCostChart) {
    departmentCostChart.destroy();
  }

  if (!deptData || deptData.length === 0) {
    ctx.parentNode.innerHTML = '<div style="text-align:center;padding:40px;color:#94A3B8;">暂无费用数据</div>';
    return;
  }

  const labels = deptData.map(d => d[0]);
  const values = deptData.map(d => d[1]);
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  departmentCostChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '费用',
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => '¥' + (ctx.parsed.x || 0).toFixed(0)
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: { callback: val => '¥' + val },
          grid: { color: 'rgba(148, 163, 184, 0.1)' }
        },
        y: {
          grid: { display: false }
        }
      }
    }
  });
}

function renderMiniCostChart(monthlyData) {
  const container = $('#miniCostChart');
  const labelsContainer = $('#miniCostLabels');
  if (!container || !labelsContainer) return;

  const last6 = monthlyData.slice(-6);
  const costs = last6.map(m => m.cost || 0);
  const maxCost = Math.max(...costs, 1);

  container.innerHTML = costs.map(cost => {
    const height = Math.max((cost / maxCost) * 100, 5);
    return `<div class="mini-cost-bar" style="height: ${height}%" title="¥${cost.toFixed(0)}"></div>`;
  }).join('');

  labelsContainer.innerHTML = last6.map(m => `<span>${m.label}</span>`).join('');
}

function renderFrequencyChart(monthlyData) {
  const container = $('#frequencyChart');
  if (!container) return;

  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);
  const chartHeight = 100;
  container.innerHTML = monthlyData.map(m => {
    const h = maxCount > 0 ? Math.max((m.count / maxCount) * chartHeight, m.count > 0 ? 5 : 0) : 0;
    return `
      <div class="bar-wrapper" title="${m.count}次就医">
        <div class="bar" style="height: ${h}px"></div>
        <span class="bar-label">${m.label}</span>
      </div>`;
  }).join('');
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
// Health Metrics
// ===========================
async function loadMetrics(type) {
  try {
    let url = '/metrics?limit=500';
    if (type && type !== 'all') url += '&type=' + type;
    const data = await apiFetch(url);
    const metrics = data.metrics || [];

    renderMetrics(metrics);
    renderMetricsChart(metrics);
  } catch (err) {
    console.error('加载健康指标失败:', err);
  }
}

function renderMetrics(metrics) {
  if (!els.metricsList) return;
  if (metrics.length === 0) {
    els.metricsList.innerHTML = '';
    els.metricsEmpty.style.display = 'block';
    return;
  }
  els.metricsEmpty.style.display = 'none';

  const typeLabels = { blood_pressure: '血压', blood_sugar: '血糖', weight: '体重', heart_rate: '心率', height: '身高' };
  const icons = {
    blood_pressure: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M10 17l-5-5a3.5 3.5 0 1 1 5-5 3.5 3.5 0 1 1 5 5l-5 5z"/></svg>',
    blood_sugar: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M10 3l4 5a5 5 0 1 1-8 0l4-5z"/></svg>',
    weight: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><line x1="10" y1="3" x2="10" y2="5"/><line x1="6" y1="5" x2="14" y2="5"/><path d="M3 17h14l-2-7H5L3 17z"/></svg>',
    heart_rate: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><polyline points="18 10 15 10 13 16 9 4 7 10 4 10"/></svg>',
    height: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><line x1="4" y1="2" x2="4" y2="18"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="4" y1="6" x2="8" y2="6"/><line x1="4" y1="10" x2="8" y2="10"/><line x1="4" y1="14" x2="8" y2="14"/></svg>'
  };
  els.metricsList.innerHTML = metrics.map(m => {
    return `<div class="metric-item">
      <div class="metric-header">
        <span class="metric-icon">${icons[m.type] || '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><rect x="3" y="3" width="14" height="14" rx="2"/><line x1="3" y1="9" x2="17" y2="9"/><line x1="9" y1="3" x2="9" y2="17"/></svg>'}</span>
        <span class="metric-type">${typeLabels[m.type] || m.type}</span>
        <span class="metric-value">${m.value} <small>${m.unit || ''}</small></span>
        <span class="metric-date">${m.date || ''}</span>
        <button class="btn btn-danger btn-sm" onclick="deleteMetric('${m.id}')" title="删除">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
      ${m.notes ? `<div class="metric-notes">${escapeHtml(m.notes)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderMetricsChart(metrics) {
  const canvas = els.metricsTrendChart;
  if (!canvas) return;

  // Group by type and get latest 20 entries for chart
  const typeMap = {};
  metrics.forEach(m => {
    if (!typeMap[m.type]) typeMap[m.type] = [];
    typeMap[m.type].push(m);
  });

  // Destroy existing chart
  if (state.metricsChart) {
    state.metricsChart.destroy();
    state.metricsChart = null;
  }

  const types = Object.keys(typeMap);
  if (types.length === 0) {
    canvas.style.display = 'none';
    return;
  }
  canvas.style.display = '';

  // Pick the most recent type with data
  const activeType = types[0];
  const data = typeMap[activeType].slice().reverse().slice(-20);

  const typeLabels = { blood_pressure: '血压', blood_sugar: '血糖', weight: '体重', heart_rate: '心率', height: '身高' };

  state.metricsChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map(d => d.date),
      datasets: [{
        label: typeLabels[activeType] || activeType,
        data: data.map(d => d.value),
        borderColor: '#3B82F6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: '#3B82F6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: true } },
      scales: {
        y: { beginAtZero: false },
        x: { ticks: { maxRotation: 45, font: { size: 10 } } }
      }
    }
  });
}

function openMetricModal() {
  // Populate member select
  populateMemberSelect(els.metricMember);

  // Default date
  els.metricDate.value = new Date().toISOString().slice(0, 10);

  // Trigger unit update
  const event = new Event('change');
  els.metricType.dispatchEvent(event);

  els.metricModal.classList.add('active');
}

function closeMetricModal() {
  els.metricModal.classList.remove('active');
  els.metricForm.reset();
}

async function handleMetricSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  try {
    await apiFetch('/metrics', {
      method: 'POST',
      body: JSON.stringify({
        type: els.metricType.value,
        value: parseFloat(els.metricValue.value),
        unit: els.metricUnit.value,
        date: els.metricDate.value,
        notes: els.metricNotes.value,
        memberId: els.metricMember.value
      })
    });
    closeMetricModal();
    showToast('指标录入成功', 'success');
    loadMetrics(els.metricsTypeFilter ? els.metricsTypeFilter.value : 'all');
  } catch (err) {
    showToast(err.message || '录入失败', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function deleteMetric(id) {
  if (!confirm('确定删除这条指标记录吗？')) return;
  try {
    await apiFetch('/metrics/' + id, { method: 'DELETE' });
    showToast('已删除', 'success');
    loadMetrics(els.metricsTypeFilter ? els.metricsTypeFilter.value : 'all');
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  }
}

// ===========================
// Medications
// ===========================
async function loadMedications() {
  try {
    const data = await apiFetch('/medications');
    renderMedications(data.medications || []);
  } catch (err) {
    console.error('加载用药记录失败:', err);
  }
}

function renderMedications(medications) {
  if (!els.medicationsList) return;
  if (medications.length === 0) {
    els.medicationsList.innerHTML = '';
    els.medicationsEmpty.style.display = 'block';
    return;
  }
  els.medicationsEmpty.style.display = 'none';

  els.medicationsList.innerHTML = medications.map(m => `
    <div class="medication-card ${m.active ? '' : 'inactive'}">
      <div class="medication-header">
        <div class="medication-name">
          <span class="medication-status ${m.active ? 'active' : ''}"></span>
          ${escapeHtml(m.name)}
        </div>
        <div class="medication-actions">
          <label class="switch">
            <input type="checkbox" ${m.active ? 'checked' : ''} onchange="toggleMedication('${m.id}', this.checked)">
            <span class="switch-slider"></span>
          </label>
          <button class="btn btn-ghost btn-sm" onclick="editMedication('${m.id}')" title="编辑">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteMedication('${m.id}')" title="删除">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
      <div class="medication-details">
        <span class="medication-dosage">${escapeHtml(m.dosage)} ${escapeHtml(m.unit)} | 每日${m.timesPerDay}次</span>
        ${m.timeSlots && m.timeSlots.length > 0 ? `<span class="medication-times">${m.timeSlots.join(', ')}</span>` : ''}
        <span class="medication-period">${m.startDate || ''}${m.endDate ? ' ~ ' + m.endDate : ''}</span>
      </div>
      ${m.notes ? `<div class="medication-notes">${escapeHtml(m.notes)}</div>` : ''}
    </div>
  `).join('');
}

function openMedicationModal(editData) {
  populateMemberSelect(els.medMember);

  if (editData) {
    els.medicationModalTitle.textContent = '编辑药品';
    els.medicationId.value = editData.id;
    els.medName.value = editData.name;
    els.medDosage.value = editData.dosage;
    els.medUnit.value = editData.unit;
    els.medTimes.value = editData.timesPerDay || 1;
    els.medTimeSlots.value = (editData.timeSlots || []).join(',');
    els.medStartDate.value = editData.startDate || '';
    els.medEndDate.value = editData.endDate || '';
    els.medNotes.value = editData.notes || '';
    if (editData.memberId) els.medMember.value = editData.memberId;
  } else {
    els.medicationModalTitle.textContent = '添加药品';
    els.medicationId.value = '';
    els.medicationForm.reset();
    els.medStartDate.value = new Date().toISOString().slice(0, 10);
  }

  els.medicationModal.classList.add('active');
}

function closeMedicationModal() {
  els.medicationModal.classList.remove('active');
  els.medicationForm.reset();
}

async function handleMedicationSubmit(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  setButtonLoading(btn, true);

  const editId = els.medicationId.value;
  const timeSlotsStr = els.medTimeSlots.value.trim();
  const timeSlots = timeSlotsStr ? timeSlotsStr.split(',').map(t => t.trim()).filter(Boolean) : [];

  try {
    const body = {
      name: els.medName.value,
      dosage: els.medDosage.value,
      unit: els.medUnit.value,
      timesPerDay: parseInt(els.medTimes.value) || 1,
      timeSlots,
      startDate: els.medStartDate.value,
      endDate: els.medEndDate.value,
      notes: els.medNotes.value,
      memberId: els.medMember.value
    };

    if (editId) {
      await apiFetch('/medications/' + editId, {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      showToast('药品已更新', 'success');
    } else {
      await apiFetch('/medications', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      showToast('药品已添加', 'success');
    }
    closeMedicationModal();
    loadMedications();
  } catch (err) {
    showToast(err.message || '保存失败', 'error');
  } finally {
    setButtonLoading(btn, false);
  }
}

async function toggleMedication(id, active) {
  try {
    await apiFetch('/medications/' + id + '/toggle', {
      method: 'PATCH',
      body: JSON.stringify({ active })
    });
    loadMedications();
  } catch (err) {
    showToast(err.message || '操作失败', 'error');
  }
}

async function deleteMedication(id) {
  if (!confirm('确定要删除这条用药记录吗？')) return;
  try {
    await apiFetch('/medications/' + id, { method: 'DELETE' });
    showToast('已删除', 'success');
    loadMedications();
  } catch (err) {
    showToast(err.message || '删除失败', 'error');
  }
}

function editMedication(id) {
  // Find from rendered cards - fetch and populate
  apiFetch('/medications').then(data => {
    const med = (data.medications || []).find(m => m.id === id);
    if (med) openMedicationModal(med);
  }).catch(err => showToast(err.message, 'error'));
}

// ===========================
// Calendar View
// ===========================
function renderCalendar() {
  if (!els.calendarGrid) return;

  const year = state.calendarYear;
  const month = state.calendarMonth;

  els.calendarMonthLabel.textContent = `${year}年${month + 1}月`;

  // Get records that have dates
  const allRecords = state.records || [];
  const recordDates = new Set();
  const dateRecordMap = {};

  allRecords.forEach(r => {
    if (r.date) {
      const d = r.date.slice(0, 10);
      recordDates.add(d);
      if (!dateRecordMap[d]) dateRecordMap[d] = [];
      dateRecordMap[d].push(r);
    }
  });

  // Get reminders with dates
  const reminders = state.reminders || [];
  const reminderDates = new Set();
  reminders.forEach(r => {
    if (r.date) {
      reminderDates.add(r.date);
    }
  });

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  let html = '<div class="calendar-weekdays">' +
    weekdays.map(d => `<span>${d}</span>`).join('') + '</div>';

  // Calendar days
  let day = 1;
  for (let row = 0; row < 6; row++) {
    if (day > daysInMonth) break;
    html += '<div class="calendar-week">';
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < firstDay) {
        html += '<span class="calendar-day empty"></span>';
      } else if (day > daysInMonth) {
        html += '<span class="calendar-day empty"></span>';
      } else {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasRecord = recordDates.has(dateStr);
        const hasReminder = reminderDates.has(dateStr);
        const isToday = dateStr === new Date().toISOString().slice(0, 10);
        const isSelected = dateStr === state.calendarSelectedDate;

        let cls = 'calendar-day';
        if (isToday) cls += ' today';
        if (isSelected) cls += ' selected';
        if (hasRecord || hasReminder) cls += ' has-event';

        let dots = '';
        if (hasRecord) dots += '<span class="dot dot-blue"></span>';
        if (hasReminder) dots += '<span class="dot dot-orange"></span>';

        html += `<span class="${cls}" data-date="${dateStr}">${day}${dots}</span>`;
        day++;
      }
    }
    html += '</div>';
  }

  els.calendarGrid.innerHTML = html;

  // Click handler for day selection
  els.calendarGrid.querySelectorAll('.calendar-day:not(.empty)').forEach(el => {
    el.addEventListener('click', () => {
      const date = el.dataset.date;
      state.calendarSelectedDate = date;
      renderCalendar();
      showCalendarEvents(date, dateRecordMap[date] || [], reminders.filter(r => r.date === date));
    });
  });

  // Show events for selected date or first day with events
  if (state.calendarSelectedDate) {
    const d = state.calendarSelectedDate;
    showCalendarEvents(d, dateRecordMap[d] || [], reminders.filter(r => r.date === d));
  } else {
    // Find first date with events
    const sortedDates = Object.keys(dateRecordMap).sort();
    if (sortedDates.length > 0) {
      const first = sortedDates[0];
      showCalendarEvents(first, dateRecordMap[first] || [], reminders.filter(r => r.date === first));
    } else {
      els.calendarEvents.style.display = 'none';
    }
  }
}

function showCalendarEvents(date, records, reminders) {
  if (!els.calendarEvents) return;
  els.calendarEvents.style.display = 'block';
  els.calendarEventsTitle.textContent = `${date} 的就诊记录`;

  let html = '';

  if (records.length > 0) {
    records.forEach(r => {
      html += `<div class="calendar-event-item">
        <div class="calendar-event-header">
          <span class="calendar-event-title">${escapeHtml(r.patient || '未知')} - ${escapeHtml(r.diagnosis || '')}</span>
          <span class="calendar-event-hospital">${escapeHtml(r.hospital || '')}</span>
        </div>
        <div class="calendar-event-cost">${r.cost ? '¥' + r.cost.toFixed(2) : ''}</div>
      </div>`;
    });
  }

  if (reminders.length > 0) {
    html += '<div class="calendar-reminders-section"><h4>提醒</h4>';
    reminders.forEach(r => {
      html += `<div class="calendar-event-item reminder">
        <span>${escapeHtml(r.title || '')}</span>
        <span class="calendar-event-notes">${escapeHtml(r.notes || '')}</span>
      </div>`;
    });
    html += '</div>';
  }

  if (!html) {
    html = '<p class="calendar-no-events">当天无记录</p>';
  }

  els.calendarEventsList.innerHTML = html;
}

// ===========================
// Timeline
// ===========================
function renderTimeline() {
  if (!els.timelineContainer) return;

  let records = [...state.records];

  // Populate member filter
  populateTimelineFilter();

  // Apply member filter
  const memberId = els.timelineMemberFilter ? els.timelineMemberFilter.value : '';
  if (memberId) {
    records = records.filter(r => r.memberId === memberId);
  }

  // Apply date range
  const startDate = els.timelineStartDate ? els.timelineStartDate.value : '';
  const endDate = els.timelineEndDate ? els.timelineEndDate.value : '';
  if (startDate) records = records.filter(r => r.date >= startDate);
  if (endDate) records = records.filter(r => r.date <= endDate);

  if (records.length === 0) {
    els.timelineContainer.innerHTML = '<div class="timeline-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="color:var(--text-muted);margin-bottom:12px;"><path d="M22 12H2M8 19l-4-4 4-4M16 5l4 4-4 4"/><circle cx="12" cy="12" r="3"/></svg><p>暂无就医记录</p></div>';
    return;
  }

  // Sort by date descending
  records.sort((a, b) => new Date(b.date) - new Date(a.date));

  // Group by year-month
  const groups = {};
  records.forEach(r => {
    const key = r.date.slice(0, 7);
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  const sortedMonths = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  let html = '';
  sortedMonths.forEach(month => {
    const items = groups[month];
    const totalCost = items.reduce((s, r) => s + (r.cost || 0), 0);
    const [year, m] = month.split('-');
    html += `<div class="timeline-month-group">
      <div class="timeline-month-header">
        <span class="timeline-month-label">${year}年${parseInt(m)}月</span>
        <span class="timeline-month-stats">${items.length} 次就诊 · ¥${totalCost.toFixed(0)}</span>
      </div>
      <div class="timeline-entries">`;

    items.forEach((r, i) => {
      const isLast = i === items.length - 1;
      html += `<div class="timeline-entry${isLast ? ' last' : ''}">
        <div class="timeline-dot"></div>
        ${isLast ? '' : '<div class="timeline-line"></div>'}
        <div class="timeline-card" onclick="openDetailModal('${r.id}')">
          <div class="timeline-card-header">
            <span class="timeline-date">${formatDate(r.date)}</span>
            ${r.cost ? `<span class="timeline-cost">¥${r.cost}</span>` : ''}
          </div>
          <div class="timeline-card-body">
            <div class="timeline-hospital">${escapeHtml(r.hospital)}</div>
            <div class="timeline-dept">${escapeHtml(r.department)} · ${escapeHtml(r.doctor || '未知医生')}</div>
            <div class="timeline-diagnosis">${escapeHtml(r.diagnosis)}</div>
            ${r.symptoms ? `<div class="timeline-symptoms">症状：${escapeHtml(r.symptoms)}</div>` : ''}
          </div>
        </div>
      </div>`;
    });

    html += `</div></div>`;
  });

  els.timelineContainer.innerHTML = html;
}

function populateTimelineFilter() {
  if (!els.timelineMemberFilter) return;
  const currentVal = els.timelineMemberFilter.value;
  els.timelineMemberFilter.innerHTML = '<option value="">全部成员</option>' +
    state.familyMembers.map(m =>
      `<option value="${m.memberId}">${escapeHtml(m.name)}</option>`
    ).join('');
  if (currentVal) els.timelineMemberFilter.value = currentVal;
}

function populateMemberSelect(selectEl) {
  if (!selectEl) return;
  selectEl.innerHTML = state.familyMembers.map(m =>
    `<option value="${m.memberId}">${escapeHtml(m.name)}</option>`
  ).join('');
}

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
  } else if (view === 'metrics') {
    loadMetrics();
  } else if (view === 'medications') {
    loadMedications();
  } else if (view === 'calendar') {
    loadReminders();
    renderCalendar();
  } else if (view === 'timeline') {
    renderTimeline();
  } else {
    // records and photos views need render()
    render();
  }
}

function renderOverviewCards() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Current month records
  const thisMonthRecords = state.records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });

  // Previous month records for comparison
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const prevMonthRecords = state.records.filter(r => {
    const d = new Date(r.date);
    return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  });

  // Update month visit count
  const count = thisMonthRecords.length;
  if (els.overviewMonthCount) {
    els.overviewMonthCount.textContent = count;
  }

  // Month-over-month change
  if (els.overviewMonthChange) {
    const prevCount = prevMonthRecords.length;
    if (count > 0 || prevCount > 0) {
      if (count > prevCount) {
        const diff = count - prevCount;
        els.overviewMonthChange.innerHTML = `<span style="color:#16a34a">↑ ${diff}</span> vs 上月`;
      } else if (count < prevCount) {
        const diff = prevCount - count;
        els.overviewMonthChange.innerHTML = `<span style="color:#dc2626">↓ ${diff}</span> vs 上月`;
      } else {
        els.overviewMonthChange.innerHTML = `<span style="color:#64748b">→ 持平</span> vs 上月`;
      }
    } else {
      els.overviewMonthChange.textContent = '';
    }
  }

  // Reminder count
  const dueCount = state.dueReminderCount || 0;
  if (els.overviewReminderCount) {
    els.overviewReminderCount.textContent = dueCount;
  }
  if (els.overviewReminderDesc) {
    els.overviewReminderDesc.textContent = dueCount > 0 ? `${dueCount} 条待处理` : '暂无待办';
  }

  // Latest 3 records
  if (els.overviewLatestList) {
    const sorted = [...state.records].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted.slice(0, 3);

    if (latest.length === 0) {
      els.overviewLatestList.innerHTML = '<div class="overview-card-empty">暂无记录</div>';
    } else {
      els.overviewLatestList.innerHTML = latest.map(r => {
        const diag = r.diagnosis && r.diagnosis.length > 18 ? r.diagnosis.slice(0, 18) + '…' : (r.diagnosis || '');
        return `<div class="overview-card-item" data-record-id="${r.id}">
          <div class="overview-item-main">${escapeHtml(r.hospital || '未知医院')}</div>
          <div class="overview-item-sub">${escapeHtml(formatDate(r.date))}${diag ? ' · ' + escapeHtml(diag) : ''}</div>
        </div>`;
      }).join('');

      // Click to open detail modal
      els.overviewLatestList.querySelectorAll('.overview-card-item').forEach(el => {
        el.addEventListener('click', () => {
          const id = el.dataset.recordId;
          if (id) openDetailModal(id);
        });
      });
    }
  }
}

function render() {
  renderRecords();
  renderPhotos();
  updateSidebarStats();
  updateSidebarReminders();
  updateLoadMoreBtn();
  renderOverviewCards();
}

// ===========================
// Reminder List Modal
// ===========================
function openReminderListModal() {
  const modal = els.reminderListModal;
  const container = els.reminderListContainer;
  const subtitle = els.reminderListSubtitle;
  if (!modal || !container) return;

  // Load all reminders (not just due) from the API
  loadReminderListModal();
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

async function loadReminderListModal() {
  const container = els.reminderListContainer;
  const subtitle = els.reminderListSubtitle;
  if (!container) return;

  container.innerHTML = '<div class="reminder-modal-empty">加载中...</div>';

  try {
    const data = await apiFetch('/reminders');
    if (!data || !data.reminders) {
      container.innerHTML = '<div class="reminder-modal-empty">暂无提醒</div>';
      if (subtitle) subtitle.textContent = '暂无提醒数据';
      return;
    }

    // Filter by active member
    const activeMemberId = state.activeMemberId;
    let reminders = activeMemberId
      ? data.reminders.filter(r => {
          const record = state.records.find(rec => rec.id === r.recordId);
          return record && record.memberId === activeMemberId;
        })
      : data.reminders;

    if (reminders.length === 0) {
      container.innerHTML = '<div class="reminder-modal-empty">暂无提醒</div>';
      if (subtitle) subtitle.textContent = '暂无待办提醒';
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Sort: overdue first, then today, then upcoming
    reminders.sort((a, b) => {
      const aOverdue = a.followUpDate < today ? 0 : 1;
      const bOverdue = b.followUpDate < today ? 0 : 1;
      if (aOverdue !== bOverdue) return aOverdue - bOverdue;
      return new Date(a.followUpDate) - new Date(b.followUpDate);
    });

    if (subtitle) subtitle.textContent = `共 ${reminders.length} 条提醒`;

    container.innerHTML = reminders.map(r => {
      const isOverdue = r.followUpDate < today;
      const isToday = r.followUpDate === today;
      const statusClass = isOverdue ? 'overdue' : isToday ? 'today' : 'upcoming';
      const statusText = isOverdue ? '已过期' : isToday ? '今天' : formatDate(r.followUpDate);

      return `<div class="reminder-modal-item ${statusClass}" data-record-id="${r.recordId}">
        <div class="reminder-modal-status">${statusText}</div>
        <div class="reminder-modal-body">
          <div class="reminder-modal-patient">${escapeHtml(r.patient)}</div>
          <span class="reminder-modal-dept">${escapeHtml(r.hospital)} · ${escapeHtml(r.department)}</span>
          ${r.note ? `<span class="reminder-modal-note">${escapeHtml(r.note)}</span>` : ''}
        </div>
      </div>`;
    }).join('');

    // Click to view record detail
    container.querySelectorAll('.reminder-modal-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.recordId;
        if (id) {
          closeReminderListModal();
          // Small delay so modal closes smoothly before detail opens
          setTimeout(() => {
            const record = state.records.find(r => r.id === id);
            if (record) openDetailModal(record.id);
            else showToast('未找到该记录', 'error');
          }, 150);
        }
      });
    });
  } catch (err) {
    console.error('加载提醒列表失败:', err);
    container.innerHTML = '<div class="reminder-modal-empty">加载失败</div>';
  }
}

function closeReminderListModal() {
  const modal = els.reminderListModal;
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function updateSidebarReminders() {
  loadReminders();
}

// Batch Operations
function toggleBatchMode() {
  console.log('[Batch] Toggling batch mode, current:', state.batchMode, '->', !state.batchMode);
  state.batchMode = !state.batchMode;
  state.selectedRecords.clear();

  document.body.classList.toggle('batch-mode', state.batchMode);

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

  // Re-render to show/hide checkboxes
  renderRecords();

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

  if (els.monthRecords) els.monthRecords.textContent = thisMonth.length;
  if (els.monthCost) els.monthCost.textContent = '¥' + thisMonth.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(0);
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
  populateTemplateSelect();
}

function closeModal() {
  els.recordModal.classList.remove('active');
  document.body.style.overflow = '';
  state.editingRecord = null;
}

// ===========================
// Templates
// ===========================
function populateTemplateSelect() {
  const sel = els.templateSelect;
  if (!sel) return;
  sel.innerHTML = '<option value="">从模板加载...</option>' +
    state.templates.map((t, i) => `<option value="${i}">${escapeHtml(t.name)}</option>`).join('');
}

function saveTemplate() {
  const name = prompt('请输入模板名称：');
  if (!name) return;
  const data = {
    name,
    hospital: els.recordForm['recordHospital'].value,
    department: els.recordForm['recordDepartment'].value,
    doctor: els.recordForm['recordDoctor'].value,
    diagnosis: els.recordForm['recordDiagnosis'].value,
    symptoms: els.recordForm['recordSymptoms'].value,
    prescription: els.recordForm['recordPrescription'].value
  };
  if (!data.hospital && !data.department && !data.diagnosis) {
    showToast('请至少填写医院、科室或诊断结果', 'warning');
    return;
  }
  state.templates.push(data);
  localStorage.setItem('recordTemplates', JSON.stringify(state.templates));
  populateTemplateSelect();
  showToast('模板保存成功', 'success');
}

function loadTemplate(index) {
  const t = state.templates[index];
  if (!t) return;
  els.recordForm['recordHospital'].value = t.hospital || '';
  els.recordForm['recordDepartment'].value = t.department || '';
  els.recordForm['recordDoctor'].value = t.doctor || '';
  els.recordForm['recordDiagnosis'].value = t.diagnosis || '';
  els.recordForm['recordSymptoms'].value = t.symptoms || '';
  els.recordForm['recordPrescription'].value = t.prescription || '';
}

function deleteTemplate() {
  const sel = els.templateSelect;
  const idx = parseInt(sel.value);
  if (isNaN(idx) || idx < 0 || idx >= state.templates.length) {
    showToast('请先选择一个模板', 'warning');
    return;
  }
  if (!confirm(`确认删除模板"${state.templates[idx].name}"？`)) return;
  state.templates.splice(idx, 1);
  localStorage.setItem('recordTemplates', JSON.stringify(state.templates));
  populateTemplateSelect();
  showToast('模板已删除', 'success');
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
    const recordId = els.recordForm['recordId']?.value;

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
    loadDueReminders();
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

function handleDuplicateRecord() {
  const record = state.records.find(r => r.id === state.currentRecordId);
  if (!record) {
    showToast('未找到记录', 'error');
    return;
  }

  closeDetailModal();

  // Open a fresh modal for new record (no recordId = create mode)
  openModal();

  // Fill the form with the record data to copy
  els.modalTitle.textContent = '复制创建';

  // Select the same member
  const memberSelect = els.recordForm['recordMember'];
  if (record.memberId) {
    memberSelect.value = record.memberId;
  }

  els.recordForm['recordDate'].value = new Date().toISOString().split('T')[0];
  els.recordForm['recordHospital'].value = record.hospital || '';
  els.recordForm['recordDepartment'].value = record.department || '';
  els.recordForm['recordDoctor'].value = record.doctor || '';
  els.recordForm['recordDiagnosis'].value = record.diagnosis || '';
  els.recordForm['recordSymptoms'].value = record.symptoms || '';
  els.recordForm['recordPrescription'].value = record.prescription || '';
  els.recordForm['recordCost'].value = record.cost || '';

  // Clear images - don't copy them
  state.pendingImages = [];
  renderPendingImages();
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
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
  };
  toast.innerHTML = `<span class="toast-icon">${iconMap[type] || iconMap.info}</span><span class="toast-message">${escapeHtml(message)}</span>`;
  toast.className = `toast visible ${type}`;
  setTimeout(() => { toast.classList.remove('visible'); }, 3000);
}

function showDesktopNotification(title, body) {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    const n = new Notification(title, { body, icon: '/favicon.ico' });
    n.onclick = () => { window.focus(); n.close(); };
  } else if (Notification.permission === 'default') {
    Notification.requestPermission().then(perm => {
      if (perm === 'granted') {
        const n = new Notification(title, { body, icon: '/favicon.ico' });
        n.onclick = () => { window.focus(); n.close(); };
      }
    });
  }
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