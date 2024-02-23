import { makeApiCallWithRetry } from "./makeApiCall.js";

// set some global variables
const test = false;
const environment = sessionStorage.getItem("environment");

const exportStorage = "wmExpHistData";
const wfmBuStorage = "wfmBuList";

let predicatesArray = [];

// start of functions
// function to handle dropdown change event
function getSelectedBu() {
  // get the selected dropdown element
  var dropdown = document.getElementById("bu-dropdown");

  // get the selected listbox element
  var listbox = dropdown.querySelector("#bu-listbox");

  let userSelectedBuValue;
  try {
    if (listbox && listbox.value !== undefined) {
      userSelectedBuValue = listbox.value;
    } else {
      throw new Error(
        "No BU has been selected. Please set a BU and try again :)"
      );
    }
  } catch (error) {
    terminal(error, "ERROR");
  }

  // split the selected value into two parts based on the presence of ";"

  if (userSelectedBuValue !== undefined) {
    var parts = userSelectedBuValue.split(";");
    if (parts.length > 3) {
      terminal(
        "Selected BU has ';' in it's name... this is a problem! See Andy to fix up code base",
        "ERROR"
      );
      throw new Error("Fatal error");
    } else {
      var bu_name = parts[0];
      var bu_id = parts[1];
      var bu_offset = parts[2];

      var selectedBu = {
        "name": bu_name,
        "id": bu_id,
        "offset": bu_offset,
      };

      return selectedBu;
    }
  }
}

// function to handle radio button change event
function getSelectedDate() {
  // get the selected dropdown's value
  var selectedValue = document.getElementById("export-start").value;
  return selectedValue;
}

// function to return BU data
async function getBuData(allBuData, nBu) {
  const buArray = [];
  // set progress max
  let radialProgress = document.getElementById("radial-progress");
  let progressValue = 0;
  radialProgress.setAttribute("max", nBu.toString());

  // get all time zone
  let allTzData = await makeApiCallWithRetry(
    `/api/v2/timezones?pageSize=1000&pageNumber=1`,
    "GET"
  ); // using 1 page of 1,000 to speed things up :)

  // get individual BU settings
  terminal(`Searching BU time zone settings`, "DEBUG");
  for (let b = 0; b < allBuData.length; b++) {
    progressValue++;
    let businessUnitId = allBuData[b].id;
    let businessUnitName = allBuData[b].name;

    let buData = await makeApiCallWithRetry(
      `/api/v2/workforcemanagement/businessunits/${businessUnitId}?expand=settings.timeZone`,
      "GET"
    );

    // increment progress
    radialProgress.setAttribute("value", progressValue);

    let businessUnitTimeZone = buData.settings.timeZone;
    let timezoneOffset = allTzData.find((tz) => tz.id === businessUnitTimeZone);
    let businessUnitTimeZoneOffset = timezoneOffset.offset;

    let bu = {
      "name": businessUnitName,
      "id": businessUnitId,
      "timeZone": businessUnitTimeZone,
      "offset": businessUnitTimeZoneOffset,
    };
    terminal(`${JSON.stringify(bu)}`, "DEBUG");
    buArray.push(bu);
  }

  // set session storage
  sessionStorage.setItem(wfmBuStorage, JSON.stringify(buArray));
  return buArray;
}

function enableButtons() {
  // get data complete, enable buttons on page
  terminal(`Ready!`, "INFO");
  document.getElementById("clear-button").removeAttribute("disabled");
  document.getElementById("export-log-button").removeAttribute("disabled");
  document.getElementById("export-data-button").removeAttribute("disabled");
  const loadingMessageElement = document.getElementById("loading-message");
  loadingMessageElement.style.display = "none";
  document.getElementById("file-div").removeAttribute("hidden");
}

function populateBuSelect(buData) {
  var listbox = document.getElementById("bu-listbox");

  // Sort the buData array alphabetically based on bu_name
  buData.sort((a, b) => a.name.localeCompare(b.name));

  for (var i = 0; i < buData.length; i++) {
    var newEntry = document.createElement("gux-option");

    const bu_name = buData[i].name;
    const bu_id = buData[i].id;
    const bu_offset = buData[i].offset;

    newEntry.value = `${bu_name};${bu_id};${bu_offset}`;
    newEntry.textContent = bu_name;

    listbox.appendChild(newEntry);
  }
}

