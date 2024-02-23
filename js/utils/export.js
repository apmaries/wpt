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
