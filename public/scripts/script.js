import "./globals.js"
import { showAuthForm } from "./popups/authPopup.js"
import { initMeetingModal } from "./calendar/meetingModal.js"
import { initCreateGroupPopup } from "./calendar/createGroupPopup.js"
import { initMeetingUsersPopup } from "./calendar/userSearchPopup.js"

showAuthForm();
initMeetingModal();
initMeetingUsersPopup();
initCreateGroupPopup();