// page load
async function pageLoad() {
  let buData;

  terminal(`Export Historical Data`, "INFO");
  terminal(`Getting WFM Business Unit data`, "INFO");

  let allBuData = await makeApiCallWithRetry(
    `/api/v2/workforcemanagement/businessunits`,
    "GET"
  );

  let buCount = allBuData.length;
  terminal(`Found ${buCount} Business Units in WFM`, "INFO");

  let wfmBuList = JSON.parse(sessionStorage.getItem(wfmBuStorage));
  try {
    if (wfmBuList.length === buCount) {
      terminal(`${buCount} Business Units already in memory`, "INFO");
      buData = wfmBuList;
      enableButtons();
      populateBuSelect(buData);
    } else {
      terminal(
        "Business Units already in memory, but something doesn't look right. Refreshing...",
        "INFO"
      );
      await getBuData(allBuData, buCount)
        .then((data) => {
          buData = data;
        })
        .catch((error) => {
          terminal(error, "ERROR");
        });
      enableButtons();
      populateBuSelect(buData);
    }
  } catch (error) {
    if (error != "TypeError: wfmBuList is null") {
      terminal(error, "ERROR");
    }
    terminal("Getting Business Unit details...", "INFO");
    await getBuData(allBuData, buCount)
      .then((data) => {
        buData = data;
      })
      .catch((error) => {
        terminal(error, "ERROR");
      });
    enableButtons();
    populateBuSelect(buData);
  }
  return buData;
}

// function to build query predicates
async function buildPredicates(rpArray) {
  for (let i = 0; i < rpArray.length; i++) {
    let rp = rpArray[i];
    terminal(`Processing route path ${i + 1}`, "DEBUG");

    try {
      var predicate = [
        {
          "dimension": "queueId",
          "value": rp.queue,
        },
        {
          "dimension": "mediaType",
          "value": rp.mediaType,
        },
        {
          "dimension": "direction",
          "value": "inbound",
        },
      ];

      // language is optional
      if ("language" in rp) {
        predicate.push({
          "dimension": "requestedLanguageId",
          "value": rp.language,
        });
      }

      // skills are optional
      if ("skills" in rp) {
        let skills = rp.skills;
        for (let s = 0; s < skills.length; s++) {
          let skill = skills[s];
          predicate.push({
            "dimension": "requestedRoutingSkillId",
            "value": skill,
          });
        }
      }
    } catch (error) {
      terminal(error, "ERROR");
    }

    terminal(JSON.stringify(predicate), "DEBUG");
    predicatesArray.push(predicate);
  }
}

// function to return PG data
async function getBuPgs(bu_id) {
  let allPgData = await makeApiCallWithRetry(
    `/api/v2/workforcemanagement/businessunits/${bu_id}/planninggroups`,
    "GET"
  );

  // loop through PG's
  terminal(`${allPgData.length} Planning Groups returned`, "INFO");
  for (let p = 0; p < allPgData.length; p++) {
    var pgName = allPgData[p].name;
    var pgRoutePaths = allPgData[p].routePaths;
    terminal(`PG${p}: Getting route paths for '${pgName}'`, "INFO");

    // to get route paths
    terminal(
      `PG${p}: ${pgRoutePaths.length} route paths in '${pgName}'`,
      "INFO"
    );
    let pgRpArray = [];

    for (let r = 0; r < pgRoutePaths.length; r++) {
      let routePath = pgRoutePaths[r];
      const rpQueue = routePath.queue.id;
      const rpMediaType = routePath.mediaType;

      // initate rp entry to rpArray
      const rp = {
        queue: rpQueue,
        mediaType: rpMediaType,
      };

      // language is optional
      if ("language" in routePath) {
        const rpLanguage = routePath.language.id;
        rp.language = rpLanguage;
      }

      // skill set is optional and can have multiples
      if ("skills" in routePath) {
        let skills = routePath.skills;
        const skillsArray = [];
        for (let s = 0; s < skills.length; s++) {
          var skillId = skills[s].id;
          skillsArray.push(skillId);
        }
        rp.skills = skillsArray;
      }

      terminal(JSON.stringify(rp), "DEBUG");
      pgRpArray.push(rp);
    }

    buildPredicates(pgRpArray);
  }
  terminal(`All Planning Groups processed.`, "INFO");
}

