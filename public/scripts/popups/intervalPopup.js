import { JWT } from "../globals.js";


const intervalOverlay = document.getElementById("intervalFormOverlay");
const intervalForm = document.getElementById("intervalForm");
const submitBtn = document.getElementById("submitIntervalBtn");
const cancelBtn = document.getElementById("cancelIntervalBtn");

export function showIntervalPopup() {
  intervalOverlay.style.display = "";
}

cancelBtn.addEventListener("click", () => {
  intervalOverlay.style.display = "none";
});