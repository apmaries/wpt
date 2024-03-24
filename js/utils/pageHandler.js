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

// Function to hide additional loading spinners - send the element id to unhide and function will hide the previous sibling element
export function hidePreviousElement(id) {
  const element = document.getElementById(id);
  if (element && element.previousElementSibling) {
    // Make sure the previous element is a loading spinner
    if (
      element.previousElementSibling.getAttribute("name") == "loading-section"
    ) {
      // Hide the previous loading spinner
      element.previousElementSibling.style.display = "none";

      // Unhide the element
      element.style.display = "block";
    }
  } else {
    console.log(
      `WPT: Ateempting to hide previous loading-spinner element failed for ${id}`
    );
  }
}
