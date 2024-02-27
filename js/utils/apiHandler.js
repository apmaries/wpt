// Set up the client
var platformClient = window.require("platformClient");
var client = platformClient.ApiClient.instance;
client.setReturnExtendedResponses(true);

// Set client logging
client.config.logger.log_level = client.config.logger.logLevelEnum.level.LDebug;
client.config.logger.log_format =
  client.config.logger.logFormatEnum.formats.JSON;
client.config.logger.log_request_body = true;
client.config.logger.log_response_body = true;
client.config.logger.log_to_console = true;
client.config.logger.setLogger(); // To apply above changes

// Get the environment & access token from session storage
var accessToken = sessionStorage.getItem("token");
var environment = sessionStorage.getItem("client_env");

// Set the client configuration
client.setEnvironment(environment);
client.setAccessToken(accessToken);
client.setPersistSettings(true, "wpt");
// TODO: Why does the client need to be set up again? Can't we use the one from index.html?

// Log the client object
console.debug("WPT: Client (apiHandler.js) = ", client);

// Define the API instances in an object
const apiInstances = {}; // Is added to dynamically as calls are made

// Define global options
export const globalPageOpts = {
  "pageSize": 100, // Number | Page size
  "pageNumber": 1, // Number | Page number
};

// Make API calls
export async function makeApiCall(
  apiFunctionStr, // should be a string e.g. 'usersApi.getUsersMe'
  requestData // should be an object e.g. { 'pageSize': 100, 'pageNumber': 1 }
) {
  // Split the apiFunctionStr string and get the API instance and function
  const [apiInstanceName, functionName] = apiFunctionStr.split(".");

  // Debug log the API instance and function
  console.debug(
    `WPT: Making API call to ${apiInstanceName}.${functionName} with data: `,
    requestData
  );

  // If platformClient[apiInstanceName] is not defined, throw an error
  if (!platformClient[apiInstanceName]) {
    // Check if the apiInstanceName is in PascalCase
    if (apiInstanceName[0] !== apiInstanceName[0].toUpperCase()) {
      throw new Error(
        `API instance ${apiInstanceName} not found. API instance name should be in PascalCase`
      );
    }
    throw new Error(`API instance ${apiInstanceName} not found`);
  }

  const apiInstance =
    apiInstances[apiInstanceName] || new platformClient[apiInstanceName]();
  apiInstances[apiInstanceName] = apiInstance;

  const apiFunction = apiInstance[functionName].bind(apiInstance);

  // Set retry count and max retries
  let retryCount = 0;
  let maxRetries = 3;

  // Make the API call
  let response;
  try {
    response = await apiFunction(requestData);
    console.debug(`WPT: ${apiFunctionStr} response = `, response);
  } catch (error) {
    console.warn(`WPT: Error making API call to ${apiFunctionStr}:`, error);
    if (error instanceof platformClient.ApiException) {
      console.error(`WPT: Error making API call to ${apiFunctionStr}:`, error);
      throw error; // re-throw the error so it can be handled by the caller
    } else {
      console.error(
        `WPT: Unexpected error making API call to ${apiFunctionStr}:`,
        error
      );
      throw new Error(`Unexpected error occurred`);
    }
  }

  /*
  // Handle error response status
  let responseStatus = response.status;

  // TODO: Understand why status codes aren't included in response...
  // Think when using SDK I need to parse the response object to get the status code

  // If response status is not 2xx
  if (responseStatus < 200 || responseStatus >= 300) {
    // Handle 429 status
    if (responseStatus === 429) {
      console.warn("WPT: Rate limit exceeded.");

      // Get retry seconds
      let retrySeconds = response.headers.get("retry-after");
      console.warn(
        `WPT: Retrying ${apiFunctionStr} in ${retrySeconds} seconds`
      );

      // Wait for the retry seconds
      await new Promise((resolve) => setTimeout(resolve, retrySeconds * 1000));

      // Retry the API call
      console.warn(
        `WPT: Retrying ${apiFunctionStr}. Attempt ${
          retryCount + 1
        } of ${maxRetries}`
      );
      response = await apiFunction(requestData);
    }
    // Handle malformed syntax
    else if (responseStatus === 400) {
      console.error(
        `WPT: Malformed syntax in ${apiFunctionStr}. Request data = `,
        requestData
      );
      throw new Error(`Malformed syntax in ${apiFunctionStr}`);
    }
    // Handle any other retryable errors
    else if (responseStatus in [408, 500, 503, 504]) {
      console.error(
        `WPT: Error making API call to ${apiFunctionStr}. Status = ${responseStatus}`
      );

      // Retry the API call with exponential backoff at 3, 9 and 27 seconds
      if (retryCount < maxRetries) {
        retryCount++;
        const retrySeconds = 3 ** retryCount;
        console.warn(
          `WPT: Retrying ${apiFunctionStr}. Attempt ${
            retryCount + 1
          } of ${maxRetries}. Next attempt will be made in ${retrySeconds} seconds`
        );
        await new Promise((resolve) =>
          setTimeout(resolve, retrySeconds * 1000)
        );
        response = await apiFunction(requestData);
      } else {
        throw new Error(
          `Exceeded maximum reties while making API call to ${apiFunctionStr}`
        );
      }
    }
    // Handle any other errors
    else {
      console.error(
        `WPT: Error making API call to ${apiFunctionStr}. Status = ${responseStatus}`
      );
      throw new Error(`Error making API call to ${apiFunctionStr}`);
    }
  }*/

  // Handle pagination for entities and results
  if (response.entities || response.results) {
    let responseAllPages = [];

    // if pageNumber exists in response, iterate through all pages
    if (response.pageNumber) {
      let pageNumber = response.pageNumber;

      // get all pages by iterating through the pages while pageNumber < pageCount
      do {
        // make the API call
        response = await apiFunction({ ...requestData, pageNumber });
        // concatenate the entities or results
        responseAllPages = responseAllPages.concat(
          response.entities || response.results
        );
        // increment the pageNumber
        pageNumber++;
      } while (pageNumber < response.pageCount);

      // return the concatenated entities or results
      return responseAllPages;
    }
    // else return entities or results if no pagination
    else {
      return response.entities || response.results;
    }
  }
  // Return the object
  else {
    return response;
  }
}
