// dashboard.js
import { supabase } from '../supabaseClient';

export class AdminDashboard {
  constructor() {
    this.setupEventListeners();
    this.loadModels();
    this.checkAuth();
  }

  async checkAuth() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.href = '/admin/login.html';
      return;
    }

    // 관리자 권한 확인
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile.role !== 'admin') {
      window.location.href = '/admin/login.html';
    }
  }

  setupEventListeners() {
    // 네비게이션
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.switchSection(item.dataset.section));
    });

    // 로그아웃
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

    // 모델 추가
    document.getElementById('add-model').addEventListener('click', () => this.showModelForm());
  }

  switchSection(section) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    // 선택된 섹션 표시
    document.getElementById(`${section}-section`).style.display = 'block';
    // 네비게이션 활성화 상태 업데이트
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });
  }

  async handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = '/admin/login.html';
    }
  }

  async loadModels() {
    const { data: models, error } = await supabase
      .from('models')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('모델 로드 실패:', error);
      return;
    }

    this.displayModels(models);
  }

  displayModels(models) {
    const modelList = document.getElementById('model-list');
    modelList.innerHTML = models.map(model => `
      <div class="model-card">
        <h3>${model.name}</h3>
        <p>카테고리: ${model.category}</p>
        <p>가격: ${model.price.toLocaleString()}원</p>
        <div class="model-actions">
          <button class="edit-btn" onclick="editModel(${model.id})">수정</button>
          <button class="delete-btn" onclick="deleteModel(${model.id})">삭제</button>
        </div>
      </div>
    `).join('');
  }

  showModelForm(model = null) {
    // 모델 추가/수정 폼 표시
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${model ? '모델 수정' : '새 모델 추가'}</h2>
        <form id="model-form">
          <div class="form-group">
            <label for="model-name">이름</label>
            <input type="text" id="model-name" required value="${model?.name || ''}">
          </div>
          <div class="form-group">
            <label for="model-category">카테고리</label>
            <select id="model-category" required>
              <option value="집기" ${model?.category === '집기' ? 'selected' : ''}>집기</option>
              <option value="디자인물" ${model?.category === '디자인물' ? 'selected' : ''}>디자인물</option>
            </select>
          </div>
          <div class="form-group">
            <label for="model-price">가격 (원)</label>
            <input type="number" id="model-price" required min="0" value="${model?.price || ''}">
          </div>
          <div class="form-group">
            <label for="model-file">3D 모델 파일</label>
            <input type="file" id="model-file" accept=".glb,.gltf" ${model ? '' : 'required'}>
          </div>
          <div class="form-actions">
            <button type="submit" class="edit-btn">저장</button>
            <button type="button" class="delete-btn" onclick="closeModal()">취소</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    // 폼 제출 처리
    document.getElementById('model-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.saveModel(model?.id);
    });
  }

  async saveModel(modelId = null) {
    const formData = {
      name: document.getElementById('model-name').value,
      category: document.getElementById('model-category').value,
      price: parseInt(document.getElementById('model-price').value),
    };

    const fileInput = document.getElementById('model-file');
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const filePath = `models/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('models')
        .upload(filePath, file);

      if (uploadError) {
        console.error('파일 업로드 실패:', uploadError);
        return;
      }

      formData.file_path = filePath;
    }

    if (modelId) {
      // 모델 수정
      const { error } = await supabase
        .from('models')
        .update(formData)
        .eq('id', modelId);
    } else {
      // 새 모델 추가
      const { error } = await supabase
        .from('models')
        .insert([formData]);
    }

    this.loadModels();
    this.closeModal();
  }

  async deleteModel(modelId) {
    if (!confirm('정말 이 모델을 삭제하시겠습니까?')) return;

    const { error } = await supabase
      .from('models')
      .delete()
      .eq('id', modelId);

    if (!error) {
      this.loadModels();
    }
  }

  closeModal() {
    const modal = document.querySelector('.modal');
    if (modal) {
      modal.remove();
    }
  }
}

// 대시보드 인스턴스 생성
new AdminDashboard();