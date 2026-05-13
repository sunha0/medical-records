// ===========================
// 医程 - 医疗记录管理系统
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
  isLoggedIn: false
};

// DOM Elements
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

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
  imagePreview: $('#imagePreview')
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  checkLogin();
});

function checkLogin() {
  const token = localStorage.getItem('auth_token');
  if (token === 'authenticated') {
    showMainApp();
    loadData();
  } else {
    showLoginPage();
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
}

function initEventListeners() {
  // Login / Register
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

  // Navigation
  $$('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(item.dataset.view);
    });
  });

  els.searchInput.addEventListener('input', debounce((e) => {
    state.searchQuery = e.target.value.toLowerCase();
    renderRecords();
  }, 300));

  els.timeFilter.addEventListener('change', (e) => {
    state.timeFilter = e.target.value;
    renderRecords();
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

  // Settings
  els.settingsBtn.addEventListener('click', openSettingsModal);
  els.settingsModalClose.addEventListener('click', closeSettingsModal);
  els.cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  els.settingsModal.querySelector('.modal-backdrop').addEventListener('click', closeSettingsModal);
  els.changePasswordForm.addEventListener('submit', handleChangePassword);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeImagePreview();
      closeDetailModal();
      closeSettingsModal();
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

  const username = els.loginForm['username'].value;
  const password = els.loginForm['password'].value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      localStorage.setItem('auth_token', 'authenticated');
      localStorage.setItem('username', username);
      showMainApp();
      loadData();
    } else {
      els.loginError.textContent = data.error || '登录失败';
    }
  } catch (err) {
    els.loginError.textContent = '网络错误，请稍后重试';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  els.registerError.textContent = '';

  const username = els.registerForm['regUsername'].value;
  const password = els.registerForm['regPassword'].value;
  const confirmPassword = els.registerForm['regConfirmPassword'].value;

  if (password !== confirmPassword) {
    els.registerError.textContent = '两次输入的密码不一致';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      els.registerError.textContent = '';
      els.registerError.style.color = 'var(--success)';
      els.registerError.textContent = '注册成功！请返回登录';
      setTimeout(() => {
        els.registerForm.style.display = 'none';
        els.loginForm.style.display = 'flex';
        els.registerForm.reset();
        els.registerError.style.color = '';
        els.loginForm['username'].value = username;
      }, 1500);
    } else {
      els.registerError.textContent = data.error || '注册失败';
    }
  } catch (err) {
    els.registerError.textContent = '网络错误，请稍后重试';
  }
}

function handleLogout() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('username');
  state.records = [];
  showLoginPage();
}

async function loadData() {
  try {
    const res = await fetch(`${API_BASE}/records`, {
      headers: { 'Authorization': 'Bearer authenticated' }
    });
    if (res.status === 401) {
      handleLogout();
      return;
    }
    state.records = await res.json();
    render();
  } catch (err) {
    console.error('加载数据失败:', err);
  }
}

