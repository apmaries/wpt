// Debug unhandled promise rejections
window.onunhandledrejection = function (event) {
  console.log(
    "Unhandled Rejection at:",
    event.promise,
    "reason:",
    event.reason
  );
};

// Set up the client
var platformClient = window.require("platformClient");
var client = platformClient.ApiClient.instance;
client.setReturnExtendedResponses(true);

/*
// Set client logging
client.config.logger.log_level = client.config.logger.logLevelEnum.level.LTrace;
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

// Define the API instances in an object
const apiInstances = {}; // Is added to dynamically as calls are made

// Define global options
export const globalPageOpts = {
  "pageSize": 100, // Number | Page size
  "pageNumber": 1, // Number | Page number
};

// Handle errors in API calls
async function handleApiErrors(error, apiFunctionStr) {
  // temp logging
  console.warn("WPT: Error = ", error);

  if (error.body) {
    let errorStatus = error.body.status;
    let errorMessage = error.body.message;
    let errorCode = error.body.code;
    let errorHeaders = error.headers;
    let errorBody = {
      status: errorStatus,
      message: errorMessage,
      errorCode: errorCode,
      errorHeaders: errorHeaders,
    }; // used to log shortened objects in error handling

    // Define rertry variables
    let isRetryable = false; // default to not retryable
    let retryAfter; // default to undefined - exponential backoff will be handled in the catch block

    // Handle 429 rate limit exceeded
    if (errorStatus === 429) {
      isRetryable = true; // set to retryable
      retryAfter = errorHeaders["Retry-After"]; // override default retryAfter, value is seconds
      if (retryAfter) {
        console.warn(
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
      console.warn(
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
}

// Make API calls
export async function handleApiCalls(
  apiFunctionStr, // should be a string e.g. 'usersApi.getUsersMe'
  requestId, // should be a string e.g. '12345'
  requestData // should be an object e.g. { 'pageSize': 100, 'pageNumber': 1 }
) {
  // Split the apiFunctionStr string and get the API instance and function
  const [apiInstanceName, functionName] = apiFunctionStr.split(".");

  // Debug log the API instance and function
  const requestObject = { requestId, requestId, requestData, requestData };
  console.debug(
    `WPT: Making API call to ${apiInstanceName}.${functionName} with data: `,
    requestObject
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

  // Start the retry loop
  while (retryCount < maxRetries) {
    try {
      requestId = requestId || "";
      requestData = requestData || {};
      let currentPage = requestData.pageNumber;

      while (true) {
        // Create a new object with the updated pageNumber
        const updatedRequestData = { ...requestData, pageNumber: currentPage };

        // Make the API call
        const response = await apiFunction(requestId, updatedRequestData);

        // If the response is blank and the API function is 'deleteTokensMe', return a success message
        if (!response && apiFunctionStr === "TokensApi.deleteTokensMe") {
          return { message: "Token deletion successful" };
        }
        const responseBody = response.body;

        console.debug(
          `WPT: ${apiInstanceName}.${functionName} response body: `,
          responseBody
        );

        if (responseBody) {
          if (
            responseBody.pageNumber !== undefined &&
            responseBody.pageCount !== undefined
          ) {
            const pageCount = responseBody.pageCount;
            console.debug(
              `WTP: ${apiInstanceName}.${functionName} has multiple pages to process. Page ${currentPage} of ${pageCount}`
            );

            if (responseBody.entities) {
              allEntities = allEntities.concat(responseBody.entities);
            } else if (responseBody.results) {
              allResults = allResults.concat(responseBody.results);
            }

            if (currentPage >= pageCount) {
              break;
            }

            currentPage = responseBody.pageNumber;
            requestData.pageNumber = currentPage + 1;
            console.debug(
              "WPT: Requesting next page of results. requestData = ",
              requestData
            );
          } else {
            // Return the response body if it is not paginated
            return responseBody;
          }
        } else {
          // Return an empty object if the response body is blank
          console.warn(`WPT: Response body is blank for ${apiFunctionStr}!`);
          return {};
        }
      }

      // Return the entities or results
      if (allEntities.length > 0) {
        return allEntities;
      } else if (allResults.length > 0) {
        return allResults;
      }
    } catch (error) {
      console.error(`WPT: Error making API call to ${apiFunctionStr}!`);

      // Check error using handleApiErrors function
      const { isRetryable, retryAfter } = await handleApiErrors(
        error,
        apiFunctionStr
      );

      // Set the retry delay for retryable errors
      if (isRetryable) {
        if (error.status !== 429) {
          let backoffRetry = retryAfter * 1000 * 3 ** retryCount;
          console.warn(`WPT: Retrying after ${backoffRetry} seconds`);
          setTimeout(
            () => handleApiCalls(apiFunctionStr, requestData),
            backoffRetry
          );
        } else {
          console.warn(`WPT: Retrying after ${retryAfter} seconds`);
          setTimeout(
            () => handleApiCalls(apiFunctionStr, requestData),
            retryAfter * 1000
          );
        }

        // Increment the retry count
        retryCount++;
      } else {
        // Break out of the loop if the error is not retryable
        break;
      }
    }
  }
}
