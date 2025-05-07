// imweb-communication.js
export class ImwebCommunication {
  constructor() {
    this.userData = null;
    this.initializeMessageListener();
  }

  initializeMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data.type === 'USER_DATA') {
        this.userData = event.data.data;
        this.handleUserData();
      }
    });
  }

  handleUserData() {
    // 사용자 데이터를 Supabase에 저장
    this.saveUserDataToSupabase();
  }

  async saveUserDataToSupabase() {
    if (!this.userData) return;

    try {
      const { data, error } = await supabase
        .from('user_sessions')
        .upsert({
          imweb_user_id: this.userData.userId,
          email: this.userData.userEmail,
          last_active: new Date().toISOString()
        });

      if (error) throw error;
    } catch (error) {
      console.error('Supabase 저장 실패:', error);
    }
  }

  // 3D 모델링 데이터를 imweb으로 전송
  sendModelDataToImweb(modelData) {
    window.parent.postMessage({
      type: 'MODEL_DATA',
      data: modelData
    }, '*');
  }
}