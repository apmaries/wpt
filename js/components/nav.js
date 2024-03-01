document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.getElementById("nav-items");

  const rootPath = window.location.pathname.includes("wpt") ? "/wpt" : "";
  const navObjects = [
    { href: `${rootPath}/pages/gf.html`, text: "Gamification" },
    { href: `${rootPath}/pages/pd.html`, text: "People & Directory" },
    { href: `${rootPath}/pages/qm.html`, text: "Quality Management" },
    { href: `${rootPath}/pages/st.html`, text: "Speech & Text Analytics" },
    { href: `${rootPath}/pages/wm.html`, text: "Workforce Management" },
  ];

  navObjects.forEach((navObject) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = navObject.href;
    link.textContent = navObject.text;
    li.appendChild(link);
    navItems.appendChild(li);
  });

  // Check document page and set active class
  const path = window.location.pathname;

  // Extract the page identifier from the path
  const pageIdentifier = path.split("/")[2]?.split(".")[0];

  const navLinks = document.querySelectorAll("#nav-items a");
  navLinks.forEach((navLink) => {
    if (
      pageIdentifier &&
      navLink.getAttribute("href").includes(pageIdentifier)
    ) {
      navLink.classList.add("active-nav-item");
    }
  });
});
