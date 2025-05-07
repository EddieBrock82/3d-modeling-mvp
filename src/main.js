// main.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import html2pdf from 'html2pdf.js';
import { saveProject } from './dbActions';
import { ModelViewer } from './components/ModelViewer.js';

console.log('Three.js 로드 완료');

// -------------------- 기본 세팅 --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf0f0f0);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
camera.position.set(0, 3640 * 0.35, 3640 * 0.7);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true // 투명 배경 허용
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

const container = document.getElementById('canvas-container');
if (!container) {
  console.error('canvas-container를 찾을 수 없습니다!');
} else {
  console.log('canvas-container 찾음');
  container.appendChild(renderer.domElement);
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 200;
controls.maxDistance = 10000;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // 바닥 아래로 안 내려가게

// -------------------- 면적 설정 --------------------
let areaWidth = 3640; // 4평 (정사각형 기준 1평당 약 1820mm)
let gridHelper = new THREE.GridHelper(areaWidth, 40);
scene.add(gridHelper);

function setAreaSize(mm) {
  scene.remove(gridHelper);
  areaWidth = mm;
  gridHelper = new THREE.GridHelper(mm, 40);
  scene.add(gridHelper);
  fitCameraToArea(mm);
}

function fitCameraToArea(areaSize) {
  camera.position.set(0, areaSize * 0.35, areaSize * 0.7);
  camera.lookAt(0, 0, 0);
}
fitCameraToArea(areaWidth);

// -------------------- 조명 --------------------
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(0, 500, 500);
scene.add(light);

// -------------------- 오브제 생성 --------------------
let selected = null;
function createObject(type, select = true) {
  let geometry;
  const material = new THREE.MeshStandardMaterial({ color: 0x3399ff });

  if (type === 'cube') geometry = new THREE.BoxGeometry(100, 100, 100);
  else if (type === 'sphere') geometry = new THREE.SphereGeometry(50, 32, 32);
  else if (type === 'cylinder') geometry = new THREE.CylinderGeometry(50, 50, 100, 32);
  else if (type === 'fridge') geometry = new THREE.BoxGeometry(800, 750, 750);
  else return null;

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = geometry.parameters.height / 2 || 50;
  mesh.userData = { type };
  scene.add(mesh);
  if (select) {
    selected = mesh;
    updateUI();
  }
  console.log(`✅ ${type} 생성됨`);
  return mesh;
}

// -------------------- 3D 모델 로드 --------------------
const loader = new GLTFLoader();

async function loadModelFromSupabase(url) {
  try {
    const gltf = await loader.loadAsync(url);
    const model = gltf.scene;
    
    // 모델의 바운딩 박스 계산
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    // Tinkercad 모델의 실제 크기를 유지하면서 스케일 조정
    const scale = 1000;
    model.scale.set(scale, scale, scale);
    
    // 모델을 바닥에 정확히 위치시키기 (y=0)
    model.position.set(
      -center.x * scale,
      0, // 초기 높이를 0으로 설정
      -center.z * scale
    );
    
    // 모델의 회전값 초기화
    model.rotation.set(0, 0, 0);
    
    // 모델에 사용자 데이터 추가
    model.userData = {
      type: 'model',
      name: '1200 모델',
      category: '디자인물',
      price: 15000,
      originalSize: {
        width: size.x * scale,
        height: size.y * scale,
        depth: size.z * scale
      },
      baseScale: scale,
      fixed: false
    };
    
    scene.add(model);
    selected = model;
    updateUI();
    console.log('✅ 3D 모델 로드 완료');
    console.log('원본 크기 (mm):', {
      width: size.x * scale,
      height: size.y * scale,
      depth: size.z * scale
    });
  } catch (error) {
    console.error('❌ 모델 로드 실패:', error);
  }
}

// -------------------- 프리셋 데이터 --------------------
const PRESETS = [
  // 디자인물
  { 
    name: '구', 
    category: '디자인물', 
    width: 100, 
    height: 100, 
    depth: 100, 
    type: 'sphere', 
    color: '#3399ff', 
    fixed: false, 
    price: 10000,
    icon: '⚪'
  },
  { 
    name: '원기둥', 
    category: '디자인물', 
    width: 100, 
    height: 100, 
    depth: 100, 
    type: 'cylinder', 
    color: '#3399ff', 
    fixed: false, 
    price: 8000,
    icon: '🔲'
  },
  { 
    name: '상자', 
    category: '디자인물', 
    width: 100, 
    height: 100, 
    depth: 100, 
    type: 'cube', 
    color: '#3399ff', 
    fixed: false, 
    price: 7000,
    icon: '⬛'
  },
  { 
    name: '원', 
    category: '디자인물', 
    width: 100, 
    height: 10, 
    depth: 100, 
    type: 'circle', 
    color: '#3399ff', 
    fixed: false, 
    price: 5000,
    icon: '⭕'
  },
  // 집기
  { 
    name: '1200 모델', 
    category: '집기', 
    type: 'model', 
    url: 'https://stjvvbquddmfpuerjkxd.supabase.co/storage/v1/object/public/models//1200.glb',
    fixed: true,
    price: 150000
  },
  { 
    name: '1500 모델', 
    category: '집기', 
    type: 'model', 
    url: 'https://stjvvbquddmfpuerjkxd.supabase.co/storage/v1/object/public/models//1500.glb',
    fixed: true,
    price: 180000
  }
];

// -------------------- 프리셋 UI --------------------
function showPresetSelector() {
  // 모달/간단한 선택창 생성
  let modal = document.getElementById('preset-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'preset-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.2)';
  modal.style.zIndex = '1000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  // 카테고리 선택
  const categories = [...new Set(PRESETS.map(p => p.category))];
  let html = '<div style="background:#fff;padding:32px 24px;border-radius:12px;min-width:320px;box-shadow:0 4px 16px #0002;">';
  html += '<div style="font-size:20px;font-weight:bold;margin-bottom:16px;">카테고리 선택</div>';
  html += categories.map(cat => `<button class="cat-btn" data-cat="${cat}" style="margin:0 8px 16px 0;padding:8px 20px;font-size:16px;">${cat}</button>`).join('');
  html += '<div id="preset-items" style="margin-top:16px;"></div>';
  html += '<div style="margin-top:24px;text-align:right"><button id="close-preset-modal">닫기</button></div>';
  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);

  // 카테고리 버튼 이벤트
  modal.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const cat = btn.dataset.cat;
      const items = PRESETS.filter(p => p.category === cat);
      const itemsDiv = modal.querySelector('#preset-items');
      itemsDiv.innerHTML = items.map(item =>
        `<button class="preset-btn" data-name="${item.name}" style="display:inline-block;margin:8px;padding:12px 16px;font-size:18px;">
          ${item.name}
        </button>`
      ).join('');
      // 아이템 버튼 이벤트
      itemsDiv.querySelectorAll('.preset-btn').forEach(itemBtn => {
        itemBtn.addEventListener('click', () => {
          const preset = PRESETS.find(p => p.name === itemBtn.dataset.name);
          if (preset) {
            createPresetObject(preset);
            modal.remove();
          }
        });
      });
    });
  });
  // 닫기 버튼
  modal.querySelector('#close-preset-modal').addEventListener('click', () => modal.remove());
}

