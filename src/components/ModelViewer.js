import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ModelViewer {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.controls = null;
    this.currentModel = null;
    
    this.init();
  }

  init() {
    // 렌더러 설정
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setClearColor(0xf0f0f0);
    this.container.appendChild(this.renderer.domElement);

    // 카메라 설정
    this.camera.position.set(0, 5, 10);
    this.camera.lookAt(0, 0, 0);

    // 컨트롤 설정
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 조명 설정
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    this.scene.add(directionalLight);

    // 그리드 헬퍼
    const gridHelper = new THREE.GridHelper(10, 10);
    this.scene.add(gridHelper);

    // 애니메이션 루프 시작
    this.animate();

    // 윈도우 리사이즈 이벤트
    window.addEventListener('resize', () => this.onWindowResize());
  }

  onWindowResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  loadModel(modelUrl) {
    // 기존 모델 제거
    if (this.currentModel) {
      this.scene.remove(this.currentModel);
    }

    // 로딩 표시
    this.showLoading();

    // 모델 로드
    const loader = new THREE.GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        this.currentModel = gltf.scene;
        this.scene.add(this.currentModel);
        
        // 모델 크기 조정
        const box = new THREE.Box3().setFromObject(this.currentModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 5 / maxDim;
        this.currentModel.scale.set(scale, scale, scale);

        // 모델 위치 조정
        const center = box.getCenter(new THREE.Vector3());
        this.currentModel.position.sub(center.multiplyScalar(scale));

        this.hideLoading();
      },
      undefined,
      (error) => {
        console.error('모델 로드 실패:', error);
        this.hideLoading();
      }
    );
  }

  showLoading() {
    let loadingDiv = this.container.querySelector('.loading');
    if (!loadingDiv) {
      loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading';
      loadingDiv.style.position = 'absolute';
      loadingDiv.style.top = '50%';
      loadingDiv.style.left = '50%';
      loadingDiv.style.transform = 'translate(-50%, -50%)';
      loadingDiv.style.color = '#666';
      loadingDiv.textContent = '모델 로딩 중...';
      this.container.appendChild(loadingDiv);
    }
  }

  hideLoading() {
    const loadingDiv = this.container.querySelector('.loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }
} 