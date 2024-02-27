import { globalPageOpts, makeApiCall } from "./apiHandler.js";

// globalPageOpts is defined as {"pageSize": 100, "pageNumber": 1};
// makeApiCall is an async function that takes two arguments: apiFunctionStr and requestData
// apiFunctionStr is a string e.g. 'usersApi.getUsersMe'
// requestData is an object and is not required e.g. { 'pageSize': 100, 'pageNumber': 1 }

// Description: This file handles disconnection of the user

// TODO: Add remove subscriptions to notifications channel

// User disconnect
async function disconnect() {
  // Log the disconnection
  console.log("WPT: Disconnecting user");

  // temp logging
  console.debug("WPT: Client (disconnect()) = ", client);

  // Disconnect the user
  makeApiCall("tokensApi.deleteTokensMe");
}

// Session timeout
function timeout() {
  // Log the timeout
  console.log("WPT: Timeout due to inactivity.");

  // temp logging
  console.debug("WPT: Client (timeout()) = ", client);

  // Disconnect the user
  makeApiCall("tokensApi.deleteTokensMe");
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
