// Description: This file is responsible for populating tool info in index, navigation, breadcrumbs and tools container with items from the availableTools array

// Master list of tools to add dynamically in pages
const availableTools = [
  {
    identifier: "gf",
    href: "/wpt/pages/gf.html",
    text: "Gamification",
    toolgroups: [
      {
        group: "Profiles",
        tools: [
          {
            name: "Replicate profile",
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
    text: "People & Directory",
    toolgroups: [
      {
        group: "Groups",
        tools: [
          { name: "Import groups", status: "", description: "", scopes: "" },
        ],
      },
      {
        group: "Queues & Skills",
        tools: [
          {
            name: "Bulk update by group",
            status: "",
            description: "",
            scopes: "",
          },
          {
            name: "Bulk update by WFM BU",
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
            name: "Copy customer role",
            status: "",
            description: "",
            scopes: "",
          },
          {
            name: "Export permissions",
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
            name: "Bulk update users",
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
            name: "Import work teams",
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
    text: "Quality Management",
    toolgroups: [
      {
        group: "Policies",
        tools: [
          { name: "Replicate policy", status: "", description: "", scopes: "" },
        ],
      },
    ],
  },
  {
    identifier: "st",
    href: "/wpt/pages/st.html",
    text: "Speech & Text Analytics",
    toolgroups: [
      {
        group: "Sentiment Feedback",
        tools: [
          {
            name: "Export sentiment phrases",
            status: "",
            description: "",
            scopes: "",
          },
          {
            name: "Import sentiment phrases",
            status: "active",
            description: "Import a list of sentiment phrases.",
            scopes: ["speech-and-text-analytics"],
          },
        ],
      },
      {
        group: "Topics",
        tools: [
          { name: "Export topics", status: "", description: "", scopes: "" },
        ],
      },
    ],
  },
  {
    identifier: "wm",
    href: "/wpt/pages/wm.html",
    text: "Workforce Management",
    toolgroups: [
      {
        group: "Configuration",
        tools: [
          {
            name: "Copy activity codes",
            status: "",
            description: "",
            scopes: "",
          },
          { name: "Copy work plans", status: "", description: "", scopes: "" },
          {
            name: "Export configiguration items",
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
            name: "Export historical data",
            status: "active",
            description:
              "Exports 15-minute interval data for route paths in a specified WFM Business Unit.",
            scopes: ["workforce-management:readonly", "analytics:readonly"],
          },
          {
            name: "Historical data import tool",
            status: "",
            description: "",
            scopes: "",
          },
        ],
      },
      {
        group: "Schedules",
        tools: [
          { name: "Import schedules", status: "", description: "", scopes: "" },
        ],
      },
      {
        group: "Time Off",
        tools: [
          {
            name: "Import time off",
            status: "active",
            description: "Import a list of time off requests.",
            scopes: ["workforce-management", "users:readonly"],
          },
        ],
      },
    ],
  },
];

// Get document path and identify the page
const path = window.location.pathname;
console.debug("populateTools path", path);

// Index page

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