async function saveToServer() {
  try {
    await fetch(`${API_BASE}/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer authenticated'
      },
      body: JSON.stringify(state.records)
    });
  } catch (err) {
    console.error('保存数据失败:', err);
    showToast('保存失败', 'error');
  }
}

function generateDemoData() {
  return [
    {
      id: generateId(),
      patient: '张三',
      date: '2024-01-15',
      hospital: '北京协和医院',
      department: '心内科',
      doctor: '张主任',
      diagnosis: '窦性心律不齐',
      symptoms: '偶有心悸，休息后缓解',
      prescription: '清淡饮食，避免剧烈运动',
      cost: 258.50,
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    },
    {
      id: generateId(),
      patient: '李四',
      date: '2024-02-20',
      hospital: '中日友好医院',
      department: '呼吸内科',
      doctor: '李医生',
      diagnosis: '上呼吸道感染',
      symptoms: '咳嗽、咽痛，鼻塞三天',
      prescription: '多饮水，休息，口服感冒药',
      cost: 186.00,
      images: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  ];
}

function generateId() {
  return 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function switchView(view) {
  state.currentView = view;
  $$('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === view);
  });
  $$('.view').forEach(v => {
    v.classList.toggle('active', v.id === view + 'View');
  });
  render();
}

function render() {
  renderRecords();
  renderStats();
  renderPhotos();
  updateSidebarStats();
}

function renderRecords() {
  let records = filterRecords(state.records);

  if (records.length === 0) {
    els.recordsList.innerHTML = '';
    els.emptyState.classList.add('visible');
    return;
  }

  els.emptyState.classList.remove('visible');
  els.recordsList.innerHTML = records.map(record => createRecordCard(record)).join('');

  els.recordsList.querySelectorAll('.record-card').forEach(card => {
    card.addEventListener('click', () => openDetailModal(card.dataset.id));
  });
}

function filterRecords(records) {
  return records.filter(record => {
    if (state.searchQuery) {
      const searchStr = `${record.patient} ${record.hospital} ${record.department} ${record.diagnosis} ${record.doctor}`.toLowerCase();
      if (!searchStr.includes(state.searchQuery)) return false;
    }

    if (state.timeFilter !== 'all') {
      const recordDate = new Date(record.date);
      const now = new Date();
      const diffDays = Math.floor((now - recordDate) / (1000 * 60 * 60 * 24));

      switch (state.timeFilter) {
        case 'week': if (diffDays > 7) return false; break;
        case 'month': if (diffDays > 30) return false; break;
        case 'quarter': if (diffDays > 90) return false; break;
        case 'halfyear': if (diffDays > 180) return false; break;
        case 'year': if (diffDays > 365) return false; break;
      }
    }
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));
}

function createRecordCard(record) {
  const imagesHtml = record.images && record.images.length > 0
    ? `<div class="card-images">
        ${record.images.slice(0, 3).map(img => `<img src="${img.url}" alt="" class="card-image-thumb">`).join('')}
       </div>`
    : '';

  return `
    <article class="record-card" data-id="${record.id}">
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
  const allImages = [];
  state.records.forEach(record => {
    if (record.images && record.images.length > 0) {
      record.images.forEach((img, i) => {
        allImages.push({ ...img, recordId: record.id, imageIndex: i });
      });
    }
  });

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
      <img src="${img.url}" alt="">
      <div class="photo-overlay">
        ${img.tags ? `<span class="photo-tag">${escapeHtml(img.tags)}</span>` : ''}
      </div>
    </div>
  `).join('');

  els.photosGrid.querySelectorAll('.photo-item').forEach(item => {
    item.addEventListener('click', () => {
      openImagePreview(item.dataset.recordId, parseInt(item.dataset.imageIndex));
    });
  });
}

function renderStats() {
  const now = new Date();

  const lastYear = state.records.filter(r => {
    const d = new Date(r.date);
    return (now - d) / (1000 * 60 * 60 * 24) <= 365;
  });
  els.totalCost.textContent = '¥' + lastYear.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(0);

  const depts = {};
  state.records.forEach(r => { depts[r.department] = (depts[r.department] || 0) + 1; });
  const sortedDepts = Object.entries(depts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCount = sortedDepts[0]?.[1] || 1;

  els.departmentList.innerHTML = sortedDepts.map(([dept, count]) => `
    <div class="dept-item">
      <span class="dept-name">${escapeHtml(dept)}</span>
      <div class="dept-bar" style="width: ${(count / maxCount) * 100}%"></div>
      <span class="dept-count">${count}次</span>
    </div>
  `).join('');

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthRecords = state.records.filter(r => {
      const rd = new Date(r.date);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    });
    months.push({ label: `${d.getMonth() + 1}月`, count: monthRecords.length });
  }

  const maxMonthCount = Math.max(...months.map(m => m.count), 1);
  const chartHeight = 100;
  els.frequencyChart.innerHTML = months.map(m => {
    const h = maxMonthCount > 0 ? Math.max((m.count / maxMonthCount) * chartHeight, m.count > 0 ? 5 : 0) : 0;
    return `
      <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: ${chartHeight}px; justify-content: flex-end; position: relative;">
        <div style="width: 100%; background: linear-gradient(to top, var(--primary), var(--primary-light)); border-radius: 4px 4px 0 0; height: ${h}px; transition: height 0.5s ease;" title="${m.count}次就医"></div>
        <span style="font-size: 0.625rem; color: var(--text-muted); margin-top: 8px;">${m.label}</span>
      </div>`;
  }).join('');
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

function openModal(recordId = null) {
  state.editingRecord = recordId;
  els.recordForm.reset();
  els.imagePreview.innerHTML = '';
  state.pendingImages = [];

  if (recordId) {
    const record = state.records.find(r => r.id === recordId);
    if (record) {
      els.modalTitle.textContent = '编辑就医记录';
      els.recordForm['recordId'].value = record.id;
      els.recordForm['recordPatient'].value = record.patient || '';
      els.recordForm['recordDate'].value = record.date || '';
      els.recordForm['recordHospital'].value = record.hospital || '';
      els.recordForm['recordDepartment'].value = record.department || '';
      els.recordForm['recordDoctor'].value = record.doctor || '';
      els.recordForm['recordDiagnosis'].value = record.diagnosis || '';
      els.recordForm['recordSymptoms'].value = record.symptoms || '';
      els.recordForm['recordPrescription'].value = record.prescription || '';
      els.recordForm['recordCost'].value = record.cost || '';

      if (record.images && record.images.length > 0) {
        state.pendingImages = [...record.images];
        renderImagePreview();
      }
    }
  } else {
    els.modalTitle.textContent = '添加就医记录';
    els.recordForm['recordId'].value = '';
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
    ? `<div class="detail-images">
        ${record.images.map((img, i) => `<img src="${img.url}" alt="" data-index="${i}">`).join('')}
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

async function handleChangePassword(e) {
  e.preventDefault();
  els.passwordError.textContent = '';

  const oldPassword = els.changePasswordForm['oldPassword'].value;
  const newPassword = els.changePasswordForm['newPassword'].value;
  const confirmPassword = els.changePasswordForm['confirmPassword'].value;

  if (!oldPassword || !newPassword || !confirmPassword) {
    els.passwordError.textContent = '请填写所有字段';
    return;
  }

  if (newPassword !== confirmPassword) {
    els.passwordError.textContent = '两次输入的新密码不一致';
    return;
  }

  if (newPassword.length < 6) {
    els.passwordError.textContent = '新密码至少6位';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer authenticated',
        'x-username': localStorage.getItem('username') || ''
      },
      body: JSON.stringify({ oldPassword, newPassword })
    });

    const data = await res.json();

    if (res.ok && data.success) {
      closeSettingsModal();
      showToast('密码修改成功', 'success');
    } else {
      els.passwordError.textContent = data.error || '修改失败';
    }
  } catch (err) {
    els.passwordError.textContent = '网络错误，请稍后重试';
  }
}

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

