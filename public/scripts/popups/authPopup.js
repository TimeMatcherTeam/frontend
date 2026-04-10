import { loginAuth, registerAuth } from "../auth.js";
import { JWT } from "../globals.js";

let isLogin = true;

const authOverlay = document.getElementById("authOverlay");
const authForm = document.getElementById("authForm");
const formTitle = document.getElementById("formTitle");
const emailInput = document.getElementById("email");
const usernameInput = document.getElementById("username");
const usernameWrapper = document.getElementById("usernameWrapper");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const confirmPasswordWrapper = document.getElementById("confirmPasswordWrapper");
const submitBtn = document.getElementById("submitAuthBtn");
const cancelBtn = document.getElementById("cancelAuthBtn");
const switchBtn = document.getElementById("switchAuthBtn");
const errorDiv = document.getElementById("authError");

switchBtn.addEventListener("click", (event) => {
  event.preventDefault();
  isLogin = !isLogin;

  if (isLogin) {
    formTitle.textContent = "Вход";
    submitBtn.textContent = "Войти";
    switchBtn.textContent = "Нет аккаунта? Зарегистрироваться";
    usernameWrapper.style.display = "none";
    confirmPasswordWrapper.style.display = "none";
  } else {
    formTitle.textContent = "Регистрация";
    submitBtn.textContent = "Зарегистрироваться";
    switchBtn.textContent = "Уже есть аккаунт? Войти";
    usernameWrapper.style.display = "";
    confirmPasswordWrapper.style.display = "";
  }

  errorDiv.textContent = "";
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  console.log("submit");

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    errorDiv.style.display = "";
    errorDiv.textContent = "Заполните email и пароль";
    return;
  }

  if (!isLogin && confirmPasswordInput.value !== password) {
    errorDiv.style.display = "";
    errorDiv.textContent = "Пароли не совпадают";
    return;
  }

  if (!isLogin && !usernameInput.value) {
    errorDiv.style.display = "";
    errorDiv.textContent = "Введите имя пользователя";
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
    errorDiv.style.display = "";
    errorDiv.textContent = error.message;
  }
});

cancelBtn.addEventListener("click", () => {
  authOverlay.style.display = "none";
});

export function showAuthForm() {
  if (!JWT) {
    authOverlay.style.display = "";
  }
}
