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

        // Create cards for each tool group in discipline
        discipline.toolgroups.forEach((group) => {
          // Create a div and card for each tool group
          const groupDiv = document.createElement("div");
          const guxCardSecondary = document.createElement("gux-card-beta");

          // Set the card attributes
          guxCardSecondary.setAttribute("accent", "raised");
          guxCardSecondary.className = "secondary-card";

          // Create the card heading element and set it to the group name
          const cardHeading = document.createElement("h3");
          cardHeading.textContent = group.group;
          guxCardSecondary.appendChild(cardHeading);

          // Create cards for each tool in group

          // Append the group card to the group div
          groupDiv.appendChild(guxCardSecondary);

          // Append the group div to the primary card
          guxCardPrimary.appendChild(groupDiv);
        });

        // Append gux-card-beta to section
        section.appendChild(guxCardPrimary);

        // Append section to toolsContainer
        toolsContainer.appendChild(section);
      });
    }
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