async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    patient: els.recordForm['recordPatient'].value.trim(),
    date: els.recordForm['recordDate'].value,
    hospital: els.recordForm['recordHospital'].value.trim(),
    department: els.recordForm['recordDepartment'].value.trim(),
    doctor: els.recordForm['recordDoctor'].value.trim(),
    diagnosis: els.recordForm['recordDiagnosis'].value.trim(),
    symptoms: els.recordForm['recordSymptoms'].value.trim(),
    prescription: els.recordForm['recordPrescription'].value.trim(),
    cost: parseFloat(els.recordForm['recordCost'].value) || 0,
    images: state.pendingImages
  };

  if (!formData.patient || !formData.date || !formData.hospital || !formData.department || !formData.diagnosis) {
    showToast('请填写必填项', 'error');
    return;
  }

  const recordId = els.recordForm['recordId'].value;

  if (recordId) {
    const index = state.records.findIndex(r => r.id === recordId);
    if (index !== -1) {
      state.records[index] = { ...state.records[index], ...formData, updatedAt: Date.now() };
    }
  } else {
    state.records.unshift({
      id: generateId(),
      ...formData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  await saveToServer();
  closeModal();
  render();
  showToast('保存成功', 'success');
}

function handleEditFromDetail() {
  const recordId = state.currentRecordId;
  closeDetailModal();
  openModal(recordId);
}

async function handleDeleteRecord() {
  if (!state.currentRecordId) return;
  if (confirm('确定要删除这条就医记录吗？此操作不可撤销。')) {
    state.records = state.records.filter(r => r.id !== state.currentRecordId);
    await saveToServer();
    closeDetailModal();
    render();
    showToast('记录已删除', 'success');
  }
}

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

function processFiles(files) {
  const remaining = 9 - state.pendingImages.length;
  if (remaining <= 0) {
    showToast('最多只能上传9张图片', 'error');
    return;
  }

  files.slice(0, remaining).forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      state.pendingImages.push({
        id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        url: e.target.result,
        tags: []
      });
      renderImagePreview();
    };
    reader.readAsDataURL(file);
  });
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

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = els.toast;
  toast.querySelector('.toast-message').textContent = message;
  toast.className = 'toast visible ' + type;
  setTimeout(() => { toast.classList.remove('visible'); }, 3000);
}

function debounce(fn, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
}
