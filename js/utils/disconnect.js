async function disconnect() {
  // Declare variables
  const notificationsId = sessionStorage.getItem("notificationsId");
  const indexPage = "https://apmaries.github.io/wpt/index.html";

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
    window.location.replace(indexPage);
  }
}
