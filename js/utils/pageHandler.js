// Module for common page handling functions

// Hide page loading and enable main content on page load
window.onload = function () {
  console.log("WPT: Page loaded...");
  document.getElementById("loading-section").style.display = "none";
  document.getElementsByTagName("main")[0].style.display = "block";
};

// Function to enable buttons
export function enableButtons() {
  const buttonsContainer = document.getElementById("buttons-group");
  const buttons = buttonsContainer.querySelectorAll("gux-button");
  for (let button of buttons) {
    button.removeAttribute("disabled");
  }
}
