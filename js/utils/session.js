import { globalPageOpts, makeApiCall } from "./apiHandler.js";

// globalPageOpts is defined as {"pageSize": 100, "pageNumber": 1};
// makeApiCall is an async function that takes two arguments: apiFunctionStr and requestData
// apiFunctionStr is a string e.g. 'usersApi.getUsersMe'
// requestData is an object and is not required e.g. { 'pageSize': 100, 'pageNumber': 1 }

// Description: This file initiates the session and checks if the user is authorised

if (!sessionStorage.getItem("sesion_active")) {
  console.debug("WPT: Session starting...");
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

  // Get the logged in user
  const user = await makeApiCall("UsersApi.getUsersMe");
  // check if internal user
  internalUserCheck(user.email);

  // Set user details in session storage
  sessionStorage.setItem("user_name", user.name);
  sessionStorage.setItem("user_id", user.id);

  // Synchronously return organization, client, and timezone data
  const [org, client, timeZones] = await Promise.all([
    makeApiCall("OrganizationApi.getOrganizationsMe"),
    makeApiCall("OAuthApi.getOauthClient", sessionStorage.getItem("client_id")),
    makeApiCall("UtilitiesApi.getTimezones", globalPageOpts),
  ]);

  // Store the org name & id in sessionStorage
  sessionStorage.setItem("org_name", org.name);
  sessionStorage.setItem("org_id", org.id);

  // Store the client name and scope in sessionStorage
  sessionStorage.setItem("client_name", client.name);
  sessionStorage.setItem("client_scope", client.scope);

  // Check makeApiCall function pagination by logging number of timezones
  console.log(`WPT: ${timeZones.length} time zones: `, timeZones);

  // Update the subheader
  const authText = document.getElementById("authenticatedSubHeader");
  authText.innerHTML = `Authenticated ${user.name} in: ${org.name}`;

  // Set the flag in sessionStorage indicating that session is active
  sessionStorage.setItem("sesion_active", "true");
} else {
  console.debug("WPT: Session already active.");
}

/*
// Only make API calls if accessToken has a value
if (accessToken) {
  // Set up the client
  var environment = sessionStorage.getItem("client_env");
  var platformClient = window.require("platformClient");
  var client = platformClient.ApiClient.instance;
  client.setAccessToken(accessToken);

  // Log the client object
  console.debug("WPT: Client (session.js) = ", client);

  // TODO: Why does the client need to be set up again? Can't we use the one from index.html?
  client.setEnvironment(environment);
  client.setPersistSettings(true, "wpt");

  // Create API instances
  var usersApi = new platformClient.UsersApi();
  var organizationsApi = new platformClient.OrganizationApi();
  var oAuthApi = new platformClient.OAuthApi();
  var utilitiesApi = new platformClient.UtilitiesApi();

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
        getAllPages(utilitiesApi.getTimezones, globalOpts),
      ]);
    })
    .then(function (results) {
      // The results array contains the results of the two API calls
      var org = results[0];
      var client = results[1];
      var timeZones = results[2];

      // Store the org name & id in sessionStorage
      sessionStorage.setItem("org_name", org.name);
      sessionStorage.setItem("org_id", org.id);

      // Store the client name and scope in sessionStorage
      sessionStorage.setItem("client_name", client.name);
      sessionStorage.setItem("client_scope", client.scope);

      // Update the subheader
      const authText = document.getElementById("authenticatedSubHeader");
      authText.innerHTML = `Authenticated in: ${org.name}`;

      console.log(`WPT: ${timeZones.legnth} time zones: `, timeZones);
    })
    .catch(function (error) {
      console.error("WPT: Error: ", error);
    });
}*/