// -------------------- 프리셋 오브제 생성 --------------------
function createPresetObject(preset) {
  if (preset.type === 'model') {
    loadModelFromSupabase(preset.url);
    return;
  }
  let geometry;
  if (preset.type === 'box') geometry = new THREE.BoxGeometry(preset.width, preset.height, preset.depth);
  else if (preset.type === 'sphere') geometry = new THREE.SphereGeometry(preset.width/2, 32, 32);
  else if (preset.type === 'cylinder') geometry = new THREE.CylinderGeometry(preset.width/2, preset.width/2, preset.height, 32);
  else if (preset.type === 'circle') geometry = new THREE.CircleGeometry(preset.width/2, 64);
  else return;

  const material = new THREE.MeshStandardMaterial({ color: preset.color });
  let mesh;
  if (preset.type === 'circle') {
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI/2; // 평면이 바닥에 평행하게
    mesh.position.y = preset.height/2;
  } else {
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = preset.height/2;
  }
  mesh.userData = { ...preset };
  scene.add(mesh);
  selected = mesh;
  updateUI();
  updateTotalPriceUI();
  console.log(`✅ 프리셋 ${preset.name} 생성됨`);
}

// -------------------- 툴바 버튼 교체 --------------------
document.addEventListener('DOMContentLoaded', () => {
  // 기존 areaBtn 등 유지
  const areaBtn = document.getElementById('area-button');
  if (areaBtn) {
    areaBtn.style.marginRight = '8px';
    areaBtn.style.padding = '8px 16px';
    areaBtn.style.fontSize = '16px';
    areaBtn.style.background = '#4CAF50';
    areaBtn.style.color = 'white';
    areaBtn.style.border = 'none';
    areaBtn.style.borderRadius = '4px';
    areaBtn.style.cursor = 'pointer';
    areaBtn.style.transition = 'background 0.3s';
    areaBtn.addEventListener('mouseover', () => areaBtn.style.background = '#45a049');
    areaBtn.addEventListener('mouseout', () => areaBtn.style.background = '#4CAF50');
    areaBtn.addEventListener('click', () => {
      const val = prompt('면적(한 변의 길이 mm 단위) 입력 (예: 1820):', areaWidth);
      if (val) setAreaSize(parseFloat(val));
    });
  }
  // 오브제 추가 버튼 생성
  let addBtn = document.getElementById('add-preset-btn');
  if (addBtn) {
    addBtn.style.marginRight = '8px';
    addBtn.style.padding = '8px 16px';
    addBtn.style.fontSize = '16px';
    addBtn.style.background = '#4CAF50';
    addBtn.style.color = 'white';
    addBtn.style.border = 'none';
    addBtn.style.borderRadius = '4px';
    addBtn.style.cursor = 'pointer';
    addBtn.style.transition = 'background 0.3s';
    addBtn.addEventListener('mouseover', () => addBtn.style.background = '#45a049');
    addBtn.addEventListener('mouseout', () => addBtn.style.background = '#4CAF50');
    addBtn.onclick = showPresetSelector;
  }
});

