import { globalPageOpts, handleApiCalls } from "/wpt/js/utils/apiHandler.js";
import { populateDropdown } from "/wpt/js/utils/dropdownHandler.js";
import { terminal } from "/wpt/js/utils/terminalHandler.js";

// Function to get all WFM Business Units
async function getWfmBusinessUnits() {
  const businessUnits = await handleApiCalls(
    "WorkforceManagementApi.getWorkforcemanagementBusinessunits"
  );
  console.debug("WPT: getWfmBusinessUnits: businessUnits: ", businessUnits);
  return businessUnits;
}

terminal("INFO", "Export historical data page loaded...");

const buListbox = document.getElementById("dropdown-listbox");
if (!window.origin.includes("127.0.0.1")) {
  // get WFM Business Units and populate bu-listbox on page load
  const businessUnits = getWfmBusinessUnits();
  populateDropdown(buListbox, businessUnits.entities);

  // Main function to export historical data
} else {
  console.log("WPT: Export historical data in test mode...");

  // Test mode - populate bu-listbox with dummy data from /.test/data/businessUnits.json
  const response = await fetch("/wpt/.test/data/businessUnits.json");
  const businessUnits = await response.json();
  populateDropdown(buListbox, businessUnits.entities);
  terminal(
    "INFO",
    `${businessUnits.entities.length} business units loaded in test mode...`
  );
}
