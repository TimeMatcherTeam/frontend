import { auth } from "./auth.js";
import { getToken } from "./jwtUtils.js";

let JWT = getToken();
if (! JWT) {
  auth("user@example.com", "Password1234!");
}