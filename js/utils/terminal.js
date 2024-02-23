// function to set log level
function setLogLevel() {
  var ele = document.getElementsByName("log-level");
  for (i = 0; i < ele.length; i++) {
    if (ele[i].checked) {
      return ele[i].value;
    }
  }
}

// function to populate terminal window
function terminal(message, type) {
  const logLevel = setLogLevel();
  const d = new Date();
  let nowISO8601 = d.toISOString();
  let style;
  if (type === "DEBUG") {
    style = "white";
  } else if (type === "INFO") {
    style = "lime-green";
  } else if (type === "WARNING") {
    style = "yellow";
  } else {
    style = "red";
  }

  if (logLevel === "DEBUG") {
    // debug level - allow all through
    $(".terminal").append(
      `<p class='log-entry' style='color: ${style}'>` +
        nowISO8601 +
        "; " +
        type +
        "; " +
        message +
        "</p>"
    );
  } else if (logLevel === "INFO") {
    // info level - ignore debug
    if (type !== "DEBUG") {
      $(".terminal").append(
        `<p class='log-entry' style='color: ${style}'>` +
          nowISO8601 +
          "; " +
          type +
          "; " +
          message +
          "</p>"
      );
    } else {
      // ignore debug level
    }
  } else {
    // warning or error level
    if (type === "WARNING") {
      $(".terminal").append(
        `<p class='log-entry' style='color: ${style}'>` +
          nowISO8601 +
          "; " +
          type +
          "; " +
          message +
          "</p>"
      );
    } else if (type === "ERROR") {
      $(".terminal").append(
        `<p class='log-entry' style='color: ${style}'>` +
          nowISO8601 +
          "; " +
          type +
          "; " +
          message +
          "</p>"
      );
    } else {
      // ignore info and debug levels
    }
  }

  const smoothScroll = () => {
    const element = $(`#terminal`);
    element.stop().animate(
      {
        scrollTop: element.prop("scrollHeight"),
      },
      500
    );
  };
  smoothScroll("terminal-window");
}

// function to clear terminal window
function clearTerminal(...storageKeys) {
  $(".terminal").empty();
  $("input[type=file]").val("");

  storageKeys.forEach((key) => {
    sessionStorage.removeItem(key);
  });
}
