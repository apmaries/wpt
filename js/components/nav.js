// Get master tools array from tools.json
fetch("/wpt/tools.json")
  .then((response) => response.json())
  .then((toolsArray) => {
    // TODO: Add a sort for tools array in case any new added tools are not in the correct order

    // Get the nav items element
    const navItems = document.getElementById("nav-items");
    // Get document path to add active class to the current page
    const path = window.location.pathname;

    toolsArray.forEach((discipline) => {
      // Create the nav link
      const li = document.createElement("li");
      const link = document.createElement("a");

      // Set the link attributes
      link.href = discipline.href;
      link.textContent = discipline.discipline;
      if (path.includes(discipline.identifier)) {
        link.classList.add("active-nav-item");
      }

      // Append the link to the list item
      li.appendChild(link);
      navItems.appendChild(li);
    });
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
