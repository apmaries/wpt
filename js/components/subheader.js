window.onload = function () {
  if (!window.origin.includes("127.0.0.1")) {
    const token = sessionStorage.getItem("token");
    if (!token) {
      alert(`No token found! Redirecting to login page.`);
      sessionStorage.clear();
      window.location.href = "https://apmaries.github.io/wpt/index.html";
    }
    const authText = document.getElementById("authenticatedSubHeader");
    const orgName = sessionStorage.getItem("org_name");
    const userName = sessionStorage.getItem("user_name");
    authText.innerHTML = `${userName} authenticated in: ${orgName}`;
  } else {
    console.log("WPT: Test mode active");
    // Update the subheader
    const authText = document.getElementById("authenticatedSubHeader");
    authText.innerHTML = `User Name authenticated in: Org Name`;
  }
};
