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
      console.log(`WPT: User ${emailAddress} is authorised for use`);
    } else {
      console.error(`WPT: User ${emailAddress} is not authorised for use!`);
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

  let org;
  let client;
  let response;

  try {
    // Synchronously return session related data
    [org, client, response] = await Promise.all([
      makeApiCall("OrganizationApi.getOrganizationsMe"),
      makeApiCall(
        "OAuthApi.getOauthClient",
        sessionStorage.getItem("client_id")
      ),
      makeApiCall("GamificationApi.postGamificationProfilesUsersMeQuery"),

      // TODO: Possible enhancement for later if all timezones need to be read
      //makeApiCall("UtilitiesApi.getTimezones", globalPageOpts),

      // TODO: Create notifications channel
    ]);
  } catch (error) {
    console.error("WPT: Error occurred while fetching session data:", error);
    // Handle the error here
  }

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

  // Check makeApiCall function pagination by logging number of timezones
  //console.log(`WPT: ${timeZones.length} time zones: `, timeZones);
  // Confirmation that paginate entities are working

  // Set the flag in sessionStorage indicating that session is active
  sessionStorage.setItem("sesion_active", "true");
} else {
  console.debug("WPT: Session already active.");
}
