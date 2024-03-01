document.addEventListener("DOMContentLoaded", () => {
  const navItems = document.getElementById("nav-items");
  console.debug("navItems", navItems);
  const navObjects = [
    { href: "/pages/gf.html", text: "Gamification" },
    { href: "/pages/pd.html", text: "People & Directory" },
    { href: "/pages/qm.html", text: "Quality Management" },
    { href: "/pages/st.html", text: "Speech & Text Analytics" },
    { href: "/pages/wm.html", text: "Workforce Management" },
  ];

  navObjects.forEach((navObject) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.href = navObject.href;
    link.textContent = navObject.text;
    li.appendChild(link);
    navItems.appendChild(li);
    console.debug(`Added ${navObject.text} to nav`);
  });
});
