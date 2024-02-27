import { globalPageOpts, makeApiCall } from "./apiHandler.js";

// globalPageOpts is defined as {"pageSize": 100, "pageNumber": 1};
// makeApiCall is an async function that takes two arguments: apiFunctionStr and requestData
// apiFunctionStr is a string e.g. 'usersApi.getUsersMe'
// requestData is an object and is not required e.g. { 'pageSize': 100, 'pageNumber': 1 }

// Description: This file handles disconnection of the user

// TODO: Add remove subscriptions to notifications channel

// User disconnect
export async function disconnect() {
  // Log the disconnection
  console.log("WPT: Disconnecting user");

  // Disconnect the user
  makeApiCall("tokensApi.deleteTokensMe");

  // Clear the session storage & redirect to index.html
  sessionStorage.clear();
  window.location.replace("https://apmaries.github.io/wpt/index.html");
}

// Session timeout
function timeout() {
  // Log the timeout
  console.log("WPT: Timeout due to inactivity.");

  // Disconnect the user
  makeApiCall("tokensApi.deleteTokensMe");

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