// -------------------- updateUI 수정 (집기는 scale/color 조정 불가) --------------------
function getTotalPrice() {
  let total = 0;
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh && child.userData && child.userData.price) {
      total += Number(child.userData.price);
    }
  });
  return total;
}

function getCategoryPrices() {
  const categoryTotals = {};
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh && child.userData && child.userData.price && child.userData.category) {
      const cat = child.userData.category;
      if (!categoryTotals[cat]) categoryTotals[cat] = 0;
      categoryTotals[cat] += Number(child.userData.price);
    }
  });
  return categoryTotals;
}

function updateUI() {
  const info = document.getElementById('info');
  if (!selected) { updateTotalPriceUI(); return (info.innerHTML = ''); }

  const preset = selected.userData;
  if (!preset) return;

  const isFixed = preset && preset.fixed;

  if (preset.type === 'model') {
    // 3D 모델용 UI
    const scale = selected.scale.x / preset.baseScale;
    const realSize = {
      width: preset.originalSize.width * scale,
      height: preset.originalSize.height * scale,
      depth: preset.originalSize.depth * scale
    };

    info.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">
        ${preset.name}
        <div style="font-size:14px;margin-top:4px;color:#2a7;">
          견적가: ${preset.price ? preset.price.toLocaleString() + '원' : '0원'}
        </div>
      </div>
      <b>크기 (mm):</b> 
      가로=<input id="modelWidth" type="number" step="1" value="${realSize.width.toFixed(0)}" style="width:60px"/>
      세로=<input id="modelDepth" type="number" step="1" value="${realSize.depth.toFixed(0)}" style="width:60px"/>
      높이=<input id="modelHeight" type="number" step="1" value="${realSize.height.toFixed(0)}" style="width:60px"/><br><br>
      <b>위치(높이):</b> <input id="posY" type="number" step="1" value="${selected.position.y.toFixed(0)}" style="width:60px" /><br><br>
      <button id="add-above" style="margin-right: 8px;">위에 추가</button>
      <button id="add-front">앞에 추가</button><br><br>
      <button id="delete" style="background-color: #ff4444; color: white;">삭제</button>
    `;

    // 이벤트 리스너에 stopPropagation 추가
    const addStopPropagation = (element) => {
      if (!element) return;
      element.addEventListener('mousedown', (e) => e.stopPropagation());
      element.addEventListener('click', (e) => e.stopPropagation());
    };

    // 모든 입력 요소와 버튼에 이벤트 전파 중단 적용
    ['modelWidth', 'modelHeight', 'modelDepth', 'posY', 'add-above', 'add-front', 'delete'].forEach(id => {
      const element = document.getElementById(id);
      if (element) addStopPropagation(element);
    });

    // 크기 조절 이벤트 리스너
    document.getElementById('modelWidth').addEventListener('change', (e) => {
      e.stopPropagation();
      const newScale = (parseFloat(e.target.value) / preset.originalSize.width) * preset.baseScale;
      selected.scale.set(newScale, newScale, newScale);
      updateUI();
    });

    document.getElementById('modelHeight').addEventListener('change', (e) => {
      e.stopPropagation();
      const newScale = (parseFloat(e.target.value) / preset.originalSize.height) * preset.baseScale;
      selected.scale.set(newScale, newScale, newScale);
      updateUI();
    });

    document.getElementById('modelDepth').addEventListener('change', (e) => {
      e.stopPropagation();
      const newScale = (parseFloat(e.target.value) / preset.originalSize.depth) * preset.baseScale;
      selected.scale.set(newScale, newScale, newScale);
      updateUI();
    });

    // 위치 조절 이벤트 리스너
    document.getElementById('posY').addEventListener('change', (e) => {
      e.stopPropagation();
      selected.position.y = parseFloat(e.target.value);
      updateUI();
    });

    // 버튼 이벤트 리스너
    const deleteBtn = document.getElementById('delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('정말 삭제하시겠습니까?')) {
          scene.remove(selected);
          selected = null;
          updateUI();
          updateTotalPriceUI();
        }
      });
    }

    const addAboveBtn = document.getElementById('add-above');
    if (addAboveBtn) {
      addAboveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPresetSelectorForAttach('above');
      });
    }

    const addFrontBtn = document.getElementById('add-front');
    if (addFrontBtn) {
      addFrontBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPresetSelectorForAttach('front');
      });
    }
  } else {
    // 기존 오브제용 UI
    let base = { x: 100, y: 100, z: 100 };
    if (preset && preset.width && preset.height && preset.depth) {
      base = { x: preset.width, y: preset.height, z: preset.depth };
    }

    const { x, y, z } = selected.scale;
    const color = selected.material ? `#${selected.material.color.getHexString()}` : '#cccccc';
    const realX = (base.x * x).toFixed(0);
    const realY = (base.y * y).toFixed(0);
    const realZ = (base.z * z).toFixed(0);
    const posY = selected.position.y.toFixed(2);
    const price = preset && preset.price ? preset.price.toLocaleString() + '원' : '';

    info.innerHTML = `
      <div style="font-size:18px;font-weight:bold;margin-bottom:8px;">${preset.name}${price ? ' · ' + price : ''}</div>
      <b>크기:</b> 가로=<input id="scaleX" type="number" step="0.01" value="${realX}" style="width:60px" ${isFixed ? 'disabled' : ''}/>
      세로=<input id="scaleY" type="number" step="0.01" value="${realY}" style="width:60px" ${isFixed ? 'disabled' : ''}/>
      높이=<input id="scaleZ" type="number" step="0.01" value="${realZ}" style="width:60px" ${isFixed ? 'disabled' : ''}/><br><br>
      <b>위치(높이):</b> <input id="posY" type="number" step="0.01" value="${posY}" style="width:60px" /><br><br>
      ${!isFixed ? `<b>Color:</b> <input id="color" type="color" value="${color}"/><br><br>` : ''}
      <button id="add-above">위에 추가</button>
      <button id="add-front">앞에 추가</button><br><br>
      <button id="delete" style="background-color: #ff4444; color: white;">삭제</button>
    `;

    // 이벤트 리스너 추가
    const addStopPropagation = (element) => {
      if (!element) return;
      element.addEventListener('mousedown', (e) => e.stopPropagation());
      element.addEventListener('click', (e) => e.stopPropagation());
    };

    // 모든 입력 요소와 버튼에 이벤트 전파 중단 적용
    ['scaleX', 'scaleY', 'scaleZ', 'posY', 'color', 'add-above', 'add-front', 'delete'].forEach(id => {
      const element = document.getElementById(id);
      if (element) addStopPropagation(element);
    });

    // 버튼 이벤트 리스너
    const deleteBtn = document.getElementById('delete');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('정말 삭제하시겠습니까?')) {
          scene.remove(selected);
          selected = null;
          updateUI();
          updateTotalPriceUI();
        }
      });
    }

    const addAboveBtn = document.getElementById('add-above');
    if (addAboveBtn) {
      addAboveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPresetSelectorForAttach('above');
      });
    }

    const addFrontBtn = document.getElementById('add-front');
    if (addFrontBtn) {
      addFrontBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        showPresetSelectorForAttach('front');
      });
    }
  }

  updateTotalPriceUI();
}

