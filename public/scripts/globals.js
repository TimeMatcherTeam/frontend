import { loginAuth } from "./auth.js";
import { getToken } from "./jwtUtils.js";
import { getAbilities } from "./requests/requests.js";

export let JWT = getToken();

export let ABILITIES;
document.addEventListener('DOMContentLoaded', async () => {
  ABILITIES = await getAbilities()
  console.log(ABILITIES)
})