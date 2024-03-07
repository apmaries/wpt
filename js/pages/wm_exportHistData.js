import { globalPageOpts, handleApiCalls } from "/wpt/js/utils/apiHandler.js";
import { populateDropdown } from "/wpt/js/utils/dropdownHandler.js";
import { terminal, resetTerminal } from "/wpt/js/utils/terminalHandler.js";
import { enableButtons } from "/wpt/js/utils/pageHandler.js";
import { getRadioValue } from "/wpt/js/utils/jsHelper.js";
import { exportLogs } from "/wpt/js/utils/exportHandler.js";

// Function to catch any error and log to terminal
window.onerror = function (message, source, lineno, colno, error) {
  terminal(
    "ERROR",
    `Page Error! Please send this back to the WPT team via email link in footer...`
  );
  terminal("ERROR", `Message: ${message}`);
  terminal("ERROR", `Source: ${source}`);
  terminal("ERROR", `Line: ${lineno}`);
};

// Constants start here
const toolName = "WFM Export Historical Data";
const toolShortName = "exportHistData";
const terminalDiv = document.getElementById("terminal");
let runTime = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "_")
  .split(".")[0];

// Constants end here

// Functions start here
// Function to get all WFM Business Units
async function getWfmBusinessUnits() {
  const businessUnits = await handleApiCalls(
    "WorkforceManagementApi.getWorkforcemanagementBusinessunits"
  );
  console.debug("WPT: getWfmBusinessUnits: businessUnits: ", businessUnits);
  return businessUnits;
}

// Populate the business unit dropdown on script load
async function initiate() {
  terminal("INFO", `Initiating program - ${toolName}`);
  if (!window.origin.includes("127.0.0.1")) {
    // Production mode - get WFM Business Units and populate bu-listbox on page load
    const businessUnits = await getWfmBusinessUnits();
    populateDropdown(buListbox, businessUnits.entities);
    terminal(
      "INFO",
      `${businessUnits.entities.length} business units loaded... `
    );
  } else {
    console.log(`WPT: ${toolName} in test mode...`);

    // Test mode - populate bu-listbox with dummy data from /.test/data/businessUnits.json
    const response = await fetch("/wpt/.test/data/businessUnits.json");
    const businessUnits = await response.json();
    populateDropdown(buListbox, businessUnits.entities);
    terminal(
      "INFO",
      `${businessUnits.entities.length} business units loaded in test mode...`
    );
  }
  terminal("INFO", "Please select a business unit to export historical data");
  enableButtons();
}

// Function to get planning groups for a business unit
async function getWfmPlanningGroups(buId) {}

// Main function to export historical data
async function exportHistoricalData() {
  // Update runTime
  runTime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .split(".")[0];
  const fileName = `${toolShortName}_${selectedBuName}_${runTime}.csv`;

  // Add Execution start message to terminal
  const startP = document.createElement("p");
  startP.innerHTML = `---- Execution started at ${runTime} ----`;
  startP.className = "error";
  startP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(startP);

  // Get tool page variables
  const timeZoneRadio = document.getElementsByName("time-zone");
  const timeZone = getRadioValue(timeZoneRadio);

  // Debug log tool variables
  terminal("DEBUG", `BU = ${selectedBuName} (${selectedBuId})`);
  terminal("DEBUG", `Run time = ${runTime}`);
  terminal("DEBUG", `Time zone method = ${timeZone}`);

  if (timeZone === "business-unit") {
    // Get business unit time zone
    console.log("WPT: Getting business unit time zone");
    const selectedBuDetails = await handleApiCalls(
      `WorkforceManagementApi.getWorkforcemanagementBusinessunit`,
      selectedBuId
    );
    const buTimeZone = selectedBuDetails.settings.timeZone;
    terminal("DEBUG", `Business unit time zone = ${buTimeZone}`);
  }

  // Add Execution end message to terminal
  const endP = document.createElement("p");
  endP.innerHTML = `---- Execution completed ----`;
  endP.className = "error";
  endP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(endP);
}

// Functions end here

// Initiate the page
const buListbox = document.getElementById("dropdown-listbox");
initiate();

// Event listeners start here

// Event listener for bu-listbox
let selectedBuId;
let selectedBuName;
buListbox.addEventListener("change", (event) => {
  selectedBuId = event.target.value;

  // Get the selected gux-option's innerHTML
  var selectedOption = Array.from(
    buListbox.querySelectorAll("gux-option")
  ).find((option) => option.value === selectedBuId);
  selectedBuName = selectedOption ? selectedOption.innerHTML : "";

  // Remove <!----> if found in selectedBuName
  selectedBuName = selectedBuName.replace(/<!---->/g, "");

  terminal(
    "INFO",
    `Selected business unit: ${selectedBuName} (${selectedBuId})`
  );
});

// Event listener for reset button
const clearLogsButton = document.getElementById("reset-button");
clearLogsButton.addEventListener("click", (event) => {
  resetTerminal();
  initiate();
});

// Event listener for download button
const downloadButton = document.getElementById("download-button");
downloadButton.addEventListener("click", (event) => {
  const consoleLogs = document.getElementById("terminal").querySelectorAll("p");
  const fileName = `${toolShortName}_${
    selectedBuName ? selectedBuName + "_" : ""
  }${runTime}`;

  exportLogs(consoleLogs, fileName);
});

// Event listener for export button
const exportButton = document.getElementById("primary-button");
exportButton.addEventListener("click", (event) => {
  if (selectedBuId) {
    exportHistoricalData(selectedBuId);
  } else {
    terminal("ERROR", "No business unit selected!");
  }
});

// Event listeners end here
