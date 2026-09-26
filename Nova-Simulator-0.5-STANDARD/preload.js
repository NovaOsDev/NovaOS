const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("nova", {
  version: "0.1"
});