// -------------------- 부착용 프리셋 선택 --------------------
function showPresetSelectorForAttach(mode) {
  // 집기/디자인물 모두 선택 가능
  let modal = document.getElementById('preset-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'preset-modal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.2)';
  modal.style.zIndex = '1000';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';

  const categories = [...new Set(PRESETS.map(p => p.category))];
  let html = '<div style="background:#fff;padding:32px 24px;border-radius:12px;min-width:320px;box-shadow:0 4px 16px #0002;">';
  html += '<div style="font-size:20px;font-weight:bold;margin-bottom:16px;">추가할 오브제 선택</div>';
  html += categories.map(cat => `<button class="cat-btn" data-cat="${cat}" style="margin:0 8px 16px 0;padding:8px 20px;font-size:16px;">${cat}</button>`).join('');
  html += '<div id="preset-items" style="margin-top:16px;"></div>';
  html += '<div style="margin-top:24px;text-align:right"><button id="close-preset-modal">닫기</button></div>';
  html += '</div>';
  modal.innerHTML = html;
  document.body.appendChild(modal);

  modal.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const cat = btn.dataset.cat;
      const items = PRESETS.filter(p => p.category === cat);
      const itemsDiv = modal.querySelector('#preset-items');
      itemsDiv.innerHTML = items.map(item =>
        `<button class="preset-btn" data-name="${item.name}" style="display:inline-block;margin:8px;padding:12px 16px;font-size:18px;">
          <span style="font-size:28px;">${item.icon}</span><br>${item.name}
        </button>`
      ).join('');
      itemsDiv.querySelectorAll('.preset-btn').forEach(itemBtn => {
        itemBtn.addEventListener('click', () => {
          const preset = PRESETS.find(p => p.name === itemBtn.dataset.name);
          if (preset) {
            createAttachedPresetObject(preset, mode);
            modal.remove();
          }
        });
      });
    });
  });
  modal.querySelector('#close-preset-modal').addEventListener('click', () => modal.remove());
}

