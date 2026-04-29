import { loginAuth, registerAuth } from "../auth.js";
import { JWT } from "../globals.js";

let isLogin = true;

// Lazily resolve DOM elements. This prevents errors on pages that don't include the auth overlay.
function el(id) {
  return typeof document !== 'undefined' ? document.getElementById(id) : null;
}

function setupHandlers() {
  const authOverlay = el("authOverlay");
  const authForm = el("authForm");
  const formTitle = el("formTitle");
  const emailInput = el("email");
  const usernameInput = el("username");
  const usernameWrapper = el("usernameWrapper");
  const passwordInput = el("password");
  const confirmPasswordInput = el("confirmPassword");
  const confirmPasswordWrapper = el("confirmPasswordWrapper");
  const submitBtn = el("submitAuthBtn");
  const cancelBtn = el("cancelAuthBtn");
  const switchBtn = el("switchAuthBtn");
  const errorDiv = el("authError");
  const togglePassword = el("togglePassword");
  const toggleConfirmPassword = el("toggleConfirmPassword");
  const passwordEye = el("passwordEye");
  const confirmPasswordEye = el("confirmPasswordEye");

  if (switchBtn) {
    switchBtn.addEventListener("click", (event) => {
      event.preventDefault();
      isLogin = !isLogin;

      if (formTitle && submitBtn && switchBtn) {
        if (isLogin) {
          formTitle.textContent = "Вход";
          submitBtn.textContent = "Войти";
          switchBtn.textContent = "Нет аккаунта? Зарегистрироваться";
        } else {
          formTitle.textContent = "Регистрация";
          submitBtn.textContent = "Зарегистрироваться";
          switchBtn.textContent = "Уже есть аккаунт? Войти";
        }
      }

      if (usernameWrapper) usernameWrapper.style.display = isLogin ? "none" : "";
      if (confirmPasswordWrapper) confirmPasswordWrapper.style.display = isLogin ? "none" : "";

      if (errorDiv) errorDiv.textContent = "";
    });
  }

  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const email = emailInput ? emailInput.value : "";
      const password = passwordInput ? passwordInput.value : "";

      if (!email || !password) {
        if (errorDiv) {
          errorDiv.style.display = "";
          errorDiv.textContent = "Заполните email и пароль";
        }
        return;
      }

      if (!isLogin && confirmPasswordInput && confirmPasswordInput.value !== password) {
        if (errorDiv) {
          errorDiv.style.display = "";
          errorDiv.textContent = "Пароли не совпадают";
        }
        return;
      }

      if (!isLogin && (!usernameInput || !usernameInput.value)) {
        if (errorDiv) {
          errorDiv.style.display = "";
          errorDiv.textContent = "Введите имя пользователя";
        }
        return;
      }

      try {
        if (isLogin) {
          await loginAuth(email, password);
        } else {
          await registerAuth(email, usernameInput.value, password);
        }
        location.reload();
      } catch (error) {
        if (errorDiv) {
          errorDiv.style.display = "";
          errorDiv.textContent = error.message;
        }
      }
    });
  }

  if (cancelBtn && authOverlay) {
    cancelBtn.addEventListener("click", () => {
      authOverlay.style.display = "none";
    });
  }

  if (togglePassword && passwordInput && passwordEye) {
    togglePassword.addEventListener("click", () => {
      if (passwordInput.type === 'password') {
        passwordInput.type = "text";
        passwordEye.src = "/assets/closed_eye.svg";
      } else {
        passwordInput.type = "password";
        passwordEye.src = "/assets/eye.svg";
      }
    });
  }

  if (toggleConfirmPassword && confirmPasswordInput && confirmPasswordEye) {
    toggleConfirmPassword.addEventListener("click", () => {
      if (confirmPasswordInput.type === 'password') {
        confirmPasswordInput.type = "text";
        confirmPasswordEye.src = "/assets/closed_eye.svg";
      } else {
        confirmPasswordInput.type = "password";
        confirmPasswordEye.src = "/assets/eye.svg";
      }
    });
  }
}

// Initialize handlers if DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupHandlers);
  } else {
    setupHandlers();
  }
}

export function showAuthForm() {
  const authOverlay = el("authOverlay");
  if (!JWT) {
    if (authOverlay) {
      authOverlay.style.display = "";
    } else {
      // If overlay not present, fallback to alert
      alert('Пожалуйста, войдите в систему.');
    }
  }
}