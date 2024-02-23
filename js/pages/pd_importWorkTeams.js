import { makeApiCallWithRetry } from "./makeApiCall.js";

// set some global variables
const importStorage = "pdImpWtsData";
const ignoredStorage = "pdImpWtsIgnored";
const pdWtStorage = "pdWorkTeamsList";
let teamsToCreateList = [];
const maxTeamSize = 100;
let maxTeamSizeFlag = false;

// function to handle radio button change event
function getResolveMethod() {
  // get the selected radio button's value
  var selectedValue = document.querySelector(
    'input[name="resolve-method"]:checked'
  ).value;

  terminal(`Resolve method changed to '${selectedValue}'`, "INFO");
  return selectedValue;
}

// attach the getResolveMethod function to the change event of radio buttons
var radioButtons = document.querySelectorAll('input[name="resolve-method"]');
radioButtons.forEach(function (radioButton) {
  radioButton.addEventListener("change", getResolveMethod);
});

function enableButtons() {
  // get data complete, enable buttons on page

  document.getElementById("clear-button").removeAttribute("disabled");
  document.getElementById("export-button").removeAttribute("disabled");
  document.getElementById("import-button").removeAttribute("disabled");
}

// new function for get WT
async function getWts() {
  const workTeams = [];

  let allWorkTeams = await makeApiCallWithRetry(
    `/api/v2/teams?pageSize=100&expand=entities.division`,
    "GET"
  );

  allWorkTeams.forEach((team) => {
    let wt = {
      "teamName": team.name,
      "teamId": team.id,
      "divisionName": team.division.name,
      "divisionId": team.division.id,
      "memberCount": team.memberCount,
    };
    workTeams.push(wt);
  });
  // set session storage
  sessionStorage.setItem(pdWtStorage, JSON.stringify(workTeams));
  return workTeams;
}

// function to return existing work team names
async function pageLoad() {
  document.getElementById("file-name").value = "";

  terminal(`Import Work Teams`, "INFO");
  terminal(`Getting existing Work Teams...`, "INFO");

  let currentWtList = await getWts();
  terminal(`Found ${currentWtList.length} teams in GC`, "INFO");
  terminal(JSON.stringify(currentWtList), "DEBUG");
  terminal(`Ready for file`, "INFO");
  document.getElementById("importFile").removeAttribute("disabled");
  const loadingMessageElement = document.getElementById("loading-message");
  loadingMessageElement.style.display = "none";
  document.getElementById("file-div").removeAttribute("hidden");
  return currentWtList;
}

let wtData = await pageLoad();