// function to calculate date range
async function calculate7DayBlocks(startDate, offsetInMinutes) {
  terminal(`BU offset = ${offsetInMinutes}`, "DEBUG");

  // Parse the start date into a Date object and set the time to midnight
  const startDateObj = new Date(startDate);
  startDateObj.setHours(0, 0, 0, 0);

  // Get the current date and time
  const currentDate = new Date();

  // Apply the offset in milliseconds
  const offsetInMillis = offsetInMinutes * 60 * 1000;
  startDateObj.setTime(startDateObj.getTime() + offsetInMillis * -1);
  currentDate.setTime(currentDate.getTime() + offsetInMillis * -1);

  terminal(`Offset start date = ${startDateObj}`, "DEBUG");
  terminal(`Offset end date = ${currentDate}`, "DEBUG");

  // Calculate the number of 7-day blocks
  const dayDifference = Math.floor(
    (currentDate - startDateObj) / (24 * 60 * 60 * 1000)
  );
  const numberOfBlocks = Math.ceil(dayDifference / 7);

  // Create an array to store the 7-day blocks
  const blocksArray = [];

  // Calculate start and end dates for each 7-day block
  for (let i = 0; i < numberOfBlocks; i++) {
    const blockStartDate = new Date(
      startDateObj.getTime() + i * 7 * 24 * 60 * 60 * 1000
    );

    // Calculate blockEndDate differently for the last block
    let blockEndDate;
    if (i === numberOfBlocks - 1) {
      // Last block, set end date to 1 millisecond before currentDate
      blockEndDate = new Date(currentDate.getTime() - 1);
    } else {
      // For other blocks, set end date to 7 days after start date
      blockEndDate = new Date(
        blockStartDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1
      );
    }

    var blockISOStart = blockStartDate.toISOString();
    var blockISOEnd = blockEndDate.toISOString();
    var blockStr = `${blockISOStart}/${blockISOEnd}`;
    terminal(`Adding date chunk ${blockStr}`, "DEBUG");

    blocksArray.push(blockStr);
  }

  return blocksArray;
}

// function to run queries
async function runQuery(predicates, interval) {
  terminal(`Building query clauses`, "DEBUG");
  let clauseArray = [];
  for (let p = 0; p < predicates.length; p++) {
    let predicate = predicates[p];
    let clause = { "type": "and", "predicates": predicate };
    clauseArray.push(clause);
  }
  terminal(`Query clauses complete`, "DEBUG");

  // build the query body
  const queryBody = {
    "interval": interval,
    "granularity": "PT15M",
    "groupBy": [
      "queueId",
      "requestedRoutingSkillId",
      "requestedLanguageId",
      "direction",
    ],
    "filter": { "type": "or", "clauses": clauseArray },
    "metrics": ["nOffered", "tHandle", "tAnswered"],
    "flattenMultivaluedDimensions": true,
  };

  // run the query
  let runResults = await makeApiCallWithRetry(
    `/api/v2/analytics/conversations/aggregates/query`,
    "POST",
    queryBody
  );

  // ignore results if return type is string
  if (typeof runResults === "string") {
    terminal(runResults, "WARNING");
  }

  return runResults;
}

// function to get queue, skill & language names
async function getQueueSkillLangNames() {
  // function to return only name and id from an array of objects
  function getNameIdArray(data) {
    return data.map((item) => {
      return {
        "name": item.name,
        "id": item.id,
      };
    });
  }

  // define an object to store all the queue, skill & languages
  let queueSkillLangData = {};

  // get queue, skill & language data
  let queues = await makeApiCallWithRetry(`/api/v2/routing/queues`, "GET");
  let skills = await makeApiCallWithRetry(`/api/v2/routing/skills`, "GET");
  let languages = await makeApiCallWithRetry(`/api/v2/routing/languages`, "GET");

  // get only name and id from the data
  queues = getNameIdArray(queues);
  skills = getNameIdArray(skills);
  languages = getNameIdArray(languages);

  // attach queue, skill & languages to the object
  queueSkillLangData.queues = queues;
  queueSkillLangData.skills = skills;
  queueSkillLangData.languages = languages;

  terminal(`Queue, Skill & Language data returned`, "INFO");
  console.log(`WPT: Queues, skills & languages data:`, queueSkillLangData);
  return queueSkillLangData;
}

