document.addEventListener("DOMContentLoaded", () => {
  const breadcrumbsDiv = document.getElementById("breadcrumbs");

  const homeBreadcrumb = document.createElement("gux-breadcrumb-item");
  homeBreadcrumb.textContent = "Home";
  breadcrumbsDiv.appendChild(homeBreadcrumb);

  const pageBreadcrumbs = [
    { href: "/pages/gf.html", text: "Gamification" },
    { href: "/pages/pd.html", text: "People & Directory" },
    { href: "/pages/qm.html", text: "Quality Management" },
    { href: "/pages/st.html", text: "Speech & Text Analytics" },
    { href: "/pages/wm.html", text: "Workforce Management" },
  ];

  // Get document path and identify the page
  const path = window.location.pathname;
  const pageIdentifier = path.split("/")[2]?.split(".")[0];

  /*
	<gux-breadcrumb-item href="../../wpt.html"
	>WEM Power Tools</gux-breadcrumb-item
	>
	<gux-breadcrumb-item href="../wm.html"
	>Parent Nav</gux-breadcrumb-item
	>
	<gux-breadcrumb-item>Tool Name</gux-breadcrumb-item>
	</gux-breadcrumbs> */
});
