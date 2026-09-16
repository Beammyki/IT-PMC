'use strict';

(function initToolboxAuth() {
  const config = window.TOOLBOX_CONFIG || {};
  const sessionKey = config.sessionKey || 'toolbox_authenticated';
  const rememberKey = 'toolbox_remember_me';
  const authHashKey = 'toolbox_auth_hash';
  const loginScreen = document.getElementById('login-screen');
  const appShell = document.getElementById('app-shell');
  const form = document.getElementById('login-form');
  const passwordInput = document.getElementById('access-password');
  const toggleButton = document.getElementById('password-toggle');
  const submitButton = document.getElementById('login-submit');
  const errorMessage = document.getElementById('login-error');
  const rememberCheckbox = document.getElementById('remember-me');
  const catMascot = document.getElementById('login-cat-mascot');

  function updateMascotState() {
    if (!catMascot) return;
    catMascot.classList.remove('is-wrong');
    if (document.activeElement === passwordInput) {
      if (passwordInput.type === 'password') {
        catMascot.classList.add('is-covering');
        catMascot.classList.remove('is-peeking');
      } else {
        catMascot.classList.remove('is-covering');
        catMascot.classList.add('is-peeking');
      }
    } else {
      catMascot.classList.remove('is-covering', 'is-peeking');
    }
  }

  if (catMascot && passwordInput) {
    passwordInput.addEventListener('focus', updateMascotState);
    passwordInput.addEventListener('blur', updateMascotState);
    passwordInput.addEventListener('input', updateMascotState);
  }

  // Load saved remember-me preference (default to checked)
  if (rememberCheckbox) {
    const savedRemember = localStorage.getItem(rememberKey);
    rememberCheckbox.checked = savedRemember !== 'false';
  }

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
    if (catMascot) {
      catMascot.className = 'cat-mascot';
    }
    requestAnimationFrame(() => passwordInput.focus());
  }

  function checkAuth() {
    const expectedHash = config.accessPasswordHash || '';
    // 1. Check localStorage (persistent across tab & browser restarts)
    if (localStorage.getItem(sessionKey) === 'true') {
      const storedHash = localStorage.getItem(authHashKey);
      if (expectedHash && storedHash && storedHash !== expectedHash) {
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(authHashKey);
        return false;
      }
      return true;
    }
    // 2. Check sessionStorage (single tab session)
    if (sessionStorage.getItem(sessionKey) === 'true') {
      const storedHash = sessionStorage.getItem(authHashKey);
      if (expectedHash && storedHash && storedHash !== expectedHash) {
        sessionStorage.removeItem(sessionKey);
        sessionStorage.removeItem(authHashKey);
        return false;
      }
      return true;
    }
    return false;
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
    updateMascotState();
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
        if (catMascot) {
          catMascot.classList.remove('is-covering', 'is-peeking', 'is-success');
          catMascot.classList.add('is-wrong');
          const loginCard = document.querySelector('.login-card');
          if (loginCard) {
            loginCard.classList.remove('haptic-shake');
            void loginCard.offsetWidth;
            loginCard.classList.add('haptic-shake');
          }
          setTimeout(() => {
            catMascot.classList.remove('is-wrong');
            updateMascotState();
          }, 900);
        }
        return;
      }
      passwordInput.value = '';
      if (catMascot) {
        catMascot.classList.remove('is-covering', 'is-peeking', 'is-wrong');
        catMascot.classList.add('is-success');
        await new Promise(resolve => window.setTimeout(resolve, 450));
      }
      const shouldRemember = rememberCheckbox ? rememberCheckbox.checked : true;
      if (shouldRemember) {
        localStorage.setItem(sessionKey, 'true');
        localStorage.setItem(authHashKey, hash);
        localStorage.setItem(rememberKey, 'true');
      } else {
        sessionStorage.setItem(sessionKey, 'true');
        sessionStorage.setItem(authHashKey, hash);
        localStorage.removeItem(sessionKey);
        localStorage.removeItem(authHashKey);
        localStorage.setItem(rememberKey, 'false');
      }
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
      sessionStorage.removeItem(authHashKey);
      localStorage.removeItem(sessionKey);
      localStorage.removeItem(authHashKey);
      showLogin();
    },
    isAuthenticated() {
      return checkAuth();
    }
  });

  if (checkAuth()) showApplication();
  else showLogin();
})();
