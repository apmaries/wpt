import { globalPageOpts, handleApiCalls } from "/wpt/js/utils/apiHandler.js";
import { populateMultiDropdown } from "/wpt/js/utils/dropdownHandler.js";
import { terminal, resetTerminal } from "/wpt/js/utils/terminalHandler.js";
import {
  enableButtons,
  hidePreviousElement,
} from "/wpt/js/utils/pageHandler.js";
import { getRadioValue } from "/wpt/js/utils/jsHelper.js";
import {
  exportLogs,
  exportCsv,
  exportJson,
} from "/wpt/js/utils/exportHandler.js";

let testMode = false;
if (window.origin.includes("127.0.0.1")) {
  testMode = true;
}

// Constants start here
const toolName = "Export Roles / Permissions";
const toolShortName = "exportRolePermissions";
const terminalDiv = document.getElementById("terminal");
let runTime = new Date()
  .toISOString()
  .replace(/[-:]/g, "")
  .replace("T", "_")
  .split(".")[0];

let permissions = [];
let roles = [];

const filtersDropdown = document.getElementById("filters-dropdown");
const filtersListbox = document.getElementById("filters-listbox");

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

// Function to update filters dropdown based on object context
function updateFiltersDropdown(objectContext) {
  // clear previous filters
  filtersListbox.innerHTML = "";
  filtersDropdown.value = ""; // Reset selected filters

  if (objectContext === "roles") {
    filtersDropdown.placeholder = "Filter by Roles";
    populateMultiDropdown(filtersListbox, roles);
    hidePreviousElement("filters-dropdown");
    terminal("INFO", `${roles.length} roles loaded... `);
  } else if (objectContext === "permissions") {
    filtersDropdown.placeholder = "Filter by permission domains";
    // Get distinct domains from permissions
    const allDomains = permissions.map((entity) => entity.domain);
    const distinctDomains = [...new Set(allDomains)];

    populateMultiDropdown(filtersListbox, distinctDomains);
    hidePreviousElement("filters-dropdown");
    terminal("INFO", `${distinctDomains.length} permission domains loaded... `);
  }
  terminal("INFO", `Please apply filters if needed and click 'Run' to start`);
}

// Function to map out full role permissions
function expandRolePermissions(selectedRoles) {
  selectedRoles.forEach((role) => {
    terminal("DEBUG", `Expanding '${role.name}' (${role.id})...`);
    const expandedPermissions = [];
    role.permissionPolicies.forEach((policy) => {
      terminal("DEBUG", `Policy: ${JSON.stringify(policy)}`);
      if (
        policy.domain === "*" ||
        policy.entityName === "*" ||
        policy.actionSet.includes("*")
      ) {
        permissions.forEach((permission) => {
          if (policy.domain === "*" || policy.domain === permission.domain) {
            if (policy.entityName === "*") {
              Object.keys(permission.permissionMap).forEach((entityType) => {
                permission.permissionMap[entityType].forEach(
                  (permissionItem) => {
                    if (
                      policy.actionSet.includes("*") ||
                      policy.actionSet.includes(permissionItem.action)
                    ) {
                      expandedPermissions.push(permissionItem);
                    }
                  }
                );
              });
            } else if (policy.entityName === permission.entityType) {
              permission.permissionMap[policy.entityName].forEach(
                (permissionItem) => {
                  if (
                    policy.actionSet.includes("*") ||
                    policy.actionSet.includes(permissionItem.action)
                  ) {
                    expandedPermissions.push(permissionItem);
                  }
                }
              );
            }
          }
        });
      } else {
        expandedPermissions.push(policy);
      }
      expandedPermissions.forEach((permission) => {
        terminal("DEBUG", `Expanded: ${JSON.stringify(permission)}`);
      });
    });
    role.permissionPolicies = expandedPermissions; // Replace the original permissions with the expanded ones
  });

  return selectedRoles; // Return the full roles
}

// Initialisation function
async function initiate() {
  terminal("INFO", `Initiating program - ${toolName}`);

  // Reset log-level to INFO
  const logRadio = document.getElementsByName("log-level");
  logRadio[1].checked = true;

  // Reset object-context to Roles
  const objectContextRadio = document.getElementsByName("object-context");
  objectContextRadio[0].checked = true;

  if (!testMode) {
    // Production mode

    roles = await getRoles(); // Initiated at global scope for later use
    permissions = await getPermissions(); // Initiated at global scope for later use
  } else {
    // Test mode - populate listbox with dummy data
    console.log(`WPT: ${toolName} in test mode...`);

    const rolesResponse = await fetch("/wpt/.test/data/roles.json");
    const permissionsResponse = await fetch("/wpt/.test/data/permissions.json");

    roles = await rolesResponse.json(); // Initiated at global scope for later use
    roles = roles.entities; // Extract entities from response
    permissions = await permissionsResponse.json(); // Initiated at global scope for later use
  }

  updateFiltersDropdown("roles");

  enableButtons();
  console.log(`WPT: ${toolName} page initiated...`);
}

