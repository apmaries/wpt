window.onload = function () {
  const token = sessionStorage.getItem("token");
  if (!token) {
    alert(`No token found! Redirecting to login page.`);
    sessionStorage.clear();
    window.location.href = "https://apmaries.github.io/wpt/index.html";
  }
  const authText = document.getElementById("authenticatedSubHeader");
  const oName = sessionStorage.getItem("org_name");
  authText.innerHTML = `Authenticated in: ${oName}`;
};
