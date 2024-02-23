window.onload = function () {
  const token = sessionStorage.getItem("token");
  if (!token) {
    sessionStorage.clear();
    alert(`Not authenticated. Redirecting to login page.`);
    //window.location.href = "https://apmaries.github.io/wpt/index.html";
  }
  const authText = document.getElementById("authenticatedSubHeader");
  const oName = sessionStorage.getItem("orgName");
  authText.innerHTML = `Authenticated in: ${oName}`;
};
