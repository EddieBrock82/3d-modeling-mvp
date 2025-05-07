// imweb-integration.js
export const createModelingIframe = () => {
  const iframe = document.createElement('iframe');
  iframe.src = 'https://your-3d-modeling-domain.com'; // 실제 도메인으로 변경 필요
  iframe.style.width = '100%';
  iframe.style.height = '800px';
  iframe.style.border = 'none';
  iframe.style.overflow = 'hidden';
  iframe.setAttribute('allow', 'fullscreen');
  
  // imweb에서 전달받은 사용자 정보
  const userData = {
    userId: window.IMWEB_USER_ID, // imweb에서 제공하는 사용자 ID
    userEmail: window.IMWEB_USER_EMAIL // imweb에서 제공하는 사용자 이메일
  };

  // iframe에 사용자 정보 전달
  iframe.onload = () => {
    iframe.contentWindow.postMessage({
      type: 'USER_DATA',
      data: userData
    }, '*');
  };

  return iframe;
};

// imweb 페이지에 iframe 삽입
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('3d-modeling-container');
  if (container) {
    container.appendChild(createModelingIframe());
  }
});