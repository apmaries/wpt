import { terminal, resetTerminal } from "/wpt/js/utils/terminalHandler.js";

const download = function (data, name, fileType) {
  // Creating a Blob with the specified file type
  const blob = new Blob([data], { type: fileType });

  // Creating an object for downloading URL
  const url = window.URL.createObjectURL(blob);

  // Creating an anchor(a) tag of HTML
  const a = document.createElement("a");

  // Setting the anchor tag attribute for downloading
  // and passing the download file name
  a.setAttribute("href", url);
  a.setAttribute("download", name);

  terminal("INFO", `Downloading ${name}...`);

  // Performing a download with click
  a.click();
};

const logMaker = function (data) {
  // Empty array for storing the log lines
  const logLines = [];

  // Pushing log lines into the array
  for (let i = 0; i < data.length; i++) {
    logLines.push(data[i]);
  }

  // Returning the log lines joining with new line
  return logLines.join("\n");
};

const csvMaker = function (data) {
  // Empty array for storing the CSV rows
  const csvRows = [];

  // Headers are the keys of an object
  const headers = Object.keys(data[0]);

  // Pushing headers into the array
  csvRows.push(headers.join(","));

  // Pushing object values into the array with comma separation
  for (let i = 0; i < data.length; i++) {
    let values = Object.values(data[i]).join(",");
    csvRows.push(values);
  }

  // Returning the array joining with new line
  return csvRows.join("\n");
};

// Function to export logs as a .log file
export function exportLogs(data, name) {
  console.debug(`exportLogs was called with name: ${name}`);
  const file = `${name}.log`;
  terminal("INFO", `Exporting logs as ${file}...`);

  // Ensure data is an array
  if (!Array.isArray(data)) {
    if (NodeList.prototype.isPrototypeOf(data)) {
      // Convert NodeList to array
      data = Array.from(data);
    } else {
      // Convert single element to array
      data = [data];
    }
  }

  // Converting the data into an array of text
  const textData = data.map((paragraph) => paragraph.textContent);

  // Making the log file
  const logFile = logMaker(textData);

  // Downloading the log file
  download(logFile, file, "text/plain");
}

// Function to export data as a .csv file
export function exportCsv(data, name) {
  console.debug(`exportCsv was called with name: ${name}`);
  const file = `${name}.csv`;
  terminal("INFO", `Exporting data as ${file}...`);

  // Ensure data is an array
  if (!Array.isArray(data)) {
    if (NodeList.prototype.isPrototypeOf(data)) {
      // Convert NodeList to array
      data = Array.from(data);
    } else {
      // Convert single element to array
      data = [data];
    }
  }

  // Making the CSV file
  const csvFile = csvMaker(data);

  // Downloading the CSV file
  download(csvFile, file, "text/csv");
}

// Function to export data as a .json file
export function exportJson(data, name) {
  console.debug(`exportJson was called with name: ${name}`);
  const file = `${name}.json`;
  terminal("INFO", `Exporting data as ${file}...`);

  // Ensure data is an array
  if (!Array.isArray(data)) {
    if (NodeList.prototype.isPrototypeOf(data)) {
      // Convert NodeList to array
      data = Array.from(data);
    } else {
      // Convert single element to array
      data = [data];
    }
  }

  // Making the JSON file
  const jsonFile = JSON.stringify(data, null, 2);

  // Downloading the JSON file
  download(jsonFile, file, "application/json");
}
