// Get master tools array from tools.json
fetch("/wpt/tools.json")
  .then((response) => response.json())
  .then((toolsArray) => {
    // TODO: Add a sort for tools array in case any new added tools are not in the correct order

    const toolsContainer = document.getElementById("tools-container");
    const path = window.location.pathname;

    // WPT Home
    if (path.includes("wpt-home.html")) {
      toolsArray.array.forEach((discipline) => {
        // Create a elements for each discipline card
        const section = document.createElement("section");
        const guxCard = document.createElement("gux-card-beta");

        // Set the card attributes
        guxCard.accent = "raised";
        guxCard.className = "primary-card";

        // Create the card heading element and set it to the discipline name
        const cardHeading = document.createElement("h3");
        cardHeading.textContent = discipline.discipline;
        console.log(discipline.discipline);
        guxCard.appendChild(cardHeading);

        // Append gux-card-beta to section
        section.appendChild(guxCard);

        // Append section to toolsContainer
        toolsContainer.appendChild(section);
      });
    }
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
