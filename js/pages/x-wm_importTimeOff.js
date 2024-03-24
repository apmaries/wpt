import { convertH2M, toHoursAndMinutes } from "./jsHelper.js";
import { makeApiCallWithRetry } from "./makeApiCall.js";

// set some global variables
const test = false;
const environment = sessionStorage.getItem("environment");

const importStorage = "wmImpTorData";
const ignoredStorage = "wmImpTorIgnored";
const wfmBuStorage = "wfmBuList";

// function to create date array
function getDateArray(start, end, time, duration, offset) {
  var arr = [];
  let tzStartString;
  let tzEndString;

  if (time === "") {
    // full day
    tzStartString = `${start}`;
    tzEndString = `${end}`;
  } else {
    // part day
    // start datetime
    let startString = `${start} ${time}`;
    tzStartString = `${startString}+${toHoursAndMinutes(offset)}`;

    // convert time to minutes
    var a = time.split(":"); // split it at the colons
    var minutes = +a[0] * 60 + +a[1];

    // end datetime
    const endTime = toHoursAndMinutes(minutes + duration);
    let endString = `${end} ${endTime}`;
    tzEndString = `${endString}+${toHoursAndMinutes(offset)}`.toLocaleString();
  }

  // convert date & time strings into datetime
  const startDateTime = new Date(tzStartString);
  const endDateTime = new Date(tzEndString);

  // get ISO UTC equivalent
  const offsetStartDateString = startDateTime.toISOString();
  const offsetEndDateString = endDateTime.toISOString();

  terminal(
    `Start date = ${tzStartString}, UTC offset start = ${offsetStartDateString}`,
    "DEBUG"
  );
  terminal(
    `End date = ${tzEndString}, UTC offset end = ${offsetEndDateString}`,
    "DEBUG"
  );

  while (startDateTime <= endDateTime) {
    var dtStr;
    if (!time) {
      // handle full day
      dtStr = startDateTime.toISOString().split("T")[0];
    } else {
      dtStr = startDateTime.toISOString();
    }
    arr.push(dtStr);
    startDateTime.setDate(startDateTime.getDate() + 1);
  }
  terminal(`Date array = ${arr}`, "DEBUG");
  return arr;
}

// function to return BU data
async function getBUData(allBuData, nBu) {
  const buArray = [];
  // set progress max
  let radialProgress = document.getElementById("radial-progress");
  let progressValue = 0;
  radialProgress.setAttribute("max", nBu.toString());

  let allTzData = await makeApiCallWithRetry(
    `/api/v2/timezones?pageSize=500&pageNumber=1`,
    "GET"
  );

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
  terminal(`Ready for file`, "INFO");
  document.getElementById("importFile").removeAttribute("disabled");
  document.getElementById("clear-button").removeAttribute("disabled");
  document.getElementById("export-button").removeAttribute("disabled");
  document.getElementById("import-button").removeAttribute("disabled");
  const loadingMessageElement = document.getElementById("loading-message");
  loadingMessageElement.style.display = "none";
  document.getElementById("file-div").removeAttribute("hidden");
}

// page load
async function pageLoad() {
  document.getElementById("file-name").value = "";

  let buData;

  terminal(`Import Time Off`, "INFO");
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
    } else {
      terminal(
        "Business Units already in memory, but something doesn't look right. Refreshing...",
        "INFO"
      );
      await getBUData(allBuData, buCount)
        .then((data) => {
          buData = data;
        })
        .catch((error) => {
          terminal(error, "ERROR");
        });
      enableButtons();
    }
  } catch (error) {
    terminal("Getting Business Unit details...", "INFO");
    await getBUData(allBuData, buCount)
      .then((data) => {
        buData = data;
      })
      .catch((error) => {
        terminal(error, "ERROR");
      });
    enableButtons();
  }
  return buData;
}

let buData = await pageLoad();

