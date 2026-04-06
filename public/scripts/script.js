import { auth } from "./auth.js";
import { getToken } from "./jwtUtils.js";

let JWT = getToken();
if (! JWT) {
  
}