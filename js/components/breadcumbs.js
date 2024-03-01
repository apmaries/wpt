document.addEventListener("DOMContentLoaded", () => {
  const breadcrumbsDiv = document.getElementById("breadcrumbs");

  const homeBreadcrumb = document.createElement("gux-breadcrumb-item");
  homeBreadcrumb.textContent = "Home";
  breadcrumbsDiv.appendChild(homeBreadcrumb);

  const rootPath = window.location.pathname.includes("wpt") ? "/wpt" : "";
  const pageBreadcrumbs = [
    {
      identifier: "gf",
      href: `${rootPath}/pages/gf.html`,
      text: "Gamification",
    },
    {
      identifier: "pd",
      href: `${rootPath}/pages/pd.html`,
      text: "People & Directory",
    },
    {
      identifier: "qm",
      href: `${rootPath}/pages/qm.html`,
      text: "Quality Management",
    },
    {
      identifier: "st",
      href: `${rootPath}/pages/st.html`,
      text: "Speech & Text Analytics",
    },
    {
      identifier: "wm",
      href: `${rootPath}/pages/wm.html`,
      text: "Workforce Management",
    },
  ];

  // Get document path and identify the page
  const path = window.location.pathname;
  const pageIdentifier = path.split("/")[2]?.split(".")[0];
  console.debug("pageIdentifier", pageIdentifier);

  // Create the page breadcrumb
  if (pageIdentifier) {
    // Find the page object
    const pageObject = pageBreadcrumbs.find(
      (page) => page.identifier === pageIdentifier
    );
    // Create the page breadcrumb
    const pageBreadcrumb = document.createElement("gux-breadcrumb-item");
    pageBreadcrumb.textContent = pageObject.text;
    pageBreadcrumb.href = pageObject.href;
    breadcrumbsDiv.appendChild(pageBreadcrumb);
  }

  // Create the active page breadcrumb
});