// -------------------- 부착 오브제 생성 --------------------
function createAttachedPresetObject(preset, mode) {
  let geometry;
  if (preset.type === 'box') geometry = new THREE.BoxGeometry(preset.width, preset.height, preset.depth);
  else if (preset.type === 'sphere') geometry = new THREE.SphereGeometry(preset.width/2, 32, 32);
  else if (preset.type === 'cylinder') geometry = new THREE.CylinderGeometry(preset.width/2, preset.width/2, preset.height, 32);
  else if (preset.type === 'circle') geometry = new THREE.CircleGeometry(preset.width/2, 64);
  else return;

  const material = new THREE.MeshStandardMaterial({ color: preset.color });
  let mesh;
  if (preset.type === 'circle') {
    mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI/2;
    mesh.position.y = preset.height/2;
  } else {
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = preset.height/2;
  }
  mesh.userData = { ...preset };

  // 위치 계산 (mode: 'above' or 'front')
  const sel = selected;
  const selBox = new THREE.Box3().setFromObject(sel);
  const selSize = new THREE.Vector3();
  selBox.getSize(selSize);
  const newBox = new THREE.Box3().setFromObject(mesh);
  const newSize = new THREE.Vector3();
  newBox.getSize(newSize);
  if (mode === 'above') {
    mesh.position.x = sel.position.x;
    mesh.position.z = sel.position.z;
    mesh.position.y = sel.position.y + selSize.y / 2 + newSize.y / 2 + 1;
  } else if (mode === 'front') {
    mesh.position.x = sel.position.x;
    mesh.position.y = sel.position.y;
    mesh.position.z = sel.position.z + selSize.z / 2 + newSize.z / 2 + 1;
  }
  scene.add(mesh);
  selected = mesh;
  updateUI();
  updateTotalPriceUI();
  console.log(`✅ 프리셋 ${preset.name} 부착 생성됨`);
}

// -------------------- 드래그 & 클릭 --------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let isRotating = false;
let previousMousePosition = { x: 0, y: 0 };

