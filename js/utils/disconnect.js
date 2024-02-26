// Description: This file handles disconnection of the user

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
      sessionStorage.clear();
      window.location.replace("https://apmaries.github.io/wpt/index.html");
    })
    .catch(function (error) {
      console.error("WPT: Error deleting token", error);
    });
}

// User disconnect
async function disconnect() {
  // Log the disconnection
  console.log("WPT: Disconnecting user");

  // temp logging
  console.log("WPT: Client (disconnect.js) = ", client);

  // Delete the current token
  deleteToken();
}

// Session timeout
function timeout() {
  // Log the timeout
  console.log("WPT: Timeout due to inactivity.");

  // Disconnect the user
  disconnect();
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