// Primary function to export roles or permissions
async function exportRolePermissions() {
  // Function to export role objects
  async function exportRoleObjects() {
    let exportData = [];
    let filteredRoles;
    console.log("WPT: exportRoleObjects() roles = ", roles);
    console.log("WPT: exportRoleObjects() selectedFilters = ", selectedFilters);

    // Filter roles based on selected roles
    if (selectedFilters === "") {
      terminal("INFO", `No filtering applied - exporting all roles`);
      filteredRoles = roles;
    } else {
      terminal(
        "INFO",
        `Role filtering applied with ${selectedFilters.length} role(s)`
      );
      filteredRoles = roles.filter((entity) =>
        selectedFilters.includes(entity.id)
      );
    }
    console.log("WPT: exportRoleObjects() filteredRoles = ", filteredRoles);
    filteredRoles.forEach((role) => {
      terminal("DEBUG", `Adding '${role.name}' (${role.id}) to list`);
    });
    exportData = expandRolePermissions(filteredRoles);
    console.log("WPT: exportRoleObjects() exportData = ", exportData);
    return exportData;
  }

  // Function to export permission objects
  async function exportPermissionObjects() {
    let filteredPermissions;

    // Filter permissions based on selected domains
    if (selectedFilters === "") {
      terminal(
        "INFO",
        `No domain filtering applied - exporting all permissions`
      );
      filteredPermissions = permissions;
    } else {
      terminal(
        "INFO",
        `Permission filtering for ${selectedFilters.length} domain(s)`
      );
      filteredPermissions = permissions.filter((entity) =>
        selectedFilters.includes(entity.domain)
      );
    }

    // Create a flat array of permissions
    const permissionsArray = [];
    filteredPermissions.forEach((permission) => {
      Object.values(permission.permissionMap).forEach((array) => {
        array.forEach((item) => {
          permissionsArray.push(item);
        });
      });
    });

    console.log(
      "WPT: exportPermissionObjects() permissionsArray = ",
      permissionsArray
    );
    return permissionsArray;
  }

  // Main starts here
  // Update runTime
  runTime = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace("T", "_")
    .split(".")[0];
  const fileName = `${toolShortName}_${runTime}`;

  // Get object context
  const objectContextRadio = document.getElementsByName("object-context");
  const objectContext = getRadioValue(objectContextRadio);

  // Add Execution start message to terminal
  const startP = document.createElement("p");
  startP.innerHTML = `---- Execution started at ${runTime} ----`;
  startP.className = "error";
  startP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(startP);
  terminal("INFO", `Exporting ${objectContext}...`);

  // Get tool page variables
  const selectedFilters = filtersListbox.value
    ? filtersListbox.value.split(",")
    : "";
  const outputTypeRadio = document.getElementsByName("output-type");

  // Get value of of output type radio buttons
  const outputType = getRadioValue(outputTypeRadio);

  terminal("DEBUG", `selectedFilters = ${selectedFilters}`);
  terminal("DEBUG", `outputType = ${outputType}`);

  // Get data based on object context
  let exportData = [];
  if (objectContext === "roles") {
    exportData = await exportRoleObjects(selectedFilters);
  } else if (objectContext === "permissions") {
    exportData = await exportPermissionObjects(selectedFilters);
  }

  /*
  if (exportData.length > 0) {
    // Function to filter exportData based on selected filters
    const filteredData = exportData.filter((item) => {
      const selectedRolesMatch =
        selectedRoles.length > 0
          ? selectedRoles.includes(item.feedbackValue.toLowerCase())
          : true;
      const selectedDomainsMatch =
        selectedDomains.length > 0
          ? selectedDomains.includes(item.domain)
          : true;

      return selectedRolesMatch && selectedDomainsMatch;
    });

    if (filteredData.length === 0) {
      terminal(
        "ERROR",
        "No data found for selected filters... Please try again..."
      );
    } else {
      // Export results to csv file
      terminal("INFO", `Exporting data...`);
      sessionStorage.setItem(toolShortName, JSON.stringify(filteredData));

      //exportCsv(filteredData, fileName);
    }
  } else {
    terminal("ERROR", "Export failed! Please try again...");
  } 
  */
  // Add Execution end message to terminal
  const endP = document.createElement("p");
  endP.innerHTML = `---- Execution completed ----`;
  endP.className = "error";
  endP.style.margin = "1em 0"; // Add a top and bottom margin
  terminalDiv.appendChild(endP);
}

// Functions end here

// Main

initiate();

// Event listeners start here
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
  exportRolePermissions();
});

// Event listener for download results button
const resultsButton = document.getElementById("tool-results-button");
resultsButton.addEventListener("click", (event) => {
  const exportData = JSON.parse(sessionStorage.getItem(toolShortName));
  if (!exportData) {
    terminal("ERROR", "No export data found! Please run the export first...");
    return;
  }
  const fileName = `${toolShortName}_${runTime}`;
  exportCsv(exportData, fileName);
});

// Event listener for object context radio buttons
const objectContextRadio = document.getElementsByName("object-context");
objectContextRadio.forEach((radio, index) => {
  radio.addEventListener("click", (event) => {
    const outputTypeRadio = document.getElementsByName("output-type");
    const radioValue = getRadioValue(objectContextRadio);
    terminal("INFO", `Object context changed to ${radioValue}`);
    if (radioValue === radio.value) {
      if (index === 1) {
        updateFiltersDropdown(radioValue);
        outputTypeRadio[1].setAttribute("disabled", true);
        outputTypeRadio[0].checked = true;
      } else {
        updateFiltersDropdown(radioValue);
        outputTypeRadio[1].removeAttribute("disabled");
      }
    }
  });
});

// Event listeners end here
