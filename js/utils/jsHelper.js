// Description: This file contains helper functions for js files.

// function to get value of a radio buttons
export function getRadioValue(ele) {
  for (let i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      return ele[i].value;
    }
  }
}

// function to convert hours to minutes
export function convertH2M(timeInHour) {
  var timeParts = timeInHour.split(":");
  return Number(timeParts[0]) * 60 + Number(timeParts[1]);
}

// function to make HH:MM format
export function toHoursAndMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${padToTwoDigits(hours)}:${padToTwoDigits(minutes)}`;
}

// function to pad to 2 digits
export function padToTwoDigits(num) {
  return num.toString().padStart(2, "0");
}