// open and validate file
function openLocalCSV(file, buData, callback) {
  var reader = new FileReader();

  reader.onload = function (event) {
    terminal("Validating file...", "INFO");
    terminal(`Checking file formatting`, "INFO");
    var csvData = event.target.result;
    var lines = csvData.split("\n");
    var headers = lines[0].trim().split(",");
    const fileHeaders = lines[0].trim();
    const expectedHeaders =
      "BU Name,Agent Email,Time Off Name,Start Date,End Date,Full Day,Start Time (Part Day),Hours,Is Paid,Notes,Status";
    if (fileHeaders === expectedHeaders) {
      terminal("File headers ok", "INFO");
    } else {
      terminal(
        "Headers in file don't match! Please check file and try again.",
        "ERROR"
      );
      return;
    }
    const nFields = expectedHeaders.split(",").length;

    // initialise bu and ag arrays for tracking objects already searched
    const goodBUArray = [];
    const badBUArray = [];
    const goodAGArray = [];
    const badAGArray = [];
    const goodTOArray = [];
    const badTOArray = [];

    // read data
    var result = [];
    for (var i = 1; i < lines.length - 1; i++) {
      var row = lines[i].trim().split(",");

      if (row.length === nFields) {
        var obj = {};
        for (var j = 0; j < headers.length; j++) {
          obj[headers[j]] = row[j];
        }
      } else {
        terminal(
          `Data row ${i} doesn't look right! Expected ${nFields} columns but ${row.length} are given. Please check file and try again.`,
          "ERROR"
        );
        return;
      }

      result.push(obj);
    }

    var validationFunctions = [
      // function to check records for invalid null values
      function nullChecker(r) {
        //terminal(`nullChecker invoked`, "DEBUG");

        for (const [key, value] of Object.entries(r)) {
          if (
            ((key !== "Start Time (Part Day)" || key !== "Notes") &&
              value !== "") ||
            key === "Start Time (Part Day)" ||
            key === "Notes"
          ) {
            // this is good data
          } else {
            // this should be removed / ignored
            r.invalid = true;
            r.invalidReason = `null value found in column '${key}'`;
            break;
          }
        }
      },

      // function to check records for invalid dates / date ranges
      function dateChecker(r) {
        //terminal(`dateChecker invoked`, "DEBUG");
        let startDate;
        let endDate;
        for (const [key, value] of Object.entries(r)) {
          if (key === "Start Date") {
            // this is the start date field
            startDate = new Date(value);
          } else if (key === "End Date") {
            // this is the end date field
            endDate = new Date(value);
          } else {
            // this is not a date field
          }
        }
        if (startDate > endDate || isNaN(startDate) || isNaN(endDate)) {
          // this should be removed / ignored
          r.invalid = true;
          r.invalidReason = `invalid date range`;
        } else {
          // this is good date range
        }
      },

      // function to check for correct time format
      function timeChecker(r) {
        //terminal(`timeChecker invoked`, "DEBUG");
        for (const [key, value] of Object.entries(r)) {
          if (key === "Hours" || key === "Start Time (Part Day)") {
            // this is a time field
            let keyTime = value;

            const validHHMMstring = (str) =>
              /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(str);

            if (value && !validHHMMstring(keyTime)) {
              r.invalid = true;
              r.invalidReason = `invalid time format found in column '${key}'`;
            }
          } else {
            // this is not a time field field
          }
        }
      },

      // function to check Y / N columns
      function flagChecker(r) {
        //terminal(`flagChecker invoked`, "DEBUG");
        //const flags = [];
        for (const [key, value] of Object.entries(r)) {
          if (key === "Full Day" || key === "Is Paid") {
            if (value === "Y" || value === "N") {
              // this is good data
            } else {
              // this should be removed / ignored
              r.invalid = true;
              r.invalidReason = `invalid Y / N flag found in column '${key}'`;
            }
          } else {
            // this is not a Y/N field
          }
        }
      },

      // function to check Y / N columns
      function statusChecker(r) {
        //terminal(`statusChecker invoked`, "DEBUG");
        //flags = [];
        for (const [key, value] of Object.entries(r)) {
          if (key === "Status") {
            if (
              value.toUpperCase() === "APPROVED" ||
              value.toUpperCase() === "PENDING"
            ) {
              // this is good data
            } else {
              // this should be removed / ignored
              r.invalid = true;
              r.invalidReason = `invalid status found in column '${key}'`;
            }
          } else {
            // this is not a Y/N field
          }
        }
      },

      // function to check BU
      function buChecker(r) {
        let buName = r["BU Name"];
        //terminal(`bu checker invoked - ${buName}`, "DEBUG");
        const foundBU = goodBUArray.find((o) => o.name === buName);
        if (foundBU) {
          // BU Name already searched & found
          let buId = foundBU.id;
          let offset = foundBU.offset;
          r.buId = buId;
          r.buOffset = offset;
        } else if (badBUArray.includes(buName)) {
          // BU Name already searched and not found
          r.invalid = true;
          r.invalidReason = "BU name not found";
        } else {
          // BU Name not yet searched
          //terminal(JSON.stringify(buData), "DEBUG");
          let buId = undefined;
          let offset = undefined;
          const searchedBU = buData.find((x) => x.name === buName);
          if (searchedBU !== undefined) {
            // bu found in buData
            buId = searchedBU.id;
            offset = searchedBU.offset;
            goodBUArray.push({ "name": buName, "id": buId, "offset": offset });
            r.buId = buId;
            r.buOffset = offset;
          } else {
            // bu not found in buData
            badBUArray.push(buName);
            r.invalid = true;
            r.invalidReason = `BU name '${buName}' not found`;
          }
        }
      },

      // function to check agent name and get AG ID / MU ID
      async function agChecker(r) {
        //terminal(`agChecker invoked`, "DEBUG");
        let agEmail = r["Agent Email"];
        const foundAG = goodAGArray.find((a) => a.email == agEmail);
        if (foundAG) {
          // AG already searched and found
          let agId = foundAG.id;
          let muId = foundAG.mu;
          r.agId = agId;
          r.muId = muId;
          terminal(`AG ID = ${agId}, MU ID = ${muId}`, "DEBUG");
        } else if (badAGArray.includes(agEmail)) {
          //terminal(`badAGArray includes agEmail`, "DEBUG");
          // AG already searched and not found
          r.invalid = true;
          r.invalidReason = `AG '${agEmail}' not found`;
        } else {
          // AG not yet searched
          try {
            // if agent name found add r.agId
            let agQuery = {
              "query": [
                {
                  "fields": ["email"],
                  "values": [agEmail],
                  "type": "EXACT",
                  "operator": "OR",
                },
              ],
            };
            let ag = await makeApiCallWithRetry(
              `/api/v2/users/search`,
              "POST",
              agQuery
            );

            let agentId = ag[0].id;
            terminal(`AG ID = ${agentId}`, "DEBUG");

            r.agId = agentId;
            let mu = undefined;
            try {
              // get MU data
              mu = await makeApiCallWithRetry(
                `/api/v2/workforcemanagement/agents/${agentId}/managementunit`,
                "GET"
              );
              terminal(`MU id = ${mu.managementUnit.id}`, "DEBUG");
            } catch (error) {
              // no response from getAgMu
              r.invalid = true;
              r.invalidReason = "No Management Unit found";
            }

            if (mu.businessUnit.id === r.buId) {
              // MU response matches file BU
              r.muId = mu.managementUnit.id;
              goodAGArray.push({
                "name": agEmail,
                "id": agentId,
                "mu": mu.managementUnit.id,
              });
            } else {
              // MU response doesn't belong to same BU as listed in file
              terminal(`BU not matched`, "DEBUG");
              r.invalid = true;
              r.invalidReason = "Agent MU does not in BU listed in file";
            }
          } catch (error) {
            // if agent name not found add agEmail to badAGArray
            badAGArray.push(agEmail);
            r.invalid = true;
            r.invalidReason = `AG '${agEmail}' not found`;
          }
        }
        // Resolve the promise to signal completion
        return Promise.resolve();
      },

      // function to check time off names for listed BU's
      async function timeoffChecker(r) {
        //terminal(`timeoffChecker invoked`, "DEBUG");
        let buName = r["BU Name"];
        let toName = r["Time Off Name"];
        terminal(`Looking for ${toName} at ${buName}`, "DEBUG");

        const foundBU = goodTOArray.find((b) => b.buName == buName);
        if (foundBU) {
          // BU TO's already returned
          const foundTO = foundBU.toArray.find((t) => t.name == toName);
          if (foundTO) {
            //terminal(`Found TO met`, "DEBUG");
            // TO name found in BU list
            r.toId = foundTO.id;
          } else {
            // TO name not found in previously returned BU list
            //terminal(`TO name not found in BU list`, "DEBUG");
            r.invalid = true;
            r.invalidReason = `Time Off '${toName}' not found in BU '${buName}'`;
            badTOArray.push({ "buName": buName, "toName": toName });
          }
        } else {
          // BU TO's have not yet been returned
          try {
            // only run if buName not in badBUArray
            if (!badBUArray.includes(buName)) {
              //terminal(`Searching time offs for ${buName}`, "DEBUG");
              // then return array of time off types
              const businessUnitId = r.buId;
              const toTypes = [];
              const toResults = await makeApiCallWithRetry(
                `/api/v2/workforcemanagement/businessunits/${businessUnitId}/activitycodes`,
                "GET"
              );

              if (toResults.length > 0) {
                //terminal(`Looping through actvity codes to find TO Types`, "DEBUG");
                for (let t = 0; t < toResults.length; t++) {
                  if (
                    toResults[t].category === "TimeOff" &&
                    toResults[t].active === true
                  ) {
                    // terminal(`this is a time off ${results[t].name}`, "DEBUG");
                    // add name for default if missing
                    if (toResults[t].name.length === 0) {
                      toResults[t].name = "Time Off";
                    }
                    let toObj = {
                      "name": toResults[t].name,
                      "id": toResults[t].id,
                    };
                    toTypes.push(toObj);
                  }
                }
              } else {
                terminal(`No TO results`, "DEBUG");
              }
              // and push array with buName to goodTOArray
              goodTOArray.push({ "buName": buName, "toArray": toTypes });

              // now search for TO name in returned array
              const foundTO = toTypes.find((t) => t.name == toName);

              if (foundTO) {
                // TO name found in BU list
                r.toId = foundTO.id;
                terminal(`toId = ${foundTO.id}`, "DEBUG");
              } else {
                // TO name not found in BU list
                r.invalid = true;
                r.invalidReason = `Time Off '${toName}' not found in BU '${buName}'`;
                badTOArray.push({ "buName": buName, "toName": toName });
              }
            }
          } catch (error) {
            // time off array not returned
          }
        }
      },

      // function to build utc datetimes
    ];

    const validList = [];
    const invalidList = [];
    async function processRows() {
      // iterate through results list to validate data
      terminal(`${result.length} records found in file`, "INFO");
      for (let k = 0; k < result.length; k++) {
        terminal(`Processing data row ${k + 1}`, "INFO");
        let record = result[k];
        const invalidKey = "invalid";
        terminal(`Validating record...`, "DEBUG");
        terminal(JSON.stringify(record), "DEBUG");
        // loop through validation functions
        for (var f = 0; f < validationFunctions.length; f++) {
          await validationFunctions[f](record); // Wait for the agChecker to complete
          // Check if the invalid key is now present in the object
          if (invalidKey in record) {
            terminal(
              `Row ${k + 1} invalid data found - ${record.invalidReason}`,
              "ERROR"
            );
            // clean any id's previously added to record
            try {
              delete record.buId;
              delete record.agId;
              delete record.muId;
              delete record.toId;
              delete record.buOffset;
            } finally {
              invalidList.push(record);
            }

            break; // Exit the loop if the key is found
          }
          if (f === validationFunctions.length - 1) {
            //const objToProcess = {};
            validList.push(record);
            terminal(`Validation checks ok.`, "DEBUG");
            terminal(`${JSON.stringify(record)}`, "DEBUG");
          }
        }
      }
      terminal(`File format checks complete`, "INFO");
    }

    async function validateData() {
      await processRows(); // Wait for processRows() to complete

      // finish off validation
      if (invalidList.length > 0) {
        terminal(
          `${invalidList.length} records can't be processed and will be ignored! Save a copy of these records from the Export button above :)`,
          "WARNING"
        );
        terminal(`Validation complete with ignored records`, "INFO");
        terminal(
          `Ready to import ${validList.length} of ${result.length} records...`,
          "INFO"
        );
      } else if (validList.length === 0) {
        terminal(
          `Validation complete...  but no records can be imported :(`,
          "INFO"
        );
      } else {
        terminal(`Validation successful!`, "INFO");
        terminal(
          `Ready to import ${validList.length} of ${result.length} records...`,
          "INFO"
        );
      }

      callback(invalidList);
      sessionStorage.setItem(importStorage, JSON.stringify(validList));
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidList));
    }

    validateData();
  };

  reader.readAsText(file);
}

