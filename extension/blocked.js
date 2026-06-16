document.getElementById("back-button")?.addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
  } else {
    location.href = "about:blank";
  }
});
