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

// Handle errors in API calls
async function handleApiErrors(error, apiFunctionStr) {
  // Handle error response status
  let errorStatus = error.status;
  let errorMessage = error.message;
  let errorCode = error.errorCode;
  let errorHeaders = error.headers;
  let errorBody = {
    status: errorStatus,
    message: errorMessage,
    errorCode: errorCode,
  }; // used to log shortened objects in error handling

  // Define rertry variables
  let isRetryable = false; // default to not retryable
  let retryAfter; // default to undefined - exponential backoff will be handled in the catch block

  // Handle 429 rate limit exceeded
  if (errorStatus === 429) {
    isRetryable = true; // set to retryable
    retryAfter = errorHeaders["Retry-After"]; // override default retryAfter, value is seconds
    if (retryAfter) {
      console.debug(
        `WPT: Rate limit exceeded. Retrying after ${retryAfter} seconds.`,
        errorBody
      );
    } else {
      // if retryAfter is missing, log the error and throw it
      console.error(
        `WPT: Rate limit exceeded but Retry-After header is missing.`,
        errorBody
      );
      throw error;
    }
  }
  // Handle 400 malformed syntax
  else if (errorStatus === 400) {
    console.error(
      `WPT: Malformed syntax in request to ${apiFunctionStr}.`,
      errorBody
    );
    throw error;
  }
  // Handle any other retryable errors
  else if ([408, 500, 503, 504].includes(errorStatus)) {
    isRetryable = true; // set to retryable
    retryAfter = 3; // override default retryAfter to initial 3 second delay
    console.debug(
      `WPT: Retryable error occurred. Retrying request to ${apiFunctionStr}.`,
      errorBody
    );
  }
  // Handle any other errors
  else {
    console.error(
      `WPT: Error making API call to ${apiFunctionStr}. Status = ${errorStatus}`,
      errorBody
    );
    throw new Error(`Error making API call to ${apiFunctionStr}`);
  }
  return { isRetryable, retryAfter };
}

// Make API calls
export async function handleApiCalls(
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

  // Initialize the combined entities or results
  let allEntities = [];
  let allResults = [];

  while (retryCount < maxRetries) {
    try {
      // If requestData is undefined, set it to an empty object
      requestData = requestData || {};

      let currentPage = requestData.pageNumber;

      while (true) {
        const response = await apiFunction(requestData);
        const responseBody = response.body;

        if (responseBody) {
          if (
            responseBody.pageNumber !== undefined &&
            responseBody.pageCount !== undefined
          ) {
            currentPage = responseBody.pageNumber;
            const pageCount = responseBody.pageCount;

            // Concatenate the entities or results
            if (responseBody.entities) {
              allEntities = allEntities.concat(responseBody.entities);
            } else if (responseBody.results) {
              allResults = allResults.concat(responseBody.results);
            }

            if (currentPage >= pageCount) {
              break;
            }

            // Prepare for the next page
            requestData.pageNumber = currentPage + 1;
          } else {
            // If there are no pages, return the single object
            return responseBody;
          }
        } else {
          throw new Error(`Error making API call to ${apiFunctionStr}`);
        }
      }

      // Return the combined results
      if (allEntities.length > 0) {
        return allEntities;
      } else if (allResults.length > 0) {
        return allResults;
      }
    } catch (error) {
      console.error(`WPT: Error making API call to ${apiFunctionStr}!`);
      console.warn(error);
      const { isRetryable, retryAfter } = handleApiErrors(
        error,
        apiFunctionStr
      );
      if (isRetryable) {
        // update delay if non-429 type error
        if (error.status !== 429) {
          // exponential backoff at 3, 9 and 27 seconds for retries (delay being returned is already 3)
          let backoffRetry = retryAfter * 1000 * 3 ** retryCount;
          console.warn(`WPT: Retrying after ${backoffRetry} seconds`);
          await new Promise((resolve) => setTimeout(resolve, backoffRetry));
        } else {
          // if 429 error, use the retryAfter header value
          console.warn(`WPT: Retrying after ${retryAfter} seconds`);
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
        }
        retryCount++;
      } else {
        throw error;
      }
    }
  }
}

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
      let errorBody = {
        status: errorStatus,
        message: errorMessage,
        errorCode: errorCode,
      }; // used to log shortened objects in error handling

      // Handle 429 rate limit exceeded
      if (errorStatus === 429) {
        let retryAfter = errorHeaders["Retry-After"];
        if (retryAfter) {
          console.debug(
            `WPT: Rate limit exceeded. Retrying after ${retryAfter} seconds.`,
            errorBody
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryAfter * 1000)
          );
          retryCount++;
        } else {
          console.error(
            `WPT: Rate limit exceeded but Retry-After header is missing.`,
            errorBody
          );
          throw error;
        }
      }
      // Handle 400 malformed syntax
      else if (errorStatus === 400) {
        console.error(
          `WPT: Malformed syntax in request to ${apiFunctionStr}.`,
          errorBody
        );
        throw error;
      }
      // Handle any other retryable errors
      else if ([408, 500, 503, 504].includes(errorStatus)) {
        console.debug(
          `WPT: Retryable error occurred. Retrying request to ${apiFunctionStr}.`,
          errorBody
        );
        // Exponential backoff at 3, 9 and 27 seconds
        await new Promise((resolve) =>
          setTimeout(resolve, 3 * 1000 * 3 ** retryCount)
        );
        retryCount++;
      }
      // Handle any other errors
      else {
        console.error(
          `WPT: Error making API call to ${apiFunctionStr}. Status = ${errorStatus}`,
          errorBody
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
