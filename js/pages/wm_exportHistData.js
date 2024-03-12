import { globalPageOpts, handleApiCalls } from "/wpt/js/utils/apiHandler.js";
import { populateDropdown } from "/wpt/js/utils/dropdownHandler.js";
import { terminal, resetTerminal } from "/wpt/js/utils/terminalHandler.js";
import { enableButtons } from "/wpt/js/utils/pageHandler.js";
import { getRadioValue } from "/wpt/js/utils/jsHelper.js";
import { exportLogs } from "/wpt/js/utils/exportHandler.js";

let testMode = false;
if (!window.origin.includes("127.0.0.1")) {
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
  console.debug("WPT: getWfmBusinessUnits() = ", businessUnits);
  return businessUnits;
}

// Function to get QSL objects
async function getQsl() {
  const queuesPromise = handleApiCalls(
    "RoutingApi.getRoutingQueues",
    globalPageOpts
  );
  const skillsPromise = handleApiCalls(
    "RoutingApi.getRoutingSkills",
    globalPageOpts
  );
  const languagesPromise = handleApiCalls(
    "RoutingApi.getRoutingLanguages",
    globalPageOpts
  );

  const qsl = await Promise.all([
    queuesPromise,
    skillsPromise,
    languagesPromise,
  ]);
  console.debug("WPT: getQsl() = ", qsl);
  return qsl;
}

// Function to get planning groups for a business unit
async function getWfmPlanningGroups(buId) {
  const planningGroups = await handleApiCalls(
    "WorkforceManagementApi.getWorkforcemanagementBusinessunitPlanninggroups",
    buId
  );
  console.debug(`WPT: getWfmPlanningGroups(${buId}) = `, planningGroups);
  return planningGroups;
}

// Function to build query predicates from planning groups
async function buildQueryClause(queueIds) {
  let predicatesArray = [];
  let queryClause = [{ type: "or", predicates: predicatesArray }];

  queueIds.forEach((queueId) => {
    const predicate = {
      type: "dimension",
      dimension: "queueId",
      operator: "matches",
      value: queueId,
    };
    predicatesArray.push(predicate);
  });

  console.debug("WPT: queryClause = ", queryClause);
  return queryClause;
}

// Function to calculate 7 day interval blocks from given date range
function calculateDateBlocks(startDate, endDate) {
  const dateBlocks = [];
  let start = new Date(startDate);
  const end = new Date(endDate);

  while (start < end) {
    let intervalEnd = new Date(start);
    intervalEnd.setDate(intervalEnd.getDate() + 7);
    if (intervalEnd > end) {
      intervalEnd = end;
    }

    const intervalString = `${start.toISOString().split("T")[0]}/${
      intervalEnd.toISOString().split("T")[0]
    }`;
    dateBlocks.push(intervalString);

    start = intervalEnd;
  }

  return dateBlocks;
}

