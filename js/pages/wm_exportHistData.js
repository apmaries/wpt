import { globalPageOpts, handleApiCalls } from "../utils/apiHandler.js";
import { populateDropdown } from "../utils/dropdownHandler.js";

// Function to get all WFM Business Units
async function getWfmBusinessUnits() {
  const businessUnits = await handleApiCalls(
    "WorkforceManagementApi.getWorkforcemanagementBusinessunits"
  );
  console.log("WPT: Business Units: ", businessUnits);
  return businessUnits;
}

// get WFM Business Units on page load
getWfmBusinessUnits();

// Main function to export historical data
