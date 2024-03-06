// Get master tools array from tools.json
fetch("/wpt/tools.json")
  .then((response) => response.json())
  .then((toolsArray) => {
    // TODO: Add a sort for tools array in case any new added tools are not in the correct order

    console.log("WTP: Populating index info");

    // Create an empty map to store accordions by discipline
    const accordions = new Map();

    toolsArray.forEach((discipline) => {
      discipline.toolgroups.forEach((group) => {
        group.tools.forEach((tool) => {
          if (tool.status === "active") {
            // If an accordion for this discipline doesn't exist, create it
            if (!accordions.has(discipline.discipline)) {
              const accordianItem = document.createElement(
                "gux-accordion-section"
              );
              accordianItem.setAttribute("arrow-position", "before-text");

              const headerSlot = document.createElement("h2");
              headerSlot.slot = "header";
              headerSlot.textContent = discipline.discipline;
              accordianItem.appendChild(headerSlot);

              accordions.set(discipline.discipline, accordianItem);
            }

            // Get the accordion for this discipline
            const accordianItem = accordions.get(discipline.discipline);

            const contentSlot = document.createElement("div");
            contentSlot.slot = "content";

            const toolHeader = document.createElement("h4");
            toolHeader.slot = "header";
            toolHeader.textContent = tool.tool;
            contentSlot.appendChild(toolHeader);

            const toolDescription = document.createElement("p");
            toolDescription.slot = "content";
            toolDescription.textContent = tool.description;
            contentSlot.appendChild(toolDescription);

            const scopesSlot = document.createElement("div");
            scopesSlot.slot = "content";

            const scopesHeader = document.createElement("p");
            scopesHeader.textContent = "Required scopes:";
            scopesSlot.appendChild(scopesHeader);

            const scopesList = document.createElement("ul");
            tool.scopes.forEach((scope) => {
              const scopeItem = document.createElement("li");
              scopeItem.textContent = scope;
              scopesList.appendChild(scopeItem);
            });
            scopesSlot.appendChild(scopesList);
            contentSlot.appendChild(scopesSlot);

            accordianItem.appendChild(contentSlot);
          }
        });
      });
    });

    // Append all accordions to the main accordion
    const mainAccordion = document.getElementById(
      "index-available-tools-accordian"
    );
    accordions.forEach((accordion) => {
      mainAccordion.appendChild(accordion);
    });
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