// Initialisation function
async function initiate() {
  terminal("INFO", `Initiating program - ${toolName}`);

  // Reset log-level to INFO
  const logRadio = document.getElementsByName("log-level");
  logRadio[1].checked = true;

  // Reset export-end to now
  const endDateRadio = document.getElementsByName("export-end");
  endDateRadio[0].checked = true;

  // Reset route to now
  const rpRadio = document.getElementsByName("route-paths");
  rpRadio[0].checked = true;

  if (testMode) {
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
  console.log("WPT: Export historical data page initiated...");
}

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
  const endDateRadio = document.getElementsByName("export-end");
  const rpRadio = document.getElementsByName("route-paths");

  const timeZoneMethod = getRadioValue(timeZoneRadio);
  const rpMode = getRadioValue(rpRadio);

  let startDate = document.getElementById("dates-start-datepicker").value;
  // Append 'Z' to the date string to denote it's in UTC
  startDate = new Date(`${startDate}Z`);
  startDate.setUTCHours(0, 0, 0, 0);
  // Format date as yyyy-mm-ddThh:mm:ss
  startDate = startDate.toISOString().split(".")[0];

  const endDateMode = getRadioValue(endDateRadio);
  let endDate;
  if (endDateMode === "user-defined-value") {
    endDate = document.getElementById("dates-end-datepicker").value;
  } else {
    // Get current date
    let now = new Date();
    now.setUTCHours(0, 0, 0, 0);
    endDate = now.toISOString().split(".")[0];
  }

  // Debug log tool variables
  terminal("DEBUG", `BU = ${selectedBuName} (${selectedBuId})`);
  terminal("DEBUG", `Run time = ${runTime}`);
  terminal("DEBUG", `Time zone method = ${timeZoneMethod}`);
  terminal("DEBUG", `Start date = ${startDate}`);
  terminal("DEBUG", `End date mode = ${endDateMode}`);
  terminal("DEBUG", `End date = ${endDate}`);
  terminal("DEBUG", `Route paths mode = ${rpMode}`);

  let timeZone = "UTC"; // Default for testing
  if (timeZoneMethod === "business-unit") {
    try {
      // Get business unit time zone
      console.log("WPT: Getting business unit time zone");
      const requestData = { expand: ["settings.timeZone"] };
      const selectedBuDetails = await handleApiCalls(
        `WorkforceManagementApi.getWorkforcemanagementBusinessunit`,
        selectedBuId,
        requestData
      );
      timeZone = selectedBuDetails.settings.timeZone;
    } catch (error) {
      terminal("ERROR", `Error getting business unit time zone: ${error}`);
      terminal("INFO", "Defaulting to UTC time zone...");
    }

    // Don't need to muck around with datetimes - can just pass the time zone to the API
  } else {
    timeZone = "UTC";
  }
  terminal("DEBUG", `Time zone = ${timeZone}`);

  // Get planning groups for the selected business unit

  const planningGroups = await getWfmPlanningGroups(selectedBuId);

  console.log("WPT: Planning Groups = ", planningGroups.entities);
  terminal(
    "INFO",
    `Found ${planningGroups.entities.length} planning groups for export`
  );
  planningGroups.entities.forEach((group) => {
    terminal(
      "INFO",
      `Planning group: ${group.name} with ${group.routePaths.length} route paths`
    );
    terminal("DEBUG", `Route paths = `, group.routePaths);
  });

  // Get queue ids from planning groups
  const queueIds = planningGroups.entities.flatMap((group) =>
    group.routePaths.map((routePath) => routePath.queue.id)
  );

  // Remove duplicates
  const uniqueQueueIds = [...new Set(queueIds)];

  terminal(
    "INFO",
    `Found ${uniqueQueueIds.length} unique queue ids for export`
  );

  const queryClause = await buildQueryClause(queueIds);
  const dateBlocks = calculateDateBlocks(startDate, endDate);
  console.log("WPT: Date blocks = ", dateBlocks);

  // Get queues, skills and languages
  const qsl = await getQsl();
  const queues = qsl[0];
  const skills = qsl[1];
  const languages = qsl[2];

  // Debug log qsl
  terminal("DEBUG", `Found ${queues.length} queues`);
  terminal("DEBUG", `Found ${skills.length} skills`);
  terminal("DEBUG", `Found ${languages.length} languages`);

  // Export results to csv file

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

// Event listener for end date radio buttons
const endDateRadio = document.getElementsByName("export-end");
endDateRadio.forEach((radio, index) => {
  radio.addEventListener("click", (event) => {
    const datePicker = document.getElementById("export-end-datepicker");
    const radioValue = getRadioValue(endDateRadio);
    if (radioValue === radio.value) {
      if (index === 0) {
        datePicker.setAttribute("disabled", true);
      } else if (index === 1) {
        datePicker.removeAttribute("disabled");
      }
    }
  });
});

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
