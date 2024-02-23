let apiClient;
import { ApiClient } from "platformClient";

function authenticate() {
  sessionStorage.clear();
  console.log("WPT: WEM Power Tools initiated");

  // Set Genesys Cloud objects
  apiClient = ApiClient.instance;

  const clientId = document.getElementById("clientIdInput").value;
  const environment = document.getElementById("clientRegionInput").value;
  const redirectUri = "https://apmaries.github.io/wpt/wpt.html";

  console.log("WPT: Setting client id and environment session storage items");

  sessionStorage.setItem("clientId", clientId);
  sessionStorage.setItem("environment", environment);

  apiClient.setEnvironment(environment);
  apiClient.setPersistSettings(true, "_wpt_");

  let state;
  try {
    console.log("WPT: Logging in to GC");
    apiClient.loginImplicitGrant(clientId, redirectUri, {
      state: state,
    });
  } catch (error) {
    console.log(error);
  }
}
