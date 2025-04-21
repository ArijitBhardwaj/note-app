// Keep extension alive
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "keepAlive") {
    setTimeout(() => port.disconnect(), 250e3);
    port.onDisconnect.addListener(() => {
      if (chrome.runtime.lastError) {
        console.log("Disconnect error:", chrome.runtime.lastError);
      }
    });
  }
});
