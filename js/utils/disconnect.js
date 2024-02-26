async function disconnect() {
  // Retrieve the access token from sessionStorage
  var accessToken = sessionStorage.getItem("access_token");
  console.log("WPT: Disconnecting user with token: ", accessToken);

  // Set up the client
  var platformClient = window.require("platformClient");
  var client = platformClient.ApiClient.instance;
  client.setAccessToken(accessToken);

  // Create an instance of TokensApi
  var tokensApi = new platformClient.TokensApi();

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

  /*
  // Declare variables
  //const notificationsId = sessionStorage.getItem("notificationsId");
  console.log("WPT: User disconnecting");

  let x;

  // Confirm disconnection
  if (confirm("Are you sure?") == true) {
    try {
      // delete notifications channel subscriptions
      x = makeApiCallWithRetry(
        `/notifications/channels/${notificationsId}/subscriptions`,
        "DELETE"
      );

      if (!x) {
        console.warn(
          `WPT: Error deleting notifications channel subscriptions`,
          x
        );
      }

      // delete the token
      x = makeApiCallWithRetry(`/tokens/me`, "DELETE");
      if (!x) {
        console.warn(`WPT: Error deleting token`, x);
      }
    } catch (error) {
      console.error(`WPT: Error disconnecting: ${error}`);
    }

    // Clear the session storage and redirect to the login page
    sessionStorage.clear;
    window.location.replace("https://apmaries.github.io/wpt/index.html");
  }*/
}