// function to export data to CSV
async function prepExport(results, qsl) {
  // initate the export object
  let exportData = [];

  // loop through the data
  for (let i = 0; i < results.length; i++) {
    // array of results

    const iDataGrouping = results[i];

    for (let j = 0; j < iDataGrouping.length; j++) {
      // result object in array

      const jDataGrouping = iDataGrouping[j];
      const group = jDataGrouping.group;
      const data = jDataGrouping.data;

      // process group details
      // get queue name
      if ("queueId" in group) {
        const queueName = qsl.queues.find((q) => q.id === group.queueId)?.name;
        if (!queueName) {
          throw new Error(`Queue name not found for queueId: ${group.queueId}`);
        }
        group.queueName = queueName;
      }

      // get skill name(s)
      if ("requestedRoutingSkillId" in group) {
        const skillIds = group.requestedRoutingSkillId.split(",");
        const skillNames = skillIds.map((id) => {
          const skill = qsl.skills.find((s) => s.id === id.trim())?.name;
          if (!skill) {
            throw new Error(`Skill name not found for skillId: ${id.trim()}`);
          }
          return skill;
        });
        group.skillName = skillNames.join(", ");
      } else {
        group.skillName = "";
      }

      // get language name
      if ("requestedLanguageId" in group) {
        const languageName = qsl.languages.find(
          (l) => l.id === group.requestedLanguageId
        )?.name;
        if (!languageName) {
          throw new Error(
            `Language name not found for languageId: ${group.requestedLanguageId}`
          );
        }
        group.languageName = languageName;
      } else {
        group.languageName = "";
      }

      // process data details
      for (let k = 0; k < data.length; k++) {
        // data object in result object
        const interval = data[k];
        const metrics = interval.metrics;

        // initiate the export entry
        const exportRow = {};

        // get interval start by splitting interval.interval on "/"
        exportRow.intervalStart = interval.interval.split("/")[0];

        // add group names
        exportRow.queueName = group.queueName;
        exportRow.mediaType = group.mediaType;
        exportRow.skillSet = group.skillName;
        exportRow.languageName = group.languageName;

        for (let l = 0; l < metrics.length; l++) {
          // metrics array within data object
          const metric = metrics[l];

          // process metrics to export row
          exportRow.nOffered =
            metric.metric === "nOffered"
              ? metric.stats.count
              : exportRow.nOffered;
          exportRow.nHandled =
            metric.metric === "tHandle"
              ? metric.stats.count
              : exportRow.nHandled;
          exportRow.tHandle =
            metric.metric === "tHandle"
              ? metric.stats.sum / 1000 / metric.stats.count
              : exportRow.tHandle;
        }

        //console.log(interval);
        terminal(`Export row: ${JSON.stringify(exportRow)}`, "DEBUG");
        exportData.push(exportRow);
      }
    }
  }

  terminal(`Export data has ${exportData.length} records`, "INFO");
  return exportData;
}

// function to export data to CSV
async function exportToCsv(data, buName) {
  // set column headers for the CSV
  const csvColumnHeaders = [
    "Interval Start UTC Date",
    "Queue",
    "Media Type",
    "Skill Set",
    "Language",
    "Offered",
    "Interactions Handled",
    "Total Handle Time",
  ];

  // create the CSV data
  let csvData = [];
  csvData.push(csvColumnHeaders);
  for (let i = 0; i < data.length; i++) {
    let row = data[i];
    let csvRow = [];
    csvRow.push(row.intervalStart);
    csvRow.push(row.queueName);
    csvRow.push(row.mediaType);
    csvRow.push(row.skillName);
    csvRow.push(row.languageName);
    csvRow.push(row.nOffered);
    csvRow.push(row.nHandled);
    csvRow.push(row.tHandle);
    csvData.push(csvRow);
  }

  // convert the CSV data array to CSV string
  let csvString = csvData.map((row) => row.join(",")).join("\n");

  // create a Blob from the CSV string
  let csvBlob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });

  // create a URL from the Blob
  let csvUrl = URL.createObjectURL(csvBlob);

  // create a hidden link and use it to initiate the download
  let hiddenLink = document.createElement("a");
  hiddenLink.href = csvUrl;
  hiddenLink.download = `exportHistoricalData_${buName}.csv`;
  hiddenLink.style.display = "none";
  document.body.appendChild(hiddenLink);
  hiddenLink.click();
  document.body.removeChild(hiddenLink);
}

