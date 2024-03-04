// Description: This file is responsible for populating tool info in index, navigation, breadcrumbs and tools container with items from the toolsArray array

// Master list of tools to add dynamically in pages
const toolsArray = [
  {
    identifier: "gf",
    href: "/wpt/pages/gf.html",
    discipline: "Gamification",
    toolgroups: [
      {
        group: "Profiles",
        tools: [
          {
            tool: "Replicate profile",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
    ],
  },
  {
    identifier: "pd",
    href: "/wpt/pages/pd.html",
    discipline: "People & Directory",
    toolgroups: [
      {
        group: "Groups",
        tools: [
          { tool: "Import groups", status: "", description: "", scopes: "" },
        ],
      },
      {
        group: "Queues & Skills",
        tools: [
          {
            tool: "Bulk update by group",
            status: "",
            description: "",
            scopes: "",
          },
          {
            tool: "Bulk update by WFM BU",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
      {
        group: "Roles & Permissions",
        tools: [
          {
            tool: "Copy customer role",
            status: "",
            description: "",
            scopes: "",
          },
          {
            tool: "Export permissions",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
      {
        group: "Users",
        tools: [
          {
            tool: "Bulk update users",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
      {
        group: "Work Teams",
        tools: [
          {
            tool: "Import work teams",
            status: "active",
            description: "Assign people to new or existing work teams.",
            scopes: ["groups", "users"],
          },
        ],
      },
    ],
  },
  {
    identifier: "qm",
    href: "/wpt/pages/qm.html",
    discipline: "Quality Management",
    toolgroups: [
      {
        group: "Policies",
        tools: [
          { tool: "Replicate policy", status: "", description: "", scopes: "" },
        ],
      },
    ],
  },
  {
    identifier: "st",
    href: "/wpt/pages/st.html",
    discipline: "Speech & Text Analytics",
    toolgroups: [
      {
        group: "Sentiment Feedback",
        tools: [
          {
            tool: "Export sentiment phrases",
            status: "",
            description: "",
            scopes: "",
          },
          {
            tool: "Import sentiment phrases",
            status: "active",
            description: "Import a list of sentiment phrases.",
            scopes: ["speech-and-text-analytics"],
          },
        ],
      },
      {
        group: "Topics",
        tools: [
          { tool: "Export topics", status: "", description: "", scopes: "" },
        ],
      },
    ],
  },
  {
    identifier: "wm",
    href: "/wpt/pages/wm.html",
    discipline: "Workforce Management",
    toolgroups: [
      {
        group: "Configuration",
        tools: [
          {
            tool: "Copy activity codes",
            status: "",
            description: "",
            scopes: "",
          },
          { tool: "Copy work plans", status: "", description: "", scopes: "" },
          {
            tool: "Export configiguration items",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
      {
        group: "Forecasts & Historical Data",
        tools: [
          {
            tool: "Export historical data",
            status: "active",
            description:
              "Exports 15-minute interval data for route paths in a specified WFM Business Unit.",
            scopes: ["workforce-management:readonly", "analytics:readonly"],
          },
          {
            tool: "Historical data import tool",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
      {
        group: "Schedules",
        tools: [
          { tool: "Import schedules", status: "", description: "", scopes: "" },
        ],
      },
      {
        group: "Time Off",
        tools: [
          {
            tool: "Import time off",
            status: "active",
            description: "Import a list of time off requests.",
            scopes: ["workforce-management", "users:readonly"],
          },
        ],
      },
    ],
  },
];

// TODO: Add a sort for tools array in case any new added tools are not in the correct order

// Get document path and identify the page
let page;
const path = window.location.pathname;
if (path.includes("/wpt/")) {
  page = path.replace("/wpt/", "").split(".")[0];
} else {
  page = path.split("/")[1].split(".")[0];
}
console.debug("WPT: populateTools path", path);
console.debug("WPT: populateTools page", page);

if (page === "index") {
  console.log("Populating index info");
  // Index page
  const element = document.getElementById("index-available-tools-accordian");
  console.log(element);

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
} else {
  // Populate the nav items
  const navItemsUl = document.getElementById("nav-items");

  // Create li item for each discipline
  toolsArray.forEach((discipline) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = discipline.href;
    a.textContent = discipline.discipline;
    li.appendChild(a);
    navItemsUl.appendChild(li);
  });
}
/*
// Populate the breadcrumbs container
const breadcrumbsDiv = document.getElementById("breadcrumbs");

const homeBreadcrumb = document.createElement("gux-breadcrumb-item");
homeBreadcrumb.textContent = "Home";
breadcrumbsDiv.appendChild(homeBreadcrumb);

let rootPath = window.location.pathname.includes("wpt") ? "/wpt" : "";

// Populate the tools container
const toolsContainer = document.getElementById("tools-container");

if (toolsContainer) {
  const path = window.location.pathname;
  console.log("tools path", path);
}
*/
