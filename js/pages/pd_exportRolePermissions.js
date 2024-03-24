import { globalPageOpts, handleApiCalls } from "/wpt/js/utils/apiHandler.js";
import { populateMultiDropdown } from "/wpt/js/utils/dropdownHandler.js";
import { terminal, resetTerminal } from "/wpt/js/utils/terminalHandler.js";
import {
  enableButtons,
  hidePreviousElement,
} from "/wpt/js/utils/pageHandler.js";
import { getRadioValue } from "/wpt/js/utils/jsHelper.js";
import { exportLogs, exportCsv } from "/wpt/js/utils/exportHandler.js";

let testMode = false;
if (window.origin.includes("127.0.0.1")) {
  testMode = true;
}
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
const toolName = "Export Role Permissions";
const toolShortName = "exportRolePermissions";
const terminalDiv = document.getElementById("terminal");
let runTime = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "_")
  .split(".")[0];

let permissions = [];
const rolesListbox = document.getElementById("roles-listbox");
const domainsListbox = document.getElementById("domains-listbox");

// Constants end here

// Functions start here

// Function to get all permissions
async function getPermissions() {
  const response = await handleApiCalls(
    "AuthorizationApi.getAuthorizationPermissions",
    globalPageOpts
  );
  console.log("WPT: getPermissions() = ", response);

  return response;
}

// Function to get all roles
async function getRoles() {
  const newOptions = {
    ...globalPageOpts,
    sortBy: "name",
    sortOrder: "asc",
  };

  const response = await handleApiCalls(
    "AuthorizationApi.getAuthorizationRoles",
    newOptions
  );
  console.log("WPT: getRoles() = ", response);

  return response;
}

// Initialisation function
async function initiate() {
  terminal("INFO", `Initiating program - ${toolName}`);

  // Reset log-level to INFO
  const logRadio = document.getElementsByName("log-level");
  logRadio[1].checked = true;

  if (!testMode) {
    // Production mode - get supported dialects and populate listbox on page load

    const roles = await getRoles();
    permissions = await getPermissions(); // Permissions is initiated at global scope for later use

    // Get distinct domains from permissions
    const allDomains = permissions.map((entity) => entity.domain);
    const distinctDomains = [...new Set(allDomains)];

    // Populate dropdowns
    populateMultiDropdown(rolesListbox, roles);
    hidePreviousElement("roles-dropdown");
    terminal("INFO", `${roles.length} roles loaded... `);

    populateMultiDropdown(domainsListbox, distinctDomains);
    hidePreviousElement("domains-dropdown");
    terminal("INFO", `${distinctDomains.length} permission domains loaded... `);
  } else {
    console.log(`WPT: ${toolName} in test mode...`);

    // Test mode - populate listbox with dummy data
    const rolesResponse = await fetch("/wpt/.test/data/roles.json");
    const permissionsResponse = await fetch("/wpt/.test/data/permissions.json");

    const roles = await rolesResponse.json();
    permissions = await permissionsResponse.json();

    console.log("WPT: initiate() permissions = ", permissions);

    // Get distinct domains from permissions
    const allDomains = permissions.entities.map((entity) => entity.domain);
    const distinctDomains = [...new Set(allDomains)];

    // Populate dropdowns
    populateMultiDropdown(rolesListbox, roles.entities);
    hidePreviousElement("roles-dropdown");
    terminal("INFO", `${roles.entities.length} roles loaded in test mode... `);

    populateMultiDropdown(domainsListbox, distinctDomains);
    hidePreviousElement("domains-dropdown");
    terminal(
      "INFO",
      `${distinctDomains.length} permission domains loaded in test mode... `
    );
  }
  terminal(
    "INFO",
    `Please apply any filters needed and click 'Run' to start...`
  );
  enableButtons();
  console.log(`WPT: ${toolName} page initiated...`);
}