// end of functions

// start of main function
// export data
export async function exportData() {
  // get variables
  try {
    var selectedBu = getSelectedBu();
    var startDateStr = getSelectedDate();
  } catch (error) {
    terminal(error, "ERROR");
  }

  const buName = selectedBu.name;
  const buId = selectedBu.id;
  const buOffset = selectedBu.offset;

  // start terminal
  terminal(`Starting data export for ${buName} from ${startDateStr}`, "INFO");
  terminal(JSON.stringify(selectedBu), "DEBUG");

  // get user selected Business Unit's Planning Groups
  terminal("Getting BU Planning Groups", "INFO");
  await getBuPgs(buId);
  terminal(`Predicates array has ${predicatesArray.length} records`, "INFO");

  // get the date range
  terminal(`Creating reporting intervals from ${startDateStr}`, "INFO");
  let blocks = await calculate7DayBlocks(startDateStr, buOffset);
  let nQueries = blocks.length;
  try {
    if (blocks && nQueries > 0) {
      terminal(`${nQueries} chunks of 7 days to return`, "INFO");
    } else {
      throw new Error(
        `Something has gone wrong with creating date range chunks. Run again in DEBUG mode and send Andy the logs :)`
      );
    }
  } catch (error) {
    terminal(error, "ERROR");
  }

  // run the queries
  terminal(`Executing ${nQueries} queries`, "INFO");
  let data = [];
  for (let r = 0; r < nQueries; r++) {
    let block = blocks[r];
    terminal(`Processing query ${r + 1} for interval ${block}`, "INFO");
    const runResults = await runQuery(predicatesArray, block);
    try {
      if (runResults && runResults.length > 0) {
        data.push(runResults);
      } else if (Object.keys(runResults).length === 0) {
        terminal(`No results found for interval ${block}`, "WARNING");
      } else {
        terminal(`Something isn't right?`, "ERROR");
        terminal(JSON.stringify(runResults), "WARNING");
      }
    } catch (error) {
      terminal(error, "ERROR");
    }
    terminal(`Query ${r + 1} complete`, "INFO");
  }
  terminal(`Data to export has ${data.length} records`, "INFO");

  // get queue, skill & language names
  terminal(`Getting queue, skill & language names`, "INFO");
  let qslArray = await getQueueSkillLangNames();

  // prep data for export
  terminal("Prepping data for export", "INFO");
  var exportData = await prepExport(data, qslArray);

  // export the data to csv
  terminal(`Exporting data to CSV`, "INFO");
  await exportToCsv(exportData, buName);
}
// end of main function

// load page
let buData = await pageLoad();

// Create a new Date object for today
var currentDate = new Date();

// Calculate the most recent Monday
var dayOfWeek = currentDate.getDay(); // Sunday is 0, Monday is 1, ..., Saturday is 6
var difference = (dayOfWeek - 1 + 7) % 7; // Calculate the difference to Monday
var recentMonday = new Date(currentDate);
recentMonday.setDate(currentDate.getDate() - difference);

// Function to format the date as "YYYY-MM-DD" string
function formatDate(date) {
  var year = date.getFullYear();
  var month = (date.getMonth() + 1).toString().padStart(2, "0"); // Months are zero-based, so add 1
  var day = date.getDate().toString().padStart(2, "0");

  return year + "-" + month + "-" + day;
}

// Format the most recent Monday
var formattedRecentMonday = formatDate(recentMonday);
document
  .getElementById("export-start")
  .setAttribute("value", formattedRecentMonday);

/*// attach the getResolveMethod function to the change event of radio buttons
var radioButtons = document.querySelectorAll('input[name="resolve-method"]');
radioButtons.forEach(function (radioButton) {
  radioButton.addEventListener("change", getResolveMethod);
});*/