// open and validate file
function openLocalCSV(file, wtData, callback) {
  var reader = new FileReader();

  reader.onload = function (event) {
    terminal("Validating file...", "INFO");
    terminal(`Checking file formatting`, "INFO");
    var csvData = event.target.result;
    var lines = csvData.split("\n");
    var headers = lines[0].trim().split(",");
    const fileHeaders = lines[0].trim();
    const expectedHeaders = "Division,Team Name,Agent Email";
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
    var result = [];
    for (var i = 1; i < lines.length; i++) {
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

    const invalidList = [];
    let wtImportData = [];

    async function processFile(teams) {
      let agentNameList = [];

      // iterate through results list to validate data
      terminal(`${result.length} records found in file`, "INFO");
      for (let k = 0; k < result.length; k++) {
        let record = result[k];
        let thisTeamDivision = record["Division"];
        let thisAgentEmail = record["Agent Email"];
        let thisTeamName = record["Team Name"];
        terminal(`R${k + 1}: ${JSON.stringify(record)} `, "INFO");
        let memberCount;

        let tObj = {
          "teamName": thisTeamName,
          "divisionName": thisTeamDivision,
          "agents": [thisAgentEmail],
        };

        if (!agentNameList.includes(thisAgentEmail)) {
          agentNameList.push(thisAgentEmail);
        } else {
          terminal(
            `R${
              k + 1
            }: Agent listing conflict. Agent '${thisAgentEmail}' already found in file. This record will be ignored!`,
            "WARNING"
          );
          record.invalid = true;
          record.invalidReason = "Duplicate agent in file";
          invalidList.push(record);
          continue;
        }

        // if team already exists in GC
        const existingTeam = teams.find(
          (team) => team.teamName === thisTeamName
        );

        if (existingTeam) {
          const existingTeamDivision = existingTeam.divisionName;
          memberCount = existingTeam.memberCount;
          if (existingTeamDivision === thisTeamDivision) {
            terminal(
              `R${
                k + 1
              }: Existing team found. '${thisTeamName}' at ${thisTeamDivision} will be appended to during import`,
              "INFO"
            );
            tObj.teamId = existingTeam.teamId;
            tObj.divisionId = existingTeam.divisionId;
            tObj.memberCount = memberCount;
          } else {
            terminal(
              `R${
                k + 1
              }: Existing team conflict. '${thisTeamName}' already exists at ${existingTeamDivision} division. This record will be ignored!`,
              "WARNING"
            );
            record.invalid = true;
            record.invalidReason = `Team name already exists at ${existingTeamDivision}`;
            invalidList.push(record);
            continue;
          }
        } else {
          // new team to be created
          const newTeamMatch = teamsToCreateList.find(
            (team) => team.teamName === thisTeamName
          );

          if (newTeamMatch) {
            // new team has already been identified

            if (newTeamMatch.teamDivision !== thisTeamDivision) {
              // this new team has already been identified at a different division
              terminal(
                `R${
                  k + 1
                }: New team conflict. '${thisTeamName}' has already been marked for creation at ${
                  newTeamMatch.teamDivision
                } but team names must be unique across the org. This record will be ignored.`,
                "WARNING"
              );
              record.invalid = true;
              record.invalidReason = `Team name duplication in file over  ${newTeamMatch.teamDivision} and ${thisTeamDivision} divisions`;
              invalidList.push(record);
              continue;
            }
          } else {
            // new team not yet recorded
            terminal(
              `New team found. '${thisTeamName}' will be created during import`,
              "INFO"
            );
            const newTeam = {
              "teamName": thisTeamName,
              "teamDivision": thisTeamDivision,
            };
            teamsToCreateList.push(newTeam);
          }
        }

        // add tObj to import data list or append agent name to members list if tObj already exists in list
        const knownImportObj = wtImportData.find(
          (importTeam) => importTeam.teamName === thisTeamName
        );

        if (knownImportObj) {
          // need to add some logic perhaps here for max team size being breached if knownImportObj.agents equal to 100
          let memberAddCount = knownImportObj.agents.length;
          if (memberCount + memberAddCount + 1 > maxTeamSize) {
            // member add breaches maximum team size
            terminal(
              `Max team size might be breached... Work Teams are limited to ${maxTeamSize} members. ${thisTeamName} started with ${memberCount} and import of ${thisAgentEmail} will make it ${
                memberCount + memberAddCount + 1
              }.`,
              "WARNING"
            );
            maxTeamSizeFlag = true;
            knownImportObj.agents.push(thisAgentEmail);
          } else {
            knownImportObj.agents.push(thisAgentEmail);
          }
        } else {
          wtImportData.push(tObj);
        }
      }

      var resolveMethod = document.querySelector(
        'input[name="resolve-method"]:checked'
      ).value;

      if (maxTeamSizeFlag === true && resolveMethod === "replace") {
        terminal(
          `One or more teams may breach maximum team size. Import can continue as team size may change from by team moves. You'll be notified if final team sizes during import exceeds ${maxTeamSize} during import.`,
          "WARNING"
        );
      }
      callback(invalidList);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidList));
      sessionStorage.setItem(importStorage, JSON.stringify(wtImportData));
      enableButtons();
    }

    // process data and provide feedback to user
    processFile(wtData);
    terminal(`Import file checks complete`, "INFO");
    terminal(`${wtImportData.length} teams in file for processing`, "INFO");
    if (teamsToCreateList.length > 0) {
      terminal(`${teamsToCreateList.length} new teams will be created`, "INFO");
      terminal(
        `Teams to create: ${JSON.stringify(teamsToCreateList)}`,
        "DEBUG"
      );
    }
    if (invalidList.length > 0) {
      terminal(
        `${invalidList.length} records can't be processed and will be ignored. Feel free to continue with import or update source file and try again`,
        "WARNING"
      );
      terminal(`Ignored data = ${JSON.stringify(invalidList)}`, "DEBUG");
    }
    terminal(`Import data = ${JSON.stringify(wtImportData)}`, "DEBUG");

    // need to add some logic / warning here about max team size being breached
  };

  reader.readAsText(file);
}

