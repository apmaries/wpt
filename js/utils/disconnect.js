// Description: This file handles disconnection of the user

// TODO: Why does the client need to be set up again? Can't we use the one from index.html?
// Get access token
var accessToken = sessionStorage.getItem("token");
// Set up the client
var platformClient = window.require("platformClient");
var client = platformClient.ApiClient.instance;
client.setAccessToken(accessToken);

// Create an instance of TokensApi
var tokensApi = new platformClient.TokensApi();

// Functions start here
// Function to delete token
function deleteToken() {
  // Delete the current token
  tokensApi
    .deleteTokensMe()
    .then(function () {
      console.log("WPT: Token deleted successfully");
    })
    .catch(function (error) {
      console.error("WPT: Error deleting token", error);
    });

  // Clear the session storage & redirect to login page
  sessionStorage.clear();
  window.location.replace("https://apmaries.github.io/wpt/index.html");
}

// TODO: Add remove subscriptions to notifications channel

// User disconnect
async function disconnect() {
  // Log the disconnection
  console.log("WPT: Disconnecting user");

  // temp logging
  console.debug("WPT: Client (disconnect()) = ", client);

  // Disconnect the user
  deleteToken();
}

// Session timeout
function timeout() {
  // Log the timeout
  console.log("WPT: Timeout due to inactivity.");

  // temp logging
  console.debug("WPT: Client (timeout()) = ", client);

  // Disconnect the user
  deleteToken();
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
