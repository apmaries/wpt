import { globalPageOpts, handleApiCalls } from "../utils/apiHandler.js";
import { populateDropdown } from "../utils/dropdownHandler.js";

// Function to get all WFM Business Units
async function getWfmBusinessUnits() {
  const businessUnits = await handleApiCalls(
    "WorkforceManagementApi.getWorkforcemanagementBusinessunits"
  );
  console.debug("WPT: getWfmBusinessUnits: businessUnits: ", businessUnits);
  return businessUnits;
}

// get WFM Business Units and populate bu-listbox on page load
getWfmBusinessUnits();
const buListbox = document.getElementById("bu-listbox");
populateDropdown(buListbox, businessUnits);

// Main function to export historical data
