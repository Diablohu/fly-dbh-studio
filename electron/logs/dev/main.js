/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/koot-electron/index.js":
/*!*********************************************!*\
  !*** ./node_modules/koot-electron/index.js ***!
  \*********************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const {
  app,
  BrowserWindow,
  screen
} = __webpack_require__(/*! electron */ "electron");

// ============================================================================

const createWindow = (options = {}) => {
  const {
    width,
    height
  } = screen.getPrimaryDisplay().workAreaSize;
  const defaults = {
    width: Math.floor(width * 0.8),
    height: Math.floor(height * 0.8),
    webPreferences: {
      nodeIntegration: true
    }
  };

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    ...defaults,
    ...options
  });

  // Open the DevTools.
  if (true) {
    if (true) {
      mainWindow.loadURL(`http://localhost:${({}).SERVER_PORT || "3088"}`);
      mainWindow.webContents.openDevTools();
    }
  } else {}
  return mainWindow;
};

// ============================================================================

const initApp = (createWindowOptions = {}) => {
  function doCreateWindow() {
    createWindow(createWindowOptions);
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    doCreateWindow();
    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) doCreateWindow();
    });
  });

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') app.quit();
  });

  // In this file you can include the rest of your app's specific main process
  // code. You can also put them in separate files and require them here.
};
module.exports = {
  initApp,
  createWindow
};

/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

"use strict";
module.exports = require("electron");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!********************************************!*\
  !*** ./node_modules/koot-electron/main.js ***!
  \********************************************/
(__webpack_require__(/*! ./index.js */ "./node_modules/koot-electron/index.js").initApp)();
})();

/******/ })()
;
//# sourceMappingURL=main.js.map