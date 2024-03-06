// Function to populate dropdowns with provided data

// Will make option.text to be item.name and option.value to be item.id
// All other attributes are added to option.dataset

export async function populateDropdown(dropdown, data) {
  if (data.length === 0) {
    dropdown.innerHTML = '<gux-option value="">No data found</gux-option>';
    return;
  }

  // sort data by name (not case sensitive)
  data.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );

  dropdown.innerHTML = "";
  data.forEach((item) => {
    const option = document.createElement("gux-option");
    option.value = item.id;
    option.innerHTML = item.name;
    dropdown.appendChild(option);
  });
}
