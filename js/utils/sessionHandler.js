import { globalPageOpts, handleApiCalls } from "./apiHandler.js";
import { disconnect } from "./disconnectHandler.js";

// globalPageOpts is defined as {"pageSize": 100, "pageNumber": 1};
// handleApiCalls is an async function that takes two arguments: apiFunctionStr and requestData
// apiFunctionStr is a string e.g. 'usersApi.getUsersMe'
// requestData is an object and is not required e.g. { 'pageSize': 100, 'pageNumber': 1 }

// Description: This file initiates the session and checks if the user is authorised

if (!window.origin.includes("127.0.0.1")) {
  if (!sessionStorage.getItem("sesion_active")) {
    console.log("WPT: Session starting...");
    // Function to check if internal user
    function internalUserCheck(emailAddress) {
      const domain = emailAddress.split("@")[1];
      if (domain.toLowerCase() === "genesys.com") {
        console.log(`WPT: User ${emailAddress} is authorised for use`);
      } else {
        console.error(`WPT: User ${emailAddress} is not authorised for use!`);
        alert("Sorry, you are not authorised to use this page :(");
        sessionStorage.clear();
        window.location.replace("https://apmaries.github.io/wpt/index.html");
      }
    }

    // Get the logged in user
    const user = await handleApiCalls("UsersApi.getUsersMe");

    // temp logging
    console.log("WPT: User details: ", user);

    // check if internal user
    internalUserCheck(user.email);

    // Set user details in session storage
    sessionStorage.setItem("user_name", user.name);
    sessionStorage.setItem("user_id", user.id);

    let org;
    let client;

    try {
      // Synchronously return session related data
      [org, client] = await Promise.all([
        handleApiCalls("OrganizationApi.getOrganizationsMe"),
        handleApiCalls(
          "OAuthApi.getOauthClient",
          sessionStorage.getItem("client_id")
        ),

        // TODO: Possible enhancement for later if all timezones need to be read
        // handleApiCalls("UtilitiesApi.getTimezones", globalPageOpts),

        // TODO: Create notifications channel
      ]);

      // Continue executing dependent code
      // Update the subheader
      const authText = document.getElementById("authenticatedSubHeader");
      authText.innerHTML = `${user.name} authenticated in: ${org.name}`;

      // Store the org name & id in sessionStorage
      sessionStorage.setItem("org_name", org.name);
      sessionStorage.setItem("org_id", org.id);

      // Store the client name and scope in sessionStorage
      sessionStorage.setItem("client_name", client.name);
      // TODO: Future enhancement to validate client scope against list of scopes needed for tools and only show tools that have been authorised
      sessionStorage.setItem("client_scope", client.scope);

      // Set the flag in sessionStorage indicating that session is active
      sessionStorage.setItem("sesion_active", "true");
      console.log("WPT: Session started successfully!");
    } catch (error) {
      console.error(
        "WPT: Error occurred while fetching session data! User will be disconnected."
      );

      // Handle the error here
      alert("An error occurred while fetching session data. Please try again.");
      disconnect();
    }

    // Testing for pagination and error handling
    /* forced 400 error seems to work fine
  try {
    const forcedError = await handleApiCalls(
      "GamificationApi.postGamificationProfilesUsersMeQuery",
      globalPageOpts
    );
  } catch (error) {
    console.error(
      "WPT: Error occurred while fetching gamification data! User will be disconnected."
    );
    // Handle the error here
    //alert("An error occurred while fetching gamification data. Please try again.");
    //disconnect();
  }
  */

    /* Pagination seems to work fine :)
  try {
    const forcedPagination = await handleApiCalls(
      "UtilitiesApi.getTimezones",
      globalPageOpts
    );
    // Check handleApiCalls function pagination by logging number of timezones
    console.log(
      `WPT: ${forcedPagination.length} time zones: `,
      forcedPagination
    );
  } catch (error) {
    console.error(
      "WPT: Error occurred while fetching timezones! User will be disconnected."
    );
    // Handle the error here
    //alert("An error occurred while fetching timezones. Please try again.");
    //disconnect();
  }
  */
  } else {
    console.debug("WPT: Home page loaded with active session");

    let user = sessionStorage.getItem("user_name");
    let org = sessionStorage.getItem("org_name");

    // Update the subheader
    const authText = document.getElementById("authenticatedSubHeader");
    authText.innerHTML = `${user} authenticated in: ${org}`;
  }
} else {
  console.debug("WPT: Session started with test mode");
  // Update the subheader
  const authText = document.getElementById("authenticatedSubHeader");
  authText.innerHTML = `User Name authenticated in: Org Name`;
}
