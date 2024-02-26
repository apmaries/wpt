// Extract the fragment identifier
var hash = window.location.hash;

// Remove the '#' symbol
var tokenString = hash.substring(1);

// Create a URLSearchParams object
var urlParams = new URLSearchParams(tokenString);

// Extract the access token
var accessToken = urlParams.get("access_token");

// Extract other parameters
var expiresIn = urlParams.get("expires_in");
var tokenType = urlParams.get("token_type");

console.log("WPT: Access token: ", accessToken);
console.log("WPT: Expires in: ", expiresIn);
console.log("WPT: Token type: ", tokenType);

// Store the parameters in sessionStorage
sessionStorage.setItem("access_token", accessToken);
sessionStorage.setItem("token_expires_in", expiresIn);
sessionStorage.setItem("token_type", tokenType);

// Dispatch a custom event to signal that the token has been set
var tokenEvent = new CustomEvent("tokenSet");
window.dispatchEvent(tokenEvent);

// Only make API calls if accessToken has a value
if (accessToken) {
  // Set up the client
  var platformClient = window.require("platformClient");
  var client = platformClient.ApiClient.instance;
  client.setAccessToken(accessToken);

  // Create API instances
  var usersApi = new platformClient.UsersApi();
  var organizationsApi = new platformClient.OrganizationApi();
  var oAuthApi = new platformClient.OAuthApi();

  // Function to check if internal user
  function internalUserCheck(emailAddress) {
    const domain = emailAddress.split("@")[1];
    if (domain.toLowerCase() === "genesys.com") {
      console.log("WPT: Authorised user");
    } else {
      console.log("WPT: Unauthorised user!");
      alert("Sorry, you are not authorised to use this page :(");
      sessionStorage.clear();
      window.location.replace("https://apmaries.github.io/wpt/index.html");
    }
  }

  // Get the logged-in user
  usersApi
    .getUsersMe()
    .then(function (user) {
      // Store the user's name in sessionStorage
      sessionStorage.setItem("user_name", user.name);
      sessionStorage.setItem("user_id", user.id);

      // Check if internal user
      internalUserCheck(user.email);

      // Get the client id from session storage
      var clientId = sessionStorage.getItem("client_id");

      // Run the getOrganizationsMe() and getOauthClient() calls in parallel
      return Promise.all([
        organizationsApi.getOrganizationsMe(),
        oAuthApi.getOauthClient(clientId),
      ]);
    })
    .then(function (results) {
      // The results array contains the results of the two API calls
      var org = results[0];
      var client = results[1];

      // Store the org name & id in sessionStorage
      sessionStorage.setItem("org_name", org.name);
      sessionStorage.setItem("org_id", org.id);

      // Store the client name and scope in sessionStorage
      sessionStorage.setItem("client_name", client.name);
      sessionStorage.setItem("client_scope", client.scope);
    })
    .catch(function (error) {
      console.error("WPT: Error: ", error);
    });
}
