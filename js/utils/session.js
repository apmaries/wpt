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

// Store the parameters in sessionStorage
sessionStorage.setItem("access_token", accessToken);
sessionStorage.setItem("expires_in", expiresIn);
sessionStorage.setItem("token_type", tokenType);

// Set up the client
var platformClient = window.require("platformClient");
var client = platformClient.ApiClient.instance;
client.setAccessToken(accessToken);

// Create API instances
var usersApi = new platformClient.UsersApi();
var organizationsApi = new platformClient.OrganizationApi();
var oAuthApi = new platformClient.OAuthApi();

// Define the index page
const indexPage = "https://apmaries.github.io/wpt/index.html";

// Function to check if internal user
function internalUserCheck(emailAddress) {
  const domain = emailAddress.split("@")[1];
  if (domain.toLowerCase() === "genesys.com") {
    console.log("WPT: Authorised user");
  } else {
    console.log("WPT: Unauthorised user!");
    alert("Sorry, you are not authorised to use this page :(");
    window.location.replace(indexPage);
  }
}

// Get the logged-in user
usersApi
  .getUsersMe()
  .then(function (user) {
    // Store the user's name in sessionStorage
    sessionStorage.setItem("user_name", user.name);
    sessionStorage.setItem("user_id", user.id);
  })
  .catch(function (error) {
    console.error("WPT: Error getting user: ", error);
  });

// Get the org details
organizationsApi
  .getOrganizationsMe()
  .then(function (org) {
    // Store the org name & id in sessionStorage
    sessionStorage.setItem("org_name", org.name);
    sessionStorage.setItem("org_id", org.id);
  })
  .catch(function (error) {
    console.error("WPT: Error getting organization: ", error);
  });

// Get the oauth client scope
oAuthApi
  .getOauthClient("wpt")
  .then(function (client) {
    // Store the client name and scope in sessionStorage
    sessionStorage.setItem("client_name", client.name);
    sessionStorage.setItem("client_scope", client.scope);
  })
  .catch(function (error) {
    console.error("WPT: Error getting client scope: ", error);
  });
