// Description: This file contains helper functions for js files.

// function to convert hours to minutes
function convertH2M(timeInHour) {
  var timeParts = timeInHour.split(":");
  return Number(timeParts[0]) * 60 + Number(timeParts[1]);
}

// function to make HH:MM format
function toHoursAndMinutes(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${padToTwoDigits(hours)}:${padToTwoDigits(minutes)}`;
}

// function to pad to 2 digits
function padToTwoDigits(num) {
  return num.toString().padStart(2, "0");
}

export { convertH2M, toHoursAndMinutes, padToTwoDigits };