// Function to export sentiment phrases
async function exportSentimentPhrases() {
  // Main starts here
  // Update runTime
  runTime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .split(".")[0];
  const fileName = `${toolShortName}_${runTime}`;

  // Add Execution start message to terminal
  const startP = document.createElement("p");
  startP.innerHTML = `---- Execution started at ${runTime} ----`;
  startP.className = "error";
  startP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(startP);
  terminal("INFO", `Exporting sentiment phrases...`);

  // Get value of feedback type multi-select dropdown
  const feedbackTypes = feedbackTypesListbox.value
    ? feedbackTypesListbox.value.split(",")
    : [];

  // Get value of dialects multi-select dropdown
  const dialectTypes = dialectTypesListbox.value
    ? dialectTypesListbox.value.split(",")
    : [];

  terminal("DEBUG", `feedbackTypes = ${feedbackTypes}`);
  terminal("DEBUG", `dialects = ${dialectTypes}`);

  // API only allows for single dialect. API call will be made for all dialects and then results will be filtered later
  let exportData;
  if (!testMode) {
    // Get data from /wpt/.test/data/sentimentPhrases.json
    const response = await fetch("/wpt/.test/data/sentimentPhrases.json");
    exportData = await response.json();
    exportData = exportData.entities;
  } else {
    exportData = await handleApiCalls(
      "SpeechTextAnalyticsApi.getSpeechandtextanalyticsSentimentfeedback"
    );
  }

  console.log("WPT: exportSentimentPhrases() = ", exportData);
  if (exportData) {
    terminal("DEBUG", `exportData = ${exportData}`);
    // Function to filter exportData based on feedbackTypes and dialectTypes
    const filteredData = exportData.filter((item) => {
      const feedbackTypeMatch =
        feedbackTypes.length > 0
          ? feedbackTypes.includes(item.feedbackValue.toLowerCase())
          : true;
      const dialectTypeMatch =
        dialectTypes.length > 0 ? dialectTypes.includes(item.dialect) : true;

      return feedbackTypeMatch && dialectTypeMatch;
    });

    if (filteredData.length === 0) {
      terminal(
        "ERROR",
        "No data found for selected filters... Please try again..."
      );
    } else {
      terminal("INFO", `Found ${filteredData.length} phrases to export`);

      // Export results to csv file
      terminal("INFO", `Exporting data...`);

      sessionStorage.setItem("expSentPhrs", JSON.stringify(filteredData));

      exportCsv(filteredData, fileName);
    }

    // Add Execution end message to terminal
    const endP = document.createElement("p");
    endP.innerHTML = `---- Execution completed ----`;
    endP.className = "error";
    endP.style.margin = "1em 0"; // Add a top and bottom margin
    terminalDiv.appendChild(endP);
  } else {
    terminal("ERROR", "Export failed! Please try again...");
  }
}

// Functions end here

// Main

initiate();

// Event listener for terminal reset button
const clearLogsButton = document.getElementById("terminal-reset-button");
clearLogsButton.addEventListener("click", (event) => {
  resetTerminal();
  initiate();
});

// Event listener for terminal download button
const terminalDownloadButton = document.getElementById(
  "terminal-download-button"
);
terminalDownloadButton.addEventListener("click", (event) => {
  const consoleLogs = document.getElementById("terminal").querySelectorAll("p");
  const fileName = `${toolShortName}_${runTime}`;

  exportLogs(consoleLogs, fileName);
});

// Event listener for run button
const runButton = document.getElementById("primary-button");
runButton.addEventListener("click", (event) => {
  exportSentimentPhrases();
});

// Event listener for download results button
const resultsButton = document.getElementById("tool-results-button");
resultsButton.addEventListener("click", (event) => {
  const exportData = JSON.parse(sessionStorage.getItem("expSentPhrs"));
  if (!exportData) {
    terminal("ERROR", "No export data found! Please run the export first...");
    return;
  }
  const fileName = `${toolShortName}_${runTime}`;
  exportCsv(exportData, fileName);
});

// Event listeners end here
