import { globalPageOpts, handleApiCalls } from "./apiHandler.js";

// globalPageOpts is defined as {"pageSize": 100, "pageNumber": 1};
// handleApiCalls is an async function that takes two arguments: apiFunctionStr and requestData
// apiFunctionStr is a string e.g. 'usersApi.getUsersMe'
// requestData is an object and is not required e.g. { 'pageSize': 100, 'pageNumber': 1 }

// Description: This file handles disconnection of the user

// TODO: Add remove subscriptions to notifications channel

// User disconnect
export async function disconnect() {
  // Log the disconnection
  console.log("WPT: Disconnecting user");

  // Disconnect the user
  await handleApiCalls("TokensApi.deleteTokensMe");

  // Clear the session storage & redirect to index.html
  sessionStorage.clear();
  window.location.replace("https://apmaries.github.io/wpt/index.html");
}

export async function disconnectWithConfirmation() {
  const confirmed = confirm("Are you sure you want to disconnect?");
  if (confirmed) {
    disconnect();
  }
}

// Session timeout
async function timeout() {
  // Log the timeout
  console.log("WPT: Timeout due to inactivity.");

  // Disconnect the user
  await handleApiCalls("TokensApi.deleteTokensMe");

  // Clear the session storage & redirect to index.html
  sessionStorage.clear();
  window.location.replace("https://apmaries.github.io/wpt/index.html");
}

// Function to reset the activity timer
function resetActivityTimer() {
  clearTimeout(activityTimeout);
  activityTimeout = setTimeout(timeout, 15 * 60 * 1000); // 15 minutes in milliseconds
}
// Functions end here

// main code starts here
let activityTimeout;

resetActivityTimer();

// Add event listeners to detect user activity
document.addEventListener("mousemove", resetActivityTimer);
document.addEventListener("keydown", resetActivityTimer);

// Run disconnect() when id="disconnect-button" is clicked
document
  .getElementById("disconnect-button")
  .addEventListener("click", disconnectWithConfirmation);

// TODO: Fix this so that navigation doesn't disconnect the user
// Run disconnect() when user closes the window
// window.onbeforeunload = disconnect;
