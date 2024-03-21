import { makeApiCallWithRetry } from "./makeApiCall.js";

// set some global variables
const test = false;
const environment = sessionStorage.getItem("environment");
const ignoredStorage = "importSentimentFailed";
let fileLabel = document.getElementById("file-name").value;

// function to return supported dialects
async function getDialects() {
  const list = document.getElementById("dialect-list");
  const dialects = await makeApiCallWithRetry(
    `/api/v2/speechandtextanalytics/sentiment/dialects`,
    "GET"
  );
  dialects.sort();
  terminal(JSON.stringify(dialects), "DEBUG");
  for (let d = 0; d < dialects.length; d++) {
    let li = document.createElement("li");
    li.appendChild(document.createTextNode(dialects[d]));
    list.appendChild(li);
  }
}

// page load
async function pageLoad() {
  await getDialects();
  fileLabel = "";
  terminal(`Import Sentiment Phrases`, "INFO");

  document.getElementById("importFile").removeAttribute("disabled");
  document.getElementById("clear-button").removeAttribute("disabled");
  terminal(`Ready for file`, "INFO");
}

pageLoad();

// open and validate file
function openLocalCSV(file, callback) {
  terminal(`openLocalCSV initiated`, "DEBUG");
  var reader = new FileReader();

  reader.onload = function (event) {
    terminal("Validating file...", "INFO");
    terminal(`Checking file formatting`, "INFO");
    var csvData = event.target.result;
    var lines = csvData.split("\n");
    var headers = lines[0].trim().split(",");
    const fileHeaders = lines[0].trim();
    const expectedHeaders = "Phrase,Sentiment,Dialect";
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

    // read data
    terminal("Reading import data", "INFO");
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

    for (var o = 0; o < result.length; o++) {
      terminal(JSON.stringify(result[o]), "DEBUG");
    }
    sessionStorage.setItem("importSentimentPhrases", JSON.stringify(result));
    terminal(`Ready to import ${result.length} sentiment phrases`, "INFO");
    document.getElementById("import-button").removeAttribute("disabled");
    document.getElementById("export-button").removeAttribute("disabled");
  };

  reader.readAsText(file);
}

// process data
export async function processData() {
  terminal(`Process data initiated...`, "INFO");
  const importData = JSON.parse(
    sessionStorage.getItem("importSentimentPhrases")
  );

  const invalidList = [];
  for (let p = 0; p < importData.length; p++) {
    terminal(`Importing phrase ${p + 1} of ${importData.length}`, "INFO");
    const requestBody = {
      "phrase": importData[p].Phrase,
      "dialect": importData[p].Dialect,
      "feedbackValue": importData[p].Sentiment,
    };
    terminal(`Phrase ${p + 1} = ${JSON.stringify(requestBody)}`, "INFO");
    let importResponse = await makeApiCallWithRetry(
      `/api/v2/speechandtextanalytics/sentimentfeedback`,
      "POST",
      requestBody
    );

    // add to invalid array if return is string (e.g. error response from makeApiCall)

    if (typeof importResponse === "string") {
      let invalidItem = {
        "phrase": importData[p].Phrase,
        "feedbackValue": importData[p].Sentiment,
        "dialect": importData[p].Dialect,
        "invalid": true,
        "invalidReason": importResponse.replaceAll(",", "/"),
      };
      invalidList.push(invalidItem);
    } else {
      terminal("Sentiment phrase imported", "INFO");
    }
  }
  sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidList));
  terminal("Import complete", "INFO");
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
    fileLabel = filename;

    openLocalCSV(file, function (data) {});
  });
