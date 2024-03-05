// Get master tools array from tools.json
fetch("/wpt/tools.json")
  .then((response) => response.json())
  .then((toolsArray) => {
    // TODO: Add a sort for tools array in case any new added tools are not in the correct order

    const toolsContainer = document.getElementById("tools-container");
    const path = window.location.pathname;
    console.log(path);

    // WPT Home
    if (path.includes("wpt-home.html")) {
      toolsArray.forEach((discipline) => {
        // Create a elements for each discipline card
        const section = document.createElement("section");
        const guxCardPrimary = document.createElement("gux-card-beta");

        // Set the card attributes
        guxCardPrimary.setAttribute("accent", "raised");
        guxCardPrimary.className = "primary-card";

        // Create the card heading element and set it to the discipline name
        const cardHeading = document.createElement("h2");
        cardHeading.textContent = discipline.discipline;
        console.log(discipline.discipline);
        guxCardPrimary.appendChild(cardHeading);

        const cardsDiv = document.createElement("div");
        cardsDiv.id = "cards-div";
        guxCardPrimary.appendChild(cardsDiv);

        // Create cards for each tool group in discipline
        discipline.toolgroups.forEach((group) => {
          // Create a div, card and a ul for each tool group
          const groupDiv = document.createElement("div");
          const guxCardSecondary = document.createElement("gux-card-beta");
          const ul = document.createElement("ul");

          // Set the card attributes
          guxCardSecondary.setAttribute("accent", "raised");
          guxCardSecondary.className = "secondary-card";

          // Create the card heading element and set it to the group name
          const cardHeading = document.createElement("h4");
          cardHeading.textContent = group.group;
          guxCardSecondary.appendChild(cardHeading);

          // Attach the ul to the secondary card
          guxCardSecondary.appendChild(ul);

          // Create cards for each tool in group
          group.tools.forEach((tool) => {
            // Create a li for each tool
            const li = document.createElement("li");
            const toolLink = document.createElement("a");

            // Set link attributes if tool is active
            if (tool.status === "active") {
              toolLink.href = tool.href;
              toolLink.textContent = tool.tool;
            } else {
              toolLink.textContent = tool.tool + " (coming soon)";
              toolLink.style.color = "grey";
            }
            li.appendChild(toolLink);

            ul.appendChild(li);
          });

          // Append the group card to the group div
          groupDiv.appendChild(guxCardSecondary);

          // Append the group div to the cards div
          cardsDiv.appendChild(groupDiv);
        });

        // Append gux-card-beta to section
        section.appendChild(guxCardPrimary);

        // Append section to toolsContainer
        toolsContainer.appendChild(section);
      });
    }
    // Sub pages
    else {
      // Parent page
      if (toolsContainer) {
        // Sub page with container using id="tools-container"
        console.log("WPT: Not wpt-home.html", toolsContainer);
        // Match sub page by path including discipline identifier
        toolsArray.forEach((discipline) => {
          if (path.includes(discipline.identifier)) {
            // Create a elements for each discipline card
            const section = document.createElement("section");
            const guxCardPrimary = document.createElement("gux-card-beta");

            // Set the card attributes
            guxCardPrimary.setAttribute("accent", "raised");
            guxCardPrimary.className = "primary-card";

            // Create the card heading element and set it to the discipline name
            const cardHeading = document.createElement("h2");
            cardHeading.textContent = discipline.discipline;
            console.log(discipline.discipline);
            guxCardPrimary.appendChild(cardHeading);

            const cardsDiv = document.createElement("div");
            cardsDiv.id = "cards-div";
            guxCardPrimary.appendChild(cardsDiv);

            // Create cards for each tool group in discipline
            discipline.toolgroups.forEach((group) => {
              // Create a div, card and a ul for each tool group
              const groupDiv = document.createElement("div");
              const guxCardSecondary = document.createElement("gux-card-beta");
              const ul = document.createElement("ul");

              // Set the card attributes
              guxCardSecondary.setAttribute("accent", "raised");
              guxCardSecondary.className = "secondary-card";

              // Create the card heading element and set it to the group name
              const cardHeading = document.createElement("h4");
              cardHeading.textContent = group.group;
              guxCardSecondary.appendChild(cardHeading);

              // Attach the ul to the secondary card
              guxCardSecondary.appendChild(ul);

              // Create cards for each tool in group
              group.tools.forEach((tool) => {
                // Create a li for each tool
                const li = document.createElement("li");
                const toolLink = document.createElement("a");

                // Set link attributes if tool is active
                if (tool.status === "active") {
                  toolLink.href = tool.href;
                  toolLink.textContent = tool.tool;
                  toolLink.style.fontWeight = 500;
                } else {
                  toolLink.textContent = tool.tool + " (coming soon)";
                  toolLink.style.color = "grey";
                  toolLink.style.fontWeight = 300;
                }
                li.appendChild(toolLink);

                ul.appendChild(li);
              });

              // Append the group card to the group div
              groupDiv.appendChild(guxCardSecondary);

              // Append the group div to the primary card
              cardsDiv.appendChild(groupDiv);
            });

            // Append gux-card-beta to section
            section.appendChild(guxCardPrimary);

            // Append section to toolsContainer
            toolsContainer.appendChild(section);
          }
        });
      }
      // Tool page
      else {
        const toolInfoDiv = document.getElementById("tool-info-div");
        const toolInfoContainer = document.createElement("container");
        toolInfoContainer.id = "tool-info-container";

        try {
          // Find the tool in tools.js using path to match with tool href
          toolsArray.forEach((discipline) => {
            discipline.toolgroups.forEach((group) => {
              group.tools.forEach((tool) => {
                if (path === tool.href) {
                  // Create a h1 for the tool name
                  const toolHeading = document.createElement("h1");
                  toolHeading.textContent = tool.tool;
                  toolInfoDiv.appendChild(toolHeading);

                  // Create a p for the tool description
                  const toolDescription = document.createElement("p");
                  toolDescription.textContent = tool.description;
                  toolInfoDiv.appendChild(toolDescription);

                  // Create a gux-accordian for the tool info card and append it to the card
                  const toolInfoGuxAccordian =
                    document.createElement("gux-accordion");
                  toolInfoContainer.appendChild(toolInfoGuxAccordian);

                  // Create a gux-accordian-section for the tool info and append it to the accordian
                  const toolInfoGuxAccordianSection = document.createElement(
                    "gux-accordion-section"
                  );
                  toolInfoGuxAccordianSection.setAttribute(
                    "arrow-position",
                    "before-text"
                  );
                  toolInfoGuxAccordian.appendChild(toolInfoGuxAccordianSection);

                  // Create a h2 for the tool info
                  const toolInfoHeading = document.createElement("h2");
                  toolInfoHeading.setAttribute("slot", "header");
                  toolInfoHeading.textContent = "Tool Information";
                  toolInfoGuxAccordianSection.appendChild(toolInfoHeading);

                  // Create a div for the tool info content
                  const toolInfoContent = document.createElement("div");
                  toolInfoContent.setAttribute("slot", "content");
                  toolInfoGuxAccordianSection.appendChild(toolInfoContent);

                  // Create the ul and li's for tool info - taken from tools.js
                  const toolInfoUl = document.createElement("ul");
                  toolInfoContent.appendChild(toolInfoUl);
                  const toolInfo = tool.info;

                  // Split tool info string into an array by . Remove any leading spaces and empty strings
                  const toolInfoArray = toolInfo.split(".");
                  const toolInfoArrayFiltered = toolInfoArray.filter(
                    (item) => item !== ""
                  );
                  toolInfoArrayFiltered.forEach((info) => {
                    const toolInfoLi = document.createElement("li");
                    toolInfoLi.textContent = info;
                    toolInfoUl.appendChild(toolInfoLi);
                  });

                  // Create a gux-accordian-section for the required scopes and append it to the accordian
                  const toolScopesGuxAccordianSection = document.createElement(
                    "gux-accordion-section"
                  );
                  toolScopesGuxAccordianSection.setAttribute(
                    "arrow-position",
                    "before-text"
                  );
                  toolInfoGuxAccordian.appendChild(
                    toolScopesGuxAccordianSection
                  );

                  // Create a h2 for the required scopes
                  const toolScopesHeading = document.createElement("h2");
                  toolScopesHeading.setAttribute("slot", "header");
                  toolScopesHeading.textContent = "Required Scopes";
                  toolScopesGuxAccordianSection.appendChild(toolScopesHeading);

                  // Create a div for required scopes content
                  const scopesContent = document.createElement("div");
                  scopesContent.setAttribute("slot", "content");
                  toolScopesGuxAccordianSection.appendChild(scopesContent);

                  // Create the ul and li's for required scopes - taken from tools.js
                  const scopesUl = document.createElement("ul");
                  scopesContent.appendChild(scopesUl);
                  const scopes = tool.scopes;

                  // Loop through the scopes array and create a li for each scope
                  scopes.forEach((scope) => {
                    const scopeLi = document.createElement("li");
                    scopeLi.textContent = scope;
                    scopesUl.appendChild(scopeLi);
                  });

                  // Append the tool info container to the tool info div
                  toolInfoDiv.appendChild(toolInfoContainer);
                }
              });
            });
          });
        } catch (error) {
          console.error("WPT: Error creating tool info", error);
        }
      }
    }
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
