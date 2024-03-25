import { getRadioValue } from "/wpt/js/utils/jsHelper.js";

// Debug unhandled promise rejections
window.onunhandledrejection = function (event) {
  terminal(
    "WARN",
    "Unhandled Rejection! Please send this back to the WPT team via email link in footer..."
  );
  terminal("ERROR", `Promise: ${event.promise}`);
  terminal("ERROR", `Reason: ${event.reason}`);
};

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

// Function to get log level
function getLogLevel() {
  let logRadio = document.getElementsByName("log-level");
  return getRadioValue(logRadio);
}

// Function to set log level
function setLogLevel() {
  const logLevel = getLogLevel();
  const allLogs = document.querySelectorAll("#terminal p");

  allLogs.forEach((log) => {
    switch (logLevel) {
      case "DEBUG":
        log.style.display = "block";
        break;
      case "INFO":
        log.style.display = log.classList.contains("debug") ? "none" : "block";
        break;
      case "WARNING":
        log.style.display =
          log.classList.contains("debug") || log.classList.contains("info")
            ? "none"
            : "block";
        break;
      case "ERROR":
        log.style.display =
          log.classList.contains("debug") ||
          log.classList.contains("info") ||
          log.classList.contains("warning")
            ? "none"
            : "block";
        break;
    }
  });

  return logLevel;
}

// Function to smooth scroll to the bottom of the terminal
export function scrollToBottom() {
  const terminalWindow = document.getElementById("terminal");
  terminalWindow.scrollTop = terminalWindow.scrollHeight;
}

// function to populate terminal window
export function terminal(type, message) {
  const terminalWindow = document.getElementById("terminal");
  const d = new Date();
  const nowISO8601 = d.toISOString();

  const p = document.createElement("p");
  p.textContent = `${nowISO8601} [${type}] ${message}`;
  p.className = type.toLowerCase();

  const logLevel = getLogLevel();

  if (
    (logLevel === "ERROR" && type !== "ERROR") ||
    (logLevel === "WARNING" && (type === "DEBUG" || type === "INFO")) ||
    (logLevel === "INFO" && type === "DEBUG")
  ) {
    p.style.display = "none";
  }

  terminalWindow.appendChild(p);
  scrollToBottom();
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
