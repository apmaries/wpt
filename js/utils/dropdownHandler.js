// Function to populate dropdowns with provided data

// Will make option.text to be item.name and option.value to be item.id
// All other attributes are added to option.dataset

export async function populateDropdown(dropdown, data) {
  if (data.length === 0) {
    dropdown.innerHTML = '<option value="">No data found</option>';
    return;
  }

  dropdown.innerHTML = "";
  data.forEach((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.text = item.name;
    Object.keys(item).forEach((key) => {
      if (key !== "id" && key !== "name") {
        option.dataset[key] = item[key];
      }
    });
    dropdown.appendChild(option);
  });
}
