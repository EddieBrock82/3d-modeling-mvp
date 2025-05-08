import { supabase } from '../supabaseClient';

// 관리자 인증 상태 확인
async function checkAdminAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (!session || error) {
        window.location.href = '/login.html';
        return;
    }
}

// 프리셋 목록 가져오기
async function loadPresets() {
    const { data, error } = await supabase
        .from('presets')
        .select('*')
        .order('category', { ascending: true });

    if (error) {
        console.error('프리셋 로드 실패:', error);
        return;
    }

    displayPresets(data);
}

// 프리셋 목록 표시
function displayPresets(presets) {
    const presetsList = document.getElementById('presets-list');
    presetsList.innerHTML = '';

    presets.forEach(preset => {
        const presetCard = document.createElement('div');
        presetCard.className = 'preset-card';
        presetCard.innerHTML = `
            <h3>${preset.name}</h3>
            <div class="category">${preset.category}</div>
            <div class="price">${preset.price.toLocaleString()}원</div>
            <div class="actions">
                <button class="edit-btn" data-id="${preset.id}">수정</button>
                <button class="delete-btn" data-id="${preset.id}">삭제</button>
            </div>
        `;
        presetsList.appendChild(presetCard);
    });

    // 이벤트 리스너 추가
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetId = e.target.dataset.id;
            showEditModal(presetId);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetId = e.target.dataset.id;
            deletePreset(presetId);
        });
    });
}

// 모달 표시/숨김
function toggleModal(show = true) {
    const modal = document.getElementById('preset-modal');
    modal.classList.toggle('active', show);
}

// 모달 초기화
function resetModal() {
    const form = document.getElementById('preset-form');
    form.reset();
    document.getElementById('modal-title').textContent = '새 프리셋 추가';
    form.dataset.presetId = '';
    updateFormFields();
}

// 타입에 따른 폼 필드 업데이트
function updateFormFields() {
    const type = document.getElementById('preset-type').value;
    const dimensionsGroup = document.querySelector('.dimensions-group');
    const modelGroup = document.querySelector('.model-group');

    if (type === 'model') {
        dimensionsGroup.style.display = 'none';
        modelGroup.style.display = 'block';
    } else {
        dimensionsGroup.style.display = 'block';
        modelGroup.style.display = 'none';
    }
}

// 프리셋 수정 모달 표시
async function showEditModal(presetId) {
    const { data: preset, error } = await supabase
        .from('presets')
        .select('*')
        .eq('id', presetId)
        .single();

    if (error) {
        console.error('프리셋 로드 실패:', error);
        return;
    }

    const form = document.getElementById('preset-form');
    form.dataset.presetId = presetId;
    document.getElementById('modal-title').textContent = '프리셋 수정';
    
    // 폼 필드 채우기
    document.getElementById('preset-name').value = preset.name;
    document.getElementById('preset-category').value = preset.category;
    document.getElementById('preset-type').value = preset.type;
    document.getElementById('preset-price').value = preset.price;
    document.getElementById('preset-width').value = preset.width || '';
    document.getElementById('preset-height').value = preset.height || '';
    document.getElementById('preset-depth').value = preset.depth || '';
    document.getElementById('preset-color').value = preset.color || '#3399ff';
    document.getElementById('preset-url').value = preset.url || '';
    document.getElementById('preset-icon').value = preset.icon || '';

    updateFormFields();
    toggleModal(true);
}

// 프리셋 저장
async function savePreset(formData) {
    const presetId = formData.dataset.presetId;
    const data = {
        name: formData['preset-name'].value,
        category: formData['preset-category'].value,
        type: formData['preset-type'].value,
        price: parseInt(formData['preset-price'].value),
        width: formData['preset-width'].value ? parseInt(formData['preset-width'].value) : null,
        height: formData['preset-height'].value ? parseInt(formData['preset-height'].value) : null,
        depth: formData['preset-depth'].value ? parseInt(formData['preset-depth'].value) : null,
        color: formData['preset-color'].value,
        url: formData['preset-url'].value || null,
        icon: formData['preset-icon'].value || null
    };

    let error;
    if (presetId) {
        const { error: updateError } = await supabase
            .from('presets')
            .update(data)
            .eq('id', presetId);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('presets')
            .insert([data]);
        error = insertError;
    }

    if (error) {
        console.error('프리셋 저장 실패:', error);
        alert('프리셋 저장에 실패했습니다.');
        return;
    }

    toggleModal(false);
    loadPresets();
}

// 프리셋 삭제
async function deletePreset(presetId) {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    const { error } = await supabase
        .from('presets')
        .delete()
        .eq('id', presetId);

    if (error) {
        console.error('프리셋 삭제 실패:', error);
        alert('프리셋 삭제에 실패했습니다.');
        return;
    }

    loadPresets();
}

// 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', async () => {
    // 로그인 상태 확인
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (!session) {
        // 로그인되지 않은 상태면 로그인 페이지로 이동
        window.location.href = '/admin/login';
        return;
    }

    // 로그아웃 버튼 이벤트
    const logoutButton = document.getElementById('logout-button');
    logoutButton.addEventListener('click', async () => {
        await supabase.auth.signOut();
        window.location.href = '/admin/login';
    });

    checkAdminAuth();
    loadPresets();

    // 새 프리셋 추가 버튼
    document.getElementById('add-preset-btn').addEventListener('click', () => {
        resetModal();
        toggleModal(true);
    });

    // 모달 닫기 버튼
    document.querySelector('.close-modal').addEventListener('click', () => toggleModal(false));
    document.querySelector('.cancel-btn').addEventListener('click', () => toggleModal(false));

    // 타입 변경 이벤트
    document.getElementById('preset-type').addEventListener('change', updateFormFields);

    // 폼 제출
    document.getElementById('preset-form').addEventListener('submit', (e) => {
        e.preventDefault();
        savePreset(e.target);
    });

    // 사이드바 메뉴
    document.querySelectorAll('.admin-menu li').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelector('.admin-menu li.active').classList.remove('active');
            item.classList.add('active');
            // TODO: 페이지 전환 로직 구현
        });
    });
}); 