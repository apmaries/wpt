// make api calls
async function makeApiCallWithRetry(
  endpoint,
  method,
  postData = null,
  maxRetries = 3
) {
  const token = sessionStorage.getItem("token");
  const environment = sessionStorage.getItem("environment");
  const prefix = `https://api.${environment}`;

  console.debug(`WPT: Making ${method} request to ${endpoint}`);
  let retryCount = 0;
  const headers = {
    "Authorization": "bearer " + token,
    "Content-Type": "application/json",
  };

  while (retryCount < maxRetries) {
    try {
      const requestOptions = {
        method: method,
        headers: headers,
      };

      if (method === "POST" && postData) {
        requestOptions.body = JSON.stringify(postData);
      }

      const response = await fetch(prefix + endpoint, requestOptions);
      if (response.ok) {
        const data = await response.json();

        // return entities, results or object only
        if ("entities" in data) {
          // add logic to get next page
          let entities = data.entities;

          // fetch the next page and concatenate the entities if nextUri exists
          if ("nextUri" in data) {
            const nextPageEntities = await makeApiCallWithRetry(
              data.nextUri,
              method,
              postData,
              maxRetries
            );
            entities = entities.concat(nextPageEntities);
          }

          return entities;
        } else if ("results" in data) {
          console.debug(`WPT: ${method} data results returned`);
          return data.results;
        } else {
          console.debug(`WPT: ${method} data object returned`);
          return data;
        }
      } else {
        // error response handling
        const responseBody = await response.json();
        const message = responseBody.message;

        if (response.status === 429) {
          // handle rate limit
          retryCount++;
          // add logic to retrieve seconds to wait
          let hasRetrySeconds = message.match(/\[(.*?)\]/);
          if (hasRetrySeconds) {
            let retrySeconds = hasRetrySeconds[1];
            console.warn(
              `WPT: Rate limit breached! Retrying in ${retrySeconds} seconds`
            );
            await new Promise((resolve) =>
              setTimeout(resolve, retrySeconds * 1000)
            );
            console.warn(
              `WPT: Retrying request. Attempt ${retryCount} of ${maxRetries}`
            );
            continue;
          }
        } else if (response.status === 400) {
          // handle malformed syntax
          console.error(`WPT: Malformed POST body`, postData);
          return message;
        } else if (response.status === 401) {
          // invalid login or no token - redirect back to login
          sessionStorage.clear();
          alert(
            `Request failed: Invalid login credentials. Please log in again.`
          );
          window.location.href = "https://apmaries.github.io/wpt/index.html";
        } else {
          // some other error response
          console.error(
            `WPT: Request failed with status ${response.status}:`,
            responseBody
          );
          return message;
        }
      }
    } catch (error) {
      // handle the error
      return;
    }
  }
  console.error(`WPT: Maximum retry count exceeded!`);
}
