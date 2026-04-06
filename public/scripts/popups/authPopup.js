import { loginAuth, registerAuth } from "../auth.js";
import { JWT } from "../globals.js";

let isLogin = true;

const formTitle = document.getElementById("formTitle");
const emailInput = document.getElementById("email");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const confirmPasswordInput = document.getElementById("confirmPassword");
const submitBtn = document.getElementById("submitBtn");
const switchBtn = document.getElementById("switchBtn");
const errorDiv = document.getElementById("error");

switchBtn.addEventListener("click", (event) => {
  event.preventDefault();
  isLogin = !isLogin;

  if (isLogin) {
    formTitle.textContent = "Вход";
    submitBtn.value = "Войти";
    switchBtn.textContent = "Нет аккаунта? Зарегистрироваться";
    usernameInput.style.display = "none";
    confirmPasswordInput.style.display = "none";
  } else {
    formTitle.textContent = "Регистрация";
    submitBtn.value = "Зарегистрироваться";
    switchBtn.textContent = "Уже есть аккаунт? Войти";
    usernameInput.style.display = "";
    confirmPasswordInput.style.display = "";
  }

  errorDiv.textContent = "";
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  console.log("submit");

  const email = emailInput.value;
  const password = passwordInput.value;

  if (!email || !password) {
    errorDiv.textContent = "Заполните email и пароль";
    return;
  }

  if (confirmPasswordInput.value !== password) {
    errorDiv.textContent = "Пароли не совпадают";
    return;
  }

  if (!isLogin && !usernameInput.value) {
    errorDiv.textContent = "Введите имя пользователя";
    return;
  }
  try {
    if (isLogin) {
      await loginAuth(email, password);
    } else {
      await registerAuth(email, usernameInput.value, password);
    }
    location.reload()
  }
  catch (error){
    errorDiv.textContent = error.message;
  }
});

export function showAuthForm() {
  const authForm = document.getElementById("authForm");
  if (!JWT) {
    authForm.style.display = "";
  }
}
