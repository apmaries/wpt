// Set up the client
var platformClient = window.require("platformClient");
var client = platformClient.ApiClient.instance;
client.setReturnExtendedResponses(true);

/*
// Set client logging
client.config.logger.log_level = client.config.logger.logLevelEnum.level.LDebug;
client.config.logger.log_format =
  client.config.logger.logFormatEnum.formats.JSON;
client.config.logger.log_request_body = true;
client.config.logger.log_response_body = true;
client.config.logger.log_to_console = true;
client.config.logger.setLogger(); // To apply above changes
*/

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
  while (retryCount < maxRetries) {
    try {
      response = await apiFunction(requestData);
      console.debug(`WPT: ${apiFunctionStr} response = `, response);
      break; // If the request was successful, break the loop
    } catch (error) {
      console.error(`WPT: Error making API call to ${apiFunctionStr}!`);

      // Handle error response status
      let errorStatus = error.status;
      let errorMessage = error.message;
      let errorCode = error.errorCode;
      let errorHeaders = error.headers;
      let errorBody; // used to create custom objects in error handling

      // Handle 429 rate limit exceeded
      if (errorStatus === 429) {
        let retryAfter = errorHeaders["Retry-After"];
        if (retryAfter) {
          console.debug(
            `WPT: Rate limit exceeded. Retrying after ${retryAfter} seconds.`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
          retryCount++;
        } else {
          console.error(
            `WPT: Rate limit exceeded but Retry-After header is missing.`
          );
          throw error;
        }
      }
      // Handle 400 malformed syntax
      else if (errorStatus === 400) {
        console.error(`WPT: Malformed syntax in request to ${apiFunctionStr}.`);
        throw error;
      }
      // Handle any other retryable errors
      else if ([408, 500, 503, 504].includes(errorStatus)) {
        console.debug(
          `WPT: Retryable error occurred. Retrying request to ${apiFunctionStr}.`
        );
        retryCount++;
      }
      // Handle any other errors
      else {
        console.error(
          `WPT: Error making API call to ${apiFunctionStr}. Status = ${responseStatus}`
        );
        throw new Error(`Error making API call to ${apiFunctionStr}`);
      }
    }
  }

  let responseBody = response.body;
  // Handle pagination for entities and results
  if (responseBody.entities || responseBody.results) {
    let responseAllPages = [];

    // if pageNumber exists in response, iterate through all pages
    if (responseBody.pageNumber) {
      let pageNumber = responseBody.pageNumber;

      // get all pages by iterating through the pages while pageNumber < pageCount
      do {
        // make the API call
        response = await apiFunction({ ...requestData, pageNumber });
        // concatenate the entities or results
        responseAllPages = responseAllPages.concat(
          response.body.entities || response.body.results
        );
        // increment the pageNumber
        pageNumber++;
      } while (pageNumber < response.body.pageCount);

      // return the concatenated entities or results
      return responseAllPages;
    }
    // else return entities or results if no pagination
    else {
      return responseBody.entities || responseBody.results;
    }
  }
  // Return the object
  else {
    return responseBody;
  }
}
