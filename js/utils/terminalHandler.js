import { getRadioValue } from "/wpt/js/utils/jsHelper.js";

// Function to set log level
function setLogLevel() {
  var logRadio = document.getElementsByName("log-level");
  let logLevel;

  // Get value of selected radio button
  logLevel = getRadioValue(logRadio);

  // Hide lower level logs based on selected log level
  const allLogs = document.querySelectorAll("#terminal p");

  if (logLevel === "DEBUG") {
    allLogs.forEach((log) => {
      log.style.display = "block";
    });
  } else if (logLevel === "INFO") {
    allLogs.forEach((log) => {
      if (log.className === "debug") {
        log.style.display = "none";
      } else {
        log.style.display = "block";
      }
    });
  } else if (logLevel === "WARNING") {
    allLogs.forEach((log) => {
      if (log.className === "debug" || log.className === "info") {
        log.style.display = "none";
      } else {
        log.style.display = "block";
      }
    });
  } else if (logLevel === "ERROR") {
    allLogs.forEach((log) => {
      if (
        log.className === "debug" ||
        log.className === "info" ||
        log.className === "warning"
      ) {
        log.style.display = "none";
      } else {
        log.style.display = "block";
      }
    });
  }
  return logLevel;
}

// function to populate terminal window
export function terminal(type, message) {
  const terminalWindow = document.getElementById("terminal");
  const d = new Date();
  let nowISO8601 = d.toISOString();

  // Create a new p element
  const p = document.createElement("p");
  p.innerHTML = `${nowISO8601} [${type}] ${message}`;
  p.className = type.toLowerCase();
  terminalWindow.appendChild(p);
}

// function to clear terminal window
export async function resetTerminal() {
  const terminalWindow = document.getElementById("terminal");
  terminalWindow.innerHTML = "";
  terminal("INFO", "Terminal reset...");
}

// Event listener for log level radio buttons
const logLevelRadio = document.getElementsByName("log-level");
logLevelRadio.forEach((radio) => {
  radio.addEventListener("click", () => {
    console.log("WTP: Log level changed to: ", setLogLevel());
  });
});