// process data
export async function processData() {
  terminal(`Import initiated...`, "INFO");
  let invalidRecords = JSON.parse(sessionStorage.getItem(ignoredStorage));
  const divisionsList = JSON.parse(sessionStorage.getItem("divisionsList"));
  const deletionsList = [];

  var resolveMethod = document.querySelector(
    'input[name="resolve-method"]:checked'
  ).value;
  terminal(`Importing with '${resolveMethod}' conflict resolution`, "INFO");
  if (resolveMethod === "replace") {
    terminal(
      `Replace method will move agents already in teams to team specified in file`,
      "INFO"
    );
  } else {
    terminal(
      `Retain method will prioritise current Work Team associations and ignore records in file for agents that already belong to a team.`,
      "INFO"
    );
  }

  // validate there's something to import'
  function isData() {
    try {
      let dataTest = JSON.parse(sessionStorage.getItem(importStorage));
      if (dataTest.length === 0) {
        terminal(`Nothing to import!`, "ERROR");
        return;
      } else {
        return dataTest;
      }
    } catch (error) {
      terminal(`Nothing to import!`, "ERROR");
      return;
    }
  }

  async function importChecks(item, index) {
    const importTeamName = item.teamName;
    const importDivisionName = item.divisionName;
    const importAgentsList = item.agents;

    // function to handle agents that aren't matched in GC
    function agentNotFound(agent) {
      terminal(
        `Agent '${agent} not found. This agent will be ignored.`,
        "WARNING"
      );
      let ignoredObj = {
        "Division": importDivisionName,
        "Team Name": importTeamName,
        "Agent Email": agent,
        "invalid": true,
        "invalidReason": "Agent email address not found in GC",
      };
      invalidRecords.push(ignoredObj);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidRecords));
    }

    // function to handle division mismatch
    function divisionMismatch(agent, agentDiv) {
      terminal(
        `Division mismatched! Agent '${agent}' belongs to ${agentDiv} and can't be assigned to ${importTeamName} at ${importDivisionName} division. This agent will be ignored.`,
        "WARNING"
      );
      let ignoredObj = {
        "Division": importDivisionName,
        "Team Name": importTeamName,
        "Agent Email": agent,
        "invalid": true,
        "invalidReason": `Wrong division. Agent belongs to ${agentDiv}`,
      };
      invalidRecords.push(ignoredObj);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidRecords));
    }

    // function to handle agent team retained
    function retainedTeam(agent, agentTeam) {
      terminal(
        `Existing team found for ${agent} with 'retain' conflict resolution set. Record will be ignored to keep agent in current team.`,
        "WARNING"
      );
      let ignoredObj = {
        "Division": importDivisionName,
        "Team Name": importTeamName,
        "Agent Email": agent,
        "invalid": true,
        "invalidReason": `Existing team '${agentTeam}' is retained.`,
      };
      invalidRecords.push(ignoredObj);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidRecords));
    }

    // function to handle agent team retained
    function sameTeam(agent, agentTeam) {
      terminal(
        `Agent '${agent}' already belongs to ${agentTeam}. This agent will be ignored.`,
        "WARNING"
      );
      let ignoredObj = {
        "Division": importDivisionName,
        "Team Name": importTeamName,
        "Agent Email": agent,
        "invalid": true,
        "invalidReason": `Existing team '${agentTeam}' is retained.`,
      };
      invalidRecords.push(ignoredObj);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidRecords));
    }

    // function to handle division not found
    function divisionNotFound(agent) {
      terminal(
        `${importTeamName} can't be created - agent '${agent}' will be ignored.`,
        "WARNING"
      );
      let ignoredObj = {
        "Division": importDivisionName,
        "Team Name": importTeamName,
        "Agent Email": agent,
        "invalid": true,
        "invalidReason": `Division '${importDivisionName}' not found.`,
      };
      invalidRecords.push(ignoredObj);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidRecords));
    }

    terminal(`Checking division...`, "INFO");
    const matchedDivision = divisionsList.find(
      (div) => div.name === importDivisionName
    );
    if (matchedDivision) {
      terminal(`Division matched`, "INFO");
      const importDivisionId = matchedDivision.id;
      item.divisionId = importDivisionId;
      terminal(`${importDivisionName} (${importDivisionId})`, "DEBUG");
    } else {
      terminal(
        `Division not found! Team '${importTeamName}' can't be created at '${importDivisionName}' as this division does not exist. This team will be ignored.`,
        "ERROR"
      );
      importAgentsList.forEach((a) => divisionNotFound(a));
      return;
    }

    // search for members before creating teams in case no members can be found
    const searchQuery = {
      "sortOrder": "ASC",
      "pageSize": 100,
      "pageNumber": 1,
      "expand": ["team"],
      "query": [
        {
          "fields": ["email"],
          "operator": "OR",
          "type": "EXACT",
          "values": importAgentsList,
        },
      ],
    };
    let memberIds = await makeApiCallWithRetry(
      `/api/v2/users/search`,
      "POST",
      searchQuery
    );

    // check if no agents in array are found
    if (!Array.isArray(memberIds)) {
      terminal(
        "No listed team members can be found in GC! Team will be ignored.",
        "ERROR"
      );
      importAgentsList.forEach((agent) => agentNotFound(agent));
      // have just updated this from blank return to return empty import persons array
      return [];
    }

    // create array for agents that can be imported to teams
    const importPersons = [];

    // function to match agent ids to email addresses
    async function agentMatch(agent) {
      const matchedAgent = memberIds.find((member) => member.email === agent);
      if (matchedAgent) {
        const person = {
          "id": matchedAgent.id,
          "name": matchedAgent.name,
          "email": matchedAgent.email,
        };

        // confirm agent belongs to same division as import team
        if (matchedAgent.division.name === importDivisionName) {
          // if team exists and replace
          if ("team" in matchedAgent && resolveMethod === "replace") {
            // check if agent is being moved to current team
            if (matchedAgent.team.name === importTeamName) {
              sameTeam(agent, importTeamName);
            } else {
              // agent has a team but is being moved to a different one
              terminal(
                `Matched agent '${agent}' (${matchedAgent.id}) at division '${matchedAgent.division.name}' in team '${matchedAgent.team.name}'. Agent will be updated to '${importTeamName}'`,
                "INFO"
              );

              // add agent to deletions list
              const delListTeamMatch = deletionsList.find(
                (team) => matchedAgent.team.id === team.teamId
              );

              if (delListTeamMatch) {
                delListTeamMatch.agents.push(matchedAgent.id);
              } else {
                const delListObj = {
                  "teamId": matchedAgent.team.id,
                  "agents": [matchedAgent.id],
                };
                deletionsList.push(delListObj);
              }
              importPersons.push(person);
            }
          } else if ("team" in matchedAgent && resolveMethod === "retain") {
            // team exists but retain method being used
            terminal(
              `Matched agent '${agent}' (${matchedAgent.id}) at division '${matchedAgent.division.name}' in team '${matchedAgent.team.name}'.`,
              "INFO"
            );
            retainedTeam(agent, matchedAgent.team.name);
          } else {
            // no current team found for agent
            terminal(
              `Matched agent '${agent}' (${matchedAgent.id}) at division '${matchedAgent.division.name}' with no team. Agent will be added to '${importTeamName}'.`,
              "INFO"
            );

            importPersons.push(person);
          }
        }
        // matched agent doesn't belong to same division as import
        else {
          divisionMismatch(agent, matchedAgent.division.name);
        }
      }
      // agent not found in GC
      else {
        agentNotFound(agent);
      }
    }

    // match agent ids to email addresses
    for (let a = 0; a < importAgentsList.length; a++) {
      await agentMatch(importAgentsList[a]);
    }

    return importPersons;
  }

  // delete function
  async function deleteCurrentTeam(obj) {
    const teamId = obj.teamId;
    const agents = obj.agents;
    const encodedIds = agents.map((id) => encodeURIComponent(id));
    const encodedString = encodedIds.join("%2C");

    let deleteTeamResponse = await makeApiCallWithRetry(
      `/api/v2/teams/${teamId}/members?id=${encodedString}`,
      "DELETE"
    );
    return deleteTeamResponse;
  }

  // import function
  async function importTeam(item, index) {
    const importTeamName = item.teamName;
    const importDivisionName = item.divisionName;
    const importAgentsList = item.agents;
    const importPersonsLength = importAgentsList.length;

    // function to handle agents that aren't matched in GC
    function maxTeamSizeBreach(agent) {
      terminal(
        `Team already has maximum ${maxTeamSize} members assigned. Agent '${agent.email}' will be ignored.`,
        "WARNING"
      );
      let ignoredObj = {
        "Division": importDivisionName,
        "Team Name": importTeamName,
        "Agent Email": agent.email,
        "invalid": true,
        "invalidReason": `Maximum team size (${maxTeamSize}) reached`,
      };
      invalidRecords.push(ignoredObj);
      sessionStorage.setItem(ignoredStorage, JSON.stringify(invalidRecords));
    }

    // function to add team members
    async function addMembers(teamId, membersToAdd) {
      terminal(`Adding members to team`, "INFO");
      const memberIdList = membersToAdd.map((obj) => obj.id);

      // create post body
      const addMembersBody = {
        "memberIds": memberIdList,
      };

      let result = await makeApiCallWithRetry(
        `/api/v2/teams/${teamId}/members`,
        "POST",
        addMembersBody
      );

      if ("failures" in result) {
        terminal(`Failures found in adding members!`, "ERROR");
        const fails = result.failures;
        fails.forEach((f) => terminal(JSON.stringify(f), "ERROR"));
      }

      return result;
    }

    if ("teamId" in item) {
      // handle if team already exists
      const currentTeams = JSON.parse(sessionStorage.getItem(pdWtStorage));
      const teamId = item.teamId;

      // check member count
      const teamMatch = currentTeams.find((team) => teamId === team.teamId);
      const currentMemberCount = teamMatch.memberCount;

      // up to here - checking max team size
      if (teamMatch) {
        terminal(
          `Team '${importTeamName}' (${teamId}) already exists with ${currentMemberCount} members`,
          "DEBUG"
        );
        if (importPersonsLength > 0) {
          // team exists and agents have been found
          terminal(
            `Importing ${importPersonsLength} agents to ${importTeamName}`,
            "INFO"
          );

          if (importPersonsLength + currentMemberCount < maxTeamSize) {
            // existing team size is less than max limit
            let updatedTeam = await addMembers(teamId, importAgentsList);
          } else {
            // existing team size will be greater than max limit
            const memberDiff = maxTeamSize - currentMemberCount;
            terminal(
              `Max team size will be breached! First ${memberDiff} agents will be imported to team`,
              "WARNING"
            );

            //split importAgentsList to fill up to maxTeamSize
            const keepList = importAgentsList.slice(0, memberDiff);
            terminal(
              `Agents to import list trimmed to ${JSON.stringify(keepList)}`,
              "DEBUG"
            );

            // split ignored agents to add to ignored agents list
            const dropList = importAgentsList.slice(
              memberDiff,
              importPersonsLength
            );
            terminal(
              `Agents ids being ignored are ${JSON.stringify(keepList)}`,
              "DEBUG"
            );

            let updatedTeam = await addMembers(teamId, keepList);
            dropList.forEach((agent) => maxTeamSizeBreach(agent));
          }

          terminal(`Team '${importTeamName}' (${teamId}) updated.`, "INFO");
        } else {
          // team exists but no agents found
          terminal(
            `No agents identified for import to '${importTeamName}'. Team will not be updated.`,
            "ERROR"
          );
        }
      } else {
        terminal(
          `Existing team not matched! Team will not be updated.`,
          "ERROR"
        );
        return;
      }
    } else {
      // handle if team does not yet exist
      terminal(`Team '${importTeamName}' needs to be created`, "DEBUG");
      if (importPersonsLength > 0) {
        // team to be created and agents have been found
        terminal(
          `Creating ${importTeamName} with ${importPersonsLength} agents`,
          "INFO"
        );
        const newTeamBody = {
          "name": importTeamName,
          "division": {
            "id": item.divisionId,
            "name": importDivisionName,
          },
        };
        let newTeam = await makeApiCallWithRetry(
          `/api/v2/teams`,
          "POST",
          newTeamBody
        );
        const newTeamId = newTeam.id;
        if (importPersonsLength < maxTeamSize) {
          // new team size is less than max limit
          let updatedTeam = await addMembers(newTeamId, addMembersBody);
        } else {
          // new team size is greater than max limit
          // add some code here
        }

        terminal(`Team '${importTeamName}' (${newTeamId}) created.`, "INFO");
      } else {
        // team doesn't exist yet but no agents have been found
        terminal(
          `No agents identified for import to '${importTeamName}'. Team will not be created.`,
          "ERROR"
        );
      }
    }
  }

  let importData = isData();

  // check agent ids and current teams
  terminal(`Step 1 of 3 - Matching agents in GC...`, "INFO");
  for (let t = 0; t < importData.length; t++) {
    terminal(
      `Getting agent details for team ${t + 1} of ${importData.length} - ${
        importData[t].teamName
      } (${importData[t].divisionName}).`,
      "INFO"
    );

    let checkedImportList = await importChecks(importData[t], t);
    if (checkedImportList) {
      terminal(`Agent checks complete`, "INFO");
      if (checkedImportList.length > 0) {
        terminal(JSON.stringify(checkedImportList), "DEBUG");
      } else {
        terminal(`No agents returned from agent checks`, "INFO");
        // add an ignore flag to not process team in step 3
        importData[t].ignore = true;
      }
      importData[t].agents = checkedImportList;
    }
  }

  // process deletions
  terminal(`Step 2 of 3 - Process team removals...`, "INFO");
  if (resolveMethod === "replace" && deletionsList.length > 0) {
    terminal(
      `Removing current team associations for agent team moves.`,
      "INFO"
    );
    terminal(
      `Found ${deletionsList.length} teams with members to remove`,
      "DEBUG"
    );
    terminal(JSON.stringify(deletionsList), "DEBUG");

    for (let d = 0; d < deletionsList.length; d++) {
      terminal(
        `Removing ${deletionsList[d].agents.length} agents from team id ${deletionsList[d].teamId}`,
        "INFO"
      );
      // delete current team before adding to import list
      let delResponse = await deleteCurrentTeam(deletionsList[d]);
      if (!delResponse) {
        terminal(`Process team removals ok`, "INFO");
        terminal(`Agents removed = ${deletionsList[d].agents}`, "DEBUG");
      }
    }
    terminal(`Team removals complete. Refreshing team list.`, "INFO");
    let newWtList = await getWts();
  } else {
    terminal(`No team removals needed`, "INFO");
  }

  // import :)
  terminal(`Step 3 of 3 - Importing teams...`, "INFO");
  for (let t = 0; t < importData.length; t++) {
    // have also added this condition in the event no agent can be matched and empty import persons is returned
    if (importData[t].agents.length > 0) {
      terminal(
        `Importing team ${t + 1} of ${importData.length} - ${
          importData[t].teamName
        } (${importData[t].divisionName}).`,
        "INFO"
      );
      await importTeam(importData[t], t);
      terminal(
        `Team ${t + 1} of ${importData.length} - ${importData[t].teamName} (${
          importData[t].divisionName
        }) complete.`,
        "INFO"
      );
    } else {
      terminal(
        `Skipping team ${t + 1} of ${importData.length} - ${
          importData[t].teamName
        } (${importData[t].divisionName}).`,
        "INFO"
      );
    }
  }

  let newWtList = await getWts();
  terminal(`${newWtList.length} teams now in GC`, "INFO");
  terminal(JSON.stringify(newWtList), "DEBUG");
  terminal(`All import tasks complete!`, "INFO");
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
    terminal(`File loaded! File name = '${filename}'`, "INFO");
    document.getElementById("file-name").value = filename;

    openLocalCSV(file, wtData, function (data) {});
  });