// process data
export async function processData() {
  terminal(`Process data initiated...`, "INFO");

  // validate there's something to import'
  let importData = JSON.parse(sessionStorage.getItem(importStorage));
  if (importData.length === 0) {
    terminal(`Nothing to import!`, "ERROR");
    return;
  }

  async function makeToRequests() {
    terminal(`Processing ${importData.length} records...`, "INFO");
    for (let r = 0; r < importData.length; r++) {
      terminal(`Processing import ${r + 1} of ${importData.length}:`, "INFO");

      let request = importData[r];
      terminal(JSON.stringify(request), "INFO");

      // transform raw request data for post
      let managementUnitId = request.muId;
      let durationMinutes = convertH2M(request.Hours);
      let isPaid;
      if (request["Is Paid"] === "Y") {
        isPaid = true;
      } else {
        isPaid = false;
      }

      // set basic postBody
      let toRequest = {
        "status": request["Status"].toUpperCase(),
        "users": [
          {
            "id": request.agId,
          },
        ],
        "activityCodeId": request.toId,
        "notes": request.Notes,
        "dailyDurationMinutes": durationMinutes,
        "paid": isPaid,
      };

      // prep fopr getDateArray request
      let startDate = request["Start Date"];
      let endDate = request["End Date"];
      let partDayStartTime = request["Start Time (Part Day)"];
      let offset = request.buOffset;

      // update postBody with date array for part / full day requests
      if (request["Full Day"] === "Y") {
        // full day request
        let dateArray = getDateArray(startDate, endDate, "", "", offset);
        toRequest.fullDayManagementUnitDates = dateArray;
      } else {
        // part day request
        let dateArray = getDateArray(
          startDate,
          endDate,
          partDayStartTime,
          durationMinutes,
          offset
        );
        toRequest.partialDayStartDateTimes = dateArray;
      }

      terminal(`Making Time Off Request`, "DEBUG");
      terminal(JSON.stringify(toRequest), "DEBUG");

      // run makeApiCallWithRetry
      let toResponse = await makeApiCallWithRetry(
        `/api/v2/workforcemanagement/managementunits/${managementUnitId}/timeoffrequests`,
        "POST",
        toRequest
      );

      //terminal(`toResponse = ${JSON.stringify(toResponse)}`, "DEBUG");
      if (typeof toResponse === "object" && toResponse !== null) {
        let to = toResponse.timeOffRequests[0];
        terminal(`Request import success!`, "INFO");
        terminal(
          `https://apps.${environment}/directory/#/admin/wfm/timeOffRequests/${managementUnitId}/update/${request.agId}/${to.id}`,
          "DEBUG"
        );
      }
    }
  }
  await makeToRequests();
  terminal(`Processing complete!`, "INFO");
}

// populate file name to input box
var csvFileInput = document
  .getElementById("importFile")
  .addEventListener("click", function () {
    document.getElementById("fileInput").click();
  });
var csvFileName = document.getElementById("importFile").value;

// read file
document
  .getElementById("fileInput")
  .addEventListener("change", function (event) {
    var file = event.target.files[0];
    var filename = $("input[type=file]").val().split("\\").pop();
    terminal(`filename = '${filename}'`, "INFO");
    document.getElementById("file-name").value = filename;

    openLocalCSV(file, buData, function (data) {});
  });