function onMouseDown(event) {
  // UI 요소 클릭 시 레이캐스팅 처리하지 않음
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || 
      event.target.closest('#info') || event.target.closest('#toolbar')) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  
  // 선택 가능한 객체 필터링
  const selectableObjects = scene.children.filter(child => 
    (child instanceof THREE.Mesh || child instanceof THREE.Group) && 
    !(child instanceof THREE.GridHelper)
  );
  
  const intersects = raycaster.intersectObjects(selectableObjects, true);
  
  if (intersects.length > 0) {
    // Group의 경우 최상위 부모를 선택
    selected = intersects[0].object;
    while (selected.parent && !(selected.parent instanceof THREE.Scene)) {
      selected = selected.parent;
    }

    if (event.shiftKey) {
      isRotating = true;
      isDragging = false;
    } else {
      isDragging = true;
      isRotating = false;
    }
    previousMousePosition = { x: event.clientX, y: event.clientY };
    controls.enabled = false;
    updateUI();
  } else {
    // 빈 공간 클릭 시
    selected = null;
    isDragging = false;
    isRotating = false;
    controls.enabled = true;
    updateUI();
  }
}

function onMouseMove(event) {
  if (!selected || (!isDragging && !isRotating)) return;

  if (isRotating) {
    const deltaMove = {
      x: event.clientX - previousMousePosition.x,
      y: event.clientY - previousMousePosition.y
    };

    selected.rotation.y += deltaMove.x * 0.01;
    selected.rotation.x += deltaMove.y * 0.01;
    
    previousMousePosition = { x: event.clientX, y: event.clientY };
  } else if (isDragging) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    
    // 바닥 평면과의 교차점 계산
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersectPoint);

    // 캔버스 범위 내 이동 제한
    const half = areaWidth / 2;
    intersectPoint.x = Math.max(-half, Math.min(half, intersectPoint.x));
    intersectPoint.z = Math.max(-half, Math.min(half, intersectPoint.z));

    // y 위치는 유지
    selected.position.set(
      intersectPoint.x,
      selected.position.y,
      intersectPoint.z
    );
  }
  
  updateUI();
}

function onMouseUp(event) {
  isDragging = false;
  isRotating = false;
  controls.enabled = true;
  
  // 마우스 업 이벤트가 UI 요소 위에서 발생한 경우 처리
  if (event.target.tagName === 'BUTTON' || event.target.tagName === 'INPUT' || 
      event.target.closest('#info') || event.target.closest('#toolbar')) {
    return;
  }
}

// 창 크기 변경 시 이벤트 처리
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// 이벤트 리스너 등록
window.addEventListener('mousedown', onMouseDown);
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mouseup', onMouseUp);

// -------------------- 저장 & 불러오기 --------------------
function saveScene() {
  const objects = [];
  scene.children.forEach(child => {
    if (child instanceof THREE.Mesh && child.userData && child.userData.name) {
      objects.push({
        presetName: child.userData.name,
        category: child.userData.category,
        price: child.userData.price,
        name: child.userData.name,
        position: child.position.toArray(),
        rotation: child.rotation.toArray(),
        scale: child.scale.toArray(),
        color: `#${child.material.color.getHexString()}`
      });
    }
  });
  const sceneData = {
    areaWidth,
    objects
  };
  const json = JSON.stringify(sceneData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'scene.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function loadScene(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const sceneData = JSON.parse(e.target.result);
      // 씬 초기화
      scene.children.forEach(child => {
        if (child instanceof THREE.Mesh) {
          scene.remove(child);
        }
      });
      // 면적 설정
      setAreaSize(sceneData.areaWidth);
      // 오브제 복원
      sceneData.objects.forEach(obj => {
        const preset = PRESETS.find(p => p.name === obj.presetName && p.category === obj.category);
        if (preset) {
          let geometry;
          if (preset.type === 'box') geometry = new THREE.BoxGeometry(preset.width, preset.height, preset.depth);
          else if (preset.type === 'sphere') geometry = new THREE.SphereGeometry(preset.width/2, 32, 32);
          else if (preset.type === 'cylinder') geometry = new THREE.CylinderGeometry(preset.width/2, preset.width/2, preset.height, 32);
          else if (preset.type === 'circle') geometry = new THREE.CircleGeometry(preset.width/2, 64);
          else return;
          const material = new THREE.MeshStandardMaterial({ color: obj.color || preset.color });
          let mesh;
          if (preset.type === 'circle') {
            mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.x = -Math.PI/2;
            mesh.position.y = preset.height/2;
          } else {
            mesh = new THREE.Mesh(geometry, material);
            mesh.position.y = preset.height/2;
          }
          mesh.userData = { ...preset };
          scene.add(mesh);
          mesh.position.fromArray(obj.position);
          mesh.rotation.fromArray(obj.rotation);
          mesh.scale.fromArray(obj.scale);
        }
      });
      selected = null;
      updateUI();
      updateTotalPriceUI();
    } catch (error) {
      alert('씬 파일이 손상되었거나 형식이 올바르지 않습니다.');
    }
  };
  reader.readAsText(file);
}

