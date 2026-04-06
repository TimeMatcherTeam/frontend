import { setCookie, setToken } from "./jwtUtils.js";
import { login } from "./requests.js";

export async function auth(email, password) {
  const resp = await login(email, password);
  setCookie("userId", resp.userId);
  setToken(resp.accessToken);
}