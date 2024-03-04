// Get master tools array from tools.json
fetch("/wpt/tools.json")
  .then((response) => response.json())
  .then((toolsArray) => {
    const breadcrumbsDiv = document.getElementById("breadcrumbs");

    const homeBreadcrumb = document.createElement("gux-breadcrumb-item");
    homeBreadcrumb.textContent = "Home";
    breadcrumbsDiv.appendChild(homeBreadcrumb);
    homeBreadcrumb.addEventListener("click", () => {
      window.location.href = "/wpt/wpt_home.html";
    });

    // Get document path and identify the page
    const path = window.location.pathname;
    console.debug("breadcrumb path", path);

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

        // Check if path includes identifier attribute from each toolgroup in discipline
        discipline.toolgroups.forEach((group) => {
          if (path.includes(group.identifier)) {
            const groupBreadcrumb = document.createElement(
              "gux-breadcrumb-item"
            );
            groupBreadcrumb.textContent = group.group;
            breadcrumbsDiv.appendChild(groupBreadcrumb);
            groupBreadcrumb.addEventListener("click", () => {
              window.location.href = group.href;
            });

            // Check if path includes identifier attribute from each tool in group
            group.tools.forEach((tool) => {
              if (path.includes(tool.identifier)) {
                const toolBreadcrumb = document.createElement(
                  "gux-breadcrumb-item"
                );
                toolBreadcrumb.textContent = tool.tool;
                breadcrumbsDiv.appendChild(toolBreadcrumb);
              }
            });
          }
        });
      }
    });
  })
  .catch((error) => {
    console.error("WPT: Error fetching tools.json", error);
  });