// -------------------- 애니메이션 루프 --------------------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

// -------------------- 이벤트 바인딩 --------------------
document.querySelectorAll('button[data-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    createObject(btn.dataset.type);
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const areaBtn = document.getElementById('area-button');
  if (areaBtn) {
    areaBtn.addEventListener('click', () => {
      const val = prompt('면적(한 변의 길이 mm 단위) 입력 (예: 1820):', areaWidth);
      if (val) setAreaSize(parseFloat(val));
    });
  }

  // 저장 버튼 추가
  let saveBtn = document.getElementById('save-btn');
  if (!saveBtn) {
    saveBtn = document.createElement('button');
    saveBtn.id = 'save-btn';
    const toolbar = document.getElementById('toolbar');
    toolbar.insertBefore(saveBtn, toolbar.firstChild);
  }
  saveBtn.textContent = '3D 모델링 저장';
  saveBtn.style.marginRight = '8px';
  saveBtn.style.padding = '8px 16px';
  saveBtn.style.fontSize = '16px';
  saveBtn.style.background = '#4CAF50';
  saveBtn.style.color = 'white';
  saveBtn.style.border = 'none';
  saveBtn.style.borderRadius = '4px';
  saveBtn.style.cursor = 'pointer';
  saveBtn.style.transition = 'background 0.3s';
  saveBtn.addEventListener('mouseover', () => saveBtn.style.background = '#45a049');
  saveBtn.addEventListener('mouseout', () => saveBtn.style.background = '#4CAF50');
  saveBtn.onclick = saveScene;

  // Supabase 저장 연동
  saveBtn.addEventListener('click', () => {
    const name = '테스트 저장';
    const objects = getCurrentObjects();
    const total = getTotalPrice();
    saveProject(name, objects, total);
  });

  // 불러오기 버튼 추가
  let loadBtn = document.getElementById('load-btn');
  if (!loadBtn) {
    loadBtn = document.createElement('input');
    loadBtn.type = 'file';
    loadBtn.id = 'load-btn';
    loadBtn.accept = '.json';
    const toolbar = document.getElementById('toolbar');
    toolbar.insertBefore(loadBtn, toolbar.firstChild);
  }
  loadBtn.title = '3D 모델링 불러오기';
  loadBtn.style.marginRight = '8px';
  loadBtn.style.padding = '8px 16px';
  loadBtn.style.fontSize = '16px';
  loadBtn.style.background = '#4CAF50';
  loadBtn.style.color = 'white';
  loadBtn.style.border = 'none';
  loadBtn.style.borderRadius = '4px';
  loadBtn.style.cursor = 'pointer';
  loadBtn.style.transition = 'background 0.3s';
  loadBtn.style.width = 'auto';
  loadBtn.style.display = 'inline-block';
  loadBtn.onchange = loadScene;
  // input[type=file]은 텍스트가 바뀌지 않으므로 label로 감싸서 텍스트만 보이게
  if (!document.getElementById('load-label')) {
    const label = document.createElement('label');
    label.id = 'load-label';
    label.textContent = '3D 모델링 불러오기';
    label.style.marginRight = '8px';
    label.style.padding = '8px 16px';
    label.style.fontSize = '16px';
    label.style.background = '#4CAF50';
    label.style.color = 'white';
    label.style.border = 'none';
    label.style.borderRadius = '4px';
    label.style.cursor = 'pointer';
    label.style.transition = 'background 0.3s';
    label.htmlFor = 'load-btn';
    loadBtn.style.display = 'none';
    const toolbar = document.getElementById('toolbar');
    toolbar.insertBefore(label, loadBtn);
  }

  // PDF 저장 버튼 추가
  let pdfBtn = document.getElementById('pdf-btn');
  if (!pdfBtn) {
    pdfBtn = document.createElement('button');
    pdfBtn.id = 'pdf-btn';
    const toolbar = document.getElementById('toolbar');
    toolbar.insertBefore(pdfBtn, toolbar.firstChild);
  }
  pdfBtn.textContent = '견적서 저장';
  pdfBtn.style.marginRight = '8px';
  pdfBtn.style.padding = '8px 16px';
  pdfBtn.style.fontSize = '16px';
  pdfBtn.style.background = '#4CAF50';
  pdfBtn.style.color = 'white';
  pdfBtn.style.border = 'none';
  pdfBtn.style.borderRadius = '4px';
  pdfBtn.style.cursor = 'pointer';
  pdfBtn.style.transition = 'background 0.3s';
  pdfBtn.addEventListener('mouseover', () => pdfBtn.style.background = '#45a049');
  pdfBtn.addEventListener('mouseout', () => pdfBtn.style.background = '#4CAF50');
  pdfBtn.onclick = downloadEstimatePDF;
});

