// Get master tools array from tools.json
fetch("/wpt/tools.json")
  .then((response) => response.json())
  .then((toolsArray) => {
    // Get the breadcrumbs element
    const breadcrumbsDiv = document.getElementById("breadcrumbs");

    // Create the home breadcrumb
    const homeBreadcrumb = document.createElement("gux-breadcrumb-item");
    homeBreadcrumb.textContent = "Home";
    breadcrumbsDiv.appendChild(homeBreadcrumb);
    homeBreadcrumb.addEventListener("click", () => {
      window.location.href = "/wpt/wpt_home.html";
    });

    // Get document path to identify the page
    const path = window.location.pathname;

    // Check if path includes identifier attribute from each discipline in toolsArray
    toolsArray.forEach((discipline) => {
      if (path.includes(discipline.identifier)) {
        const disciplineBreadcrumb = document.createElement(
          "gux-breadcrumb-item"
        );
        disciplineBreadcrumb.textContent = discipline.discipline;
        breadcrumbsDiv.appendChild(disciplineBreadcrumb);
        disciplineBreadcrumb.addEventListener("click", () => {
          window.location.href = discipline.href;
        });

        // Loop through toolgroups to find the tool
        discipline.toolgroups.forEach((group) => {
          // Check if path is equal to href attribute from each tool in group
          group.tools.forEach((tool) => {
            if (path === tool.href) {
              const toolBreadcrumb = document.createElement(
                "gux-breadcrumb-item"
              );
              toolBreadcrumb.textContent = tool.tool;
              toolBreadcrumb.addEventListener("click", () => {
                window.location.href = tool.href;
              });
              breadcrumbsDiv.appendChild(toolBreadcrumb);
            }
          });
        });
      }
    });
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
