'use strict';

(function initToolboxAuth() {
  const config = window.TOOLBOX_CONFIG || {};
  const sessionKey = config.sessionKey || 'toolbox_authenticated';
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  const form = document.getElementById('login-form');
  const passwordInput = document.getElementById('access-password');
  const toggleButton = document.getElementById('password-toggle');
  const submitButton = document.getElementById('login-submit');
  const errorMessage = document.getElementById('login-error');

  function showApplication() {
    loginScreen.hidden = true;
    appShell.hidden = false;
    document.body.classList.add('is-authenticated');
    window.dispatchEvent(new CustomEvent('toolbox:authenticated'));
  }

  function showLogin() {
    appShell.hidden = true;
    loginScreen.hidden = false;
    document.body.classList.remove('is-authenticated');
    errorMessage.textContent = '';
    passwordInput.value = '';
    requestAnimationFrame(() => passwordInput.focus());
  }

  async function digestPassword(value) {
    if (!window.crypto || !window.crypto.subtle) {
      throw new Error('เบราว์เซอร์นี้ไม่รองรับ Web Crypto API กรุณาเปิดผ่านเบราว์เซอร์รุ่นปัจจุบัน');
    }
    const data = new TextEncoder().encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  toggleButton.addEventListener('click', () => {
    const isVisible = passwordInput.type === 'text';
    passwordInput.type = isVisible ? 'password' : 'text';
    toggleButton.setAttribute('aria-pressed', String(!isVisible));
    toggleButton.setAttribute('aria-label', isVisible ? 'แสดงรหัสผ่าน' : 'ซ่อนรหัสผ่าน');
    passwordInput.focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    errorMessage.textContent = '';
    if (!/^[a-f0-9]{64}$/i.test(config.accessPasswordHash || '')) {
      errorMessage.textContent = 'ระบบยังไม่ได้ตั้งค่ารหัสผ่านอย่างถูกต้อง กรุณาตรวจสอบไฟล์ js/config.js';
      return;
    }
    if (!passwordInput.value) {
      errorMessage.textContent = 'กรุณากรอกรหัสผ่าน';
      passwordInput.focus();
      return;
    }

    submitButton.disabled = true;
    submitButton.classList.add('is-loading');
    try {
      const hash = await digestPassword(passwordInput.value);
      await new Promise(resolve => window.setTimeout(resolve, 220));
      if (hash !== config.accessPasswordHash) {
        errorMessage.textContent = 'รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง';
        passwordInput.value = '';
        passwordInput.focus();
        return;
      }
      passwordInput.value = '';
      sessionStorage.setItem(sessionKey, 'true');
      showApplication();
    } catch (error) {
      errorMessage.textContent = error.message || 'ไม่สามารถตรวจสอบรหัสผ่านได้';
    } finally {
      submitButton.disabled = false;
      submitButton.classList.remove('is-loading');
    }
  });

  window.ToolboxAuth = Object.freeze({
    logout() {
      sessionStorage.removeItem(sessionKey);
      showLogin();
    },
    isAuthenticated() {
      return sessionStorage.getItem(sessionKey) === 'true';
    }
  });

  if (sessionStorage.getItem(sessionKey) === 'true') showApplication();
  else showLogin();
})();