console.log('🔥 main.js 최신 통합버전 실행됨');

// -------------------- 총 견적 표시 --------------------
function updateTotalPriceUI() {
  let totalDiv = document.getElementById('total-price-fixed');
  if (!totalDiv) {
    totalDiv = document.createElement('div');
    totalDiv.id = 'total-price-fixed';
    totalDiv.style.position = 'fixed';
    totalDiv.style.right = '32px';
    totalDiv.style.bottom = '32px';
    totalDiv.style.background = 'rgba(255,255,255,0.95)';
    totalDiv.style.padding = '10px 18px';
    totalDiv.style.borderRadius = '10px';
    totalDiv.style.boxShadow = '0 2px 8px #0002';
    totalDiv.style.fontSize = '16px';
    totalDiv.style.fontWeight = 'bold';
    totalDiv.style.color = '#2a7';
    totalDiv.style.zIndex = '2000';
    document.body.appendChild(totalDiv);
  }
  const total = getTotalPrice();
  const catTotals = getCategoryPrices();
  const catText = Object.entries(catTotals)
    .map(([cat, price]) => `${cat}: ${price.toLocaleString()}원`)
    .join(' / ');
  
  totalDiv.innerHTML = `총 견적: ${total.toLocaleString()}원 ${catText ? `<br>(${catText})` : ''}`;
}

// -------------------- PDF 저장 기능 --------------------
function downloadEstimatePDF() {
  // PDF로 출력할 HTML 생성
  const catTotals = getCategoryPrices();
  const total = getTotalPrice();
  const objects = scene.children.filter(child => child instanceof THREE.Mesh && child.userData && child.userData.name);
  let html = `<div style='font-family:sans-serif;min-width:400px;'>`;
  html += `<h2 style='margin-bottom:8px;'>견적서</h2>`;
  html += `<div style='font-size:18px;font-weight:bold;margin-bottom:8px;'>총 견적: ${total.toLocaleString()}원</div>`;
  html += `<div style='margin-bottom:16px;'>` + Object.entries(catTotals).map(([cat, price]) => `${cat}: ${price.toLocaleString()}원`).join(' / ') + `</div>`;
  html += `<table border='1' cellspacing='0' cellpadding='6' style='border-collapse:collapse;width:100%;font-size:15px;'>`;
  html += `<thead><tr style='background:#f0f0f0;'><th>이름</th><th>카테고리</th><th>가격</th><th>위치(x, y, z)</th></tr></thead><tbody>`;
  objects.forEach(obj => {
    const pos = obj.position;
    html += `<tr><td>${obj.userData.name}</td><td>${obj.userData.category}</td><td>${Number(obj.userData.price).toLocaleString()}원</td><td>${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}</td></tr>`;
  });
  html += `</tbody></table></div>`;

  html2pdf().set({
    margin: 10,
    filename: '견적서.pdf',
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  }).from(html).save();
}

function getCurrentObjects() {
  // 현재 씬의 오브제 배열을 반환 (저장용)
  return scene.children.filter(child => child instanceof THREE.Mesh && child.userData && child.userData.name).map(child => ({
    name: child.userData.name,
    category: child.userData.category,
    price: child.userData.price,
    position: child.position.toArray(),
    rotation: child.rotation.toArray(),
    scale: child.scale.toArray(),
    color: `#${child.material.color.getHexString()}`
  }));
}

// 3D 뷰어 초기화
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('3d-modeling-container');
  if (container) {
    const viewer = new ModelViewer(container);
    
    // 테스트용 모델 로드 (실제로는 Supabase에서 가져올 예정)
    viewer.loadModel('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/DamagedHelmet/glTF/DamagedHelmet.gltf');
  }
});
