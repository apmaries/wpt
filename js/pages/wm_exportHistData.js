import { globalPageOpts, handleApiCalls } from "/wpt/js/utils/apiHandler.js";
import { populateDropdown } from "/wpt/js/utils/dropdownHandler.js";
import { terminal, resetTerminal } from "/wpt/js/utils/terminalHandler.js";
import { enableButtons } from "/wpt/js/utils/pageHandler.js";
import { getRadioValue } from "/wpt/js/utils/jsHelper.js";
import { exportLogs, exportCsv } from "/wpt/js/utils/exportHandler.js";

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

const RP_MODE = { "1": "exact-match", "2": "queue-media", "3": "queue-only" };
// Constants end here

// Functions start here

// Function to get all WFM Business Units
async function getWfmBusinessUnits() {
  const businessUnits = await handleApiCalls(
    "WorkforceManagementApi.getWorkforcemanagementBusinessunits"
  );
  console.log("WPT: getWfmBusinessUnits() = ", businessUnits);
  return businessUnits;
}

// Initialisation function
async function initiate() {
  terminal("INFO", `Initiating program - ${toolName}`);

  // Reset log-level to INFO
  const logRadio = document.getElementsByName("log-level");
  logRadio[1].checked = true;

  // Reset export-end to now
  const endDateRadio = document.getElementsByName("end-date");
  endDateRadio[0].checked = true;

  // Reset route to now
  const rpRadio = document.getElementsByName("route-paths");
  rpRadio[0].checked = true;

  if (testMode) {
    // Production mode - get WFM Business Units and populate bu-listbox on page load
    const businessUnits = await getWfmBusinessUnits();
    populateDropdown(buListbox, businessUnits);
    terminal("INFO", `${businessUnits.length} business units loaded... `);
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
  // Function to get planning groups for a business unit
  async function getWfmPlanningGroups(buId) {
    terminal("INFO", `Getting planning groups for business unit ${buId}...`);
    const planningGroups = await handleApiCalls(
      "WorkforceManagementApi.getWorkforcemanagementBusinessunitPlanninggroups",
      buId
    );
    console.log(`WPT: getWfmPlanningGroups(${buId}) = `, planningGroups);
    return planningGroups;
  }

  // Function to get QSL objects
  async function getQsl() {
    terminal("INFO", `Getting queues, skills and languages...`);
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
    console.log("WPT: getQsl() = ", qsl);
    return qsl;
  }

  // Function to build query predicates from planning groups
  async function buildQueryClause(queueIds) {
    terminal("INFO", `Building query clause...`);
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

    console.log("WPT: queryClause = ", queryClause);
    return queryClause;
  }

  // Function to calculate 7 day interval blocks from given date range
  function calculateDateBlocks(startDate, endDate) {
    terminal("INFO", `Calculating date blocks...`);
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
    console.log("WPT: calculateDateBlocks = ", dateBlocks);
    return dateBlocks;
  }

  // Function to run query for each date block
  async function runQueryForDateBlocks(dateBlocks, queryClause, timeZone) {
    terminal("INFO", `Running queries...`);

    // Function to compare two objects without their data properties
    function compareWithoutData(obj1, obj2) {
      const { data: _, ...obj1WithoutData } = obj1;
      const { data: __, ...obj2WithoutData } = obj2;
      return (
        JSON.stringify(obj1WithoutData) === JSON.stringify(obj2WithoutData)
      );
    }

    const nBlocks = dateBlocks.length;
    const results = [];

    let i = 1;
    for (const block of dateBlocks) {
      terminal(
        "INFO",
        `Running query ${i} of ${nBlocks} for date block: ${block}`
      );
      const requestBody = {
        filter: {
          type: "and",
          clauses: queryClause,
        },
        metrics: ["nOffered", "tHandle"],
        groupBy: [
          "queueId",
          "requestedRoutingSkillId",
          "requestedLanguageId",
          "direction",
        ],
        "granularity": "PT15M",
        "interval": block,
        "flattenMultivaluedDimensions": true,
        "timeZone": timeZone,
      };

      console.log("WPT: runQueryForDateBlocks() requestBody = ", requestBody);
      const response = await handleApiCalls(
        "ConversationsApi.postAnalyticsConversationsAggregatesQuery",
        requestBody
      );
      console.log(
        `WPT: runQueryForDateBlocks() [Run ${i} of ${nBlocks}] response = `,
        response
      );

      // If response is not empty, process it
      if (response && Array.isArray(response)) {
        //terminal("DEBUG", `Query ${i} returned ${response.length} results`);

        response.forEach((responseResult) => {
          // Check if the item is an object and if it's not empty
          if (
            typeof responseResult === "object" &&
            Object.keys(responseResult).length !== 0
          ) {
            // If responseResult is an array
            if (Array.isArray(responseResult)) {
              responseResult.forEach(processResultGrouping);
            }
            // If responseResult is an object
            else {
              responseResult.data.forEach(processResultGrouping);
            }

            function processResultGrouping(resultGrouping) {
              const resultGroup = Array.isArray(responseResult)
                ? resultGrouping.group
                : responseResult.group;
              const resultData = resultGrouping;

              // Check if the resultGroup is already in the results array
              let exists = results.some((item) =>
                compareWithoutData(item, resultGroup)
              );

              // If it doesn't exist, add resultData object to resultGroup and push to results array
              if (!exists) {
                resultGroup.data = [resultData]; // Wrap resultData in an array
                results.push(resultGroup);
              }
              // If it does exist, find the resultGroup in the results array and add resultData object to it
              else {
                results.forEach((item) => {
                  if (compareWithoutData(item, resultGroup)) {
                    item.data = item.data.concat(resultData);
                  }
                });
              }
            }
          }
        });
      }

      // If response is empty, log it and continue
      else {
        terminal("WARNING", `Query ${i} returned no response`);
      }

      i++;
    }

    terminal("INFO", `Query completed for ${nBlocks} date blocks`);

    console.log("WPT: runQueryForDateBlocks() results = ", results);
    return results;
  }

  // Function to process results ready for export
  function processResults(
    results,
    routePaths,
    rpModeValue,
    queues,
    skills,
    languages
  ) {
    terminal("INFO", `Processing results for export...`);
    const filteredData = [];
    const exportData = [];

    results.forEach((result) => {
      const queueId = result.queueId;
      const mediaType = result.mediaType;
      const direction = result.direction;

      // Skill and language are optional
      const languageId = result.requestedLanguageId || "";
      const skillIds = result.requestedRoutingSkillId || "";

      console.log("WPT: processResults() result = ", result);
      console.log(
        `WPT: processResults() result ${queueId}, ${mediaType}, ${direction}, ${languageId}, ${skillIds}`
      );

      // Filter results to match route paths
      if (rpModeValue === "exact-match") {
        // Check if queue, language and skills match exactly to a route path
        const match = routePaths.find(
          (rp) =>
            rp.queue === queueId &&
            rp.mediaType === mediaType &&
            (rp.language === languageId ||
              (rp.language === "" && !languageId)) &&
            (rp.skills === skillIds || (rp.skills === "" && !skillIds))
        );
        if (match) {
          terminal("DEBUG", `Match found for ${JSON.stringify(match)}`);
          filteredData.push(result);
        } else {
          // drop data attribute and log a warning
          delete result.data;
          terminal(
            "WARNING",
            `No matching route path found for ${JSON.stringify(
              result
            )}. These records will be ignored.`
          );
        }
      } else if (rpModeValue === "queue-media") {
        // Check if queue and media type match to a route path
        const match = routePaths.find(
          (rp) => rp.queue === queueId && rp.mediaType === mediaType
        );
        if (match) {
          terminal("DEBUG", `Match found for ${JSON.stringify(match)}`);
          filteredData.push(result);
        }
      } else if (rpModeValue === "queue-only") {
        // Check if queue matches to a route path
        const match = routePaths.find((rp) => rp.queue === queueId);
        if (match) {
          terminal("DEBUG", `Match found for ${JSON.stringify(match)}`);
          filteredData.push(result);
        }
      }
    });

    // Process filtered data
    filteredData.forEach((resultGrouping) => {
      const queueId = resultGrouping.queueId;
      const mediaType = resultGrouping.mediaType;
      const direction = resultGrouping.direction;

      // Skill and language are optional
      const languageId = resultGrouping.requestedLanguageId || "";
      const skillIds = resultGrouping.requestedRoutingSkillId || "";

      const resultData = resultGrouping.data;

      let nOffered;
      let nHandled;
      let tAverHandleTime;
      resultData.forEach((item) => {
        const interval = item.interval.split("/")[0];

        item.metrics.forEach((metric) => {
          // Get offered count
          if (metric.metric === "nOffered") {
            nOffered = metric.stats.count;
          }

          // Get average handle time
          if (metric.metric === "tHandle") {
            nHandled = metric.stats.count;
            tAverHandleTime = metric.stats.sum / metric.stats.count / 1000;
          }
        });

        // Push result to exportData
        exportData.push({
          interval_start: interval,
          queue: queues.find((q) => q.id === queueId).name,
          media_type: mediaType.toUpperCase(),
          direction: direction,
          skills: skillIds
            ? skills
                .filter((s) => skillIds.split(",").includes(s.id))
                .map((s) => s.name)
                .join("|||")
            : "",
          language: (languages.find((l) => l.id === languageId) || { name: "" })
            .name,
          n_offered: nOffered,
          n_handled: nHandled,
          t_aht: tAverHandleTime,
        });
      });
    });

    console.log("WPT: processResults() exportData = ", exportData);
    terminal("INFO", `Processing completed for export`);
    return exportData;
  }

  // Main starts here
  // Update runTime
  runTime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .split(".")[0];
  const fileName = `${toolShortName}_${selectedBuName}_${runTime}`;

  // Add Execution start message to terminal
  const startP = document.createElement("p");
  startP.innerHTML = `---- Execution started at ${runTime} ----`;
  startP.className = "error";
  startP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(startP);

  // Get tool page variables
  const timeZoneRadio = document.getElementsByName("time-zone");
  const endDateRadio = document.getElementsByName("end-date");
  const rpRadio = document.getElementsByName("route-paths");

  const timeZoneMethod = getRadioValue(timeZoneRadio);
  const rpMode = getRadioValue(rpRadio);

  // Get RP_MODE value from rpMode
  const rpModeValue = RP_MODE[rpMode];

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
  terminal("DEBUG", `Route paths matching method = ${rpModeValue}`);

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

  // Build array of route paths from planning groups for later reference in results
  let routePaths = [];
  terminal("INFO", `Found ${planningGroups.length} planning groups for export`);

  let g = 1;
  planningGroups.forEach((group) => {
    terminal(
      "INFO",
      `PG${g}: '${group.name}' has ${group.routePaths.length} route paths`
    );

    let r = 1;
    group.routePaths.forEach((rp) => {
      const q = rp.queue.id;
      const m = rp.mediaType.toLowerCase();
      // language is optional
      const l = rp.language ? rp.language.id : "";

      // skills are optional
      const s = rp.skills ? rp.skills.map((skill) => skill.id).join(",") : "";
      let routePath = { queue: q, mediaType: m, language: l, skills: s };
      routePaths.push(routePath);
      terminal("DEBUG", `RP${r} =  ${JSON.stringify(routePath)}`);

      r++;
    });

    g++;
  });
  console.log("WPT: routePaths = ", routePaths);

  // Get queue ids from planning groups for generating query clause
  const queueIds = planningGroups.flatMap((group) =>
    group.routePaths.map((routePath) => routePath.queue.id)
  );

  // Remove duplicates
  const uniqueQueueIds = [...new Set(queueIds)];

  // Prep for making queries
  const queryClause = await buildQueryClause(uniqueQueueIds);
  terminal(
    "INFO",
    `${uniqueQueueIds.length} unique queue ids targeted for export`
  );

  const dateBlocks = calculateDateBlocks(startDate, endDate);
  terminal(
    "INFO",
    `Generated ${dateBlocks.length} blocks of 7 days for export`
  );

  // Make query for each date block
  const results = await runQueryForDateBlocks(
    dateBlocks,
    queryClause,
    timeZone
  );

  // Get queues, skills and languages
  const qsl = await getQsl();
  const queues = qsl[0];
  const skills = qsl[1];
  const languages = qsl[2];

  // Debug log qsl
  terminal("DEBUG", `Found ${queues.length} queues`);
  terminal("DEBUG", `Found ${skills.length} skills`);
  terminal("DEBUG", `Found ${languages.length} languages`);

  // Process results
  const exportData = processResults(
    results,
    routePaths,
    rpModeValue,
    queues,
    skills,
    languages
  );

  // Export results to csv file
  terminal("INFO", `Exporting data...`);

  sessionStorage.setItem("expHistData", JSON.stringify(exportData));

  exportCsv(exportData, fileName);

  // Add Execution end message to terminal
  const endP = document.createElement("p");
  endP.innerHTML = `---- Execution completed ----`;
  endP.className = "error";
  endP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(endP);

  // Main ends here
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
const endDateRadio = document.getElementsByName("end-date");
endDateRadio.forEach((radio, index) => {
  radio.addEventListener("click", (event) => {
    const datePicker = document.getElementById("dates-end-datepicker");
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

// Event listener for run button
const runButton = document.getElementById("primary-button");
runButton.addEventListener("click", (event) => {
  if (selectedBuId) {
    exportHistoricalData(selectedBuId);
  } else {
    terminal("ERROR", "No business unit selected!");
  }
});

// Event listener for download results button
const resultsButton = document.getElementById("tool-results-button");
resultsButton.addEventListener("click", (event) => {
  const exportData = JSON.parse(sessionStorage.getItem("expHistData"));
  if (!exportData) {
    terminal("ERROR", "No export data found! Please run the export first...");
    return;
  }
  const fileName = `${toolShortName}_${selectedBuName}_${runTime}`;
  exportCsv(exportData, fileName);
});

// Event listeners end here
