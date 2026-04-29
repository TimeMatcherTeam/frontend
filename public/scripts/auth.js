import { deleteCookie, setCookie, setToken } from "./jwtUtils.js";
import { login, register } from "./authRequests.js";

export async function loginAuth(email, password) {
  const resp = await login(email, password);
  setCookie("userId", resp.userId);
  setToken(resp.accessToken);
}

export async function registerAuth(email, username, password) {
  const resp = await register(email, username, password);
  setCookie("userId", resp.userId);
  setToken(resp.accessToken);
}

export function logout() {
    deleteCookie("accessToken");
    deleteCookie("userId");
    
}