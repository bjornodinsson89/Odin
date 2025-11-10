// ==UserScript==
// @name         Odin Tools
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Faction Tools
// @author       BjornOdinsson89
// @match        https://www.torn.com/*
// @match        https://www2.torn.com/*
// @updateURL    https://raw.githubusercontent.com/BjornOdinsson89/Odin/main/Odin.meta.js
// @downloadURL  https://raw.githubusercontent.com/BjornOdinsson89/Odin/main/Odin.user.js
// @grant        GM_notification
// @grant        GM_xmlhttpRequest
// @grant        GM_addElement
// @connect      github.com
// @connect      raw.githubusercontent.com
// @connect      api.torn.com
// @connect      worldtimeapi.org
// ==/UserScript==

'use strict';

const dbName = "OdinDB";
const dbVersion = 3;
const maxTargets = 50;

let dbInstance = null;

async function getDB() {
  if (dbInstance === null) {
    dbInstance = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, dbVersion);
      request.onerror = (event) => reject("IndexedDB error: " + (event.target.error ? event.target.error.message : "Unknown"));
      request.onsuccess = (event) => resolve(event.target.result);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("cache")) {
          db.createObjectStore("cache", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("targets")) {
          db.createObjectStore("targets", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("warTargets")) {
          db.createObjectStore("warTargets", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("factionMembers")) {
          db.createObjectStore("factionMembers", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("rankedWars")) {
          db.createObjectStore("rankedWars", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("enemyFactions")) {
          db.createObjectStore("enemyFactions", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("errors")) {
          db.createObjectStore("errors", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }
  return dbInstance;
}

/* … ALL YOUR DB FUNCTIONS UNCHANGED … */

async function getFromDB(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get(key);
    request.onerror = (event) => reject("Get error: " + (event.target.error ? event.target.error.message : "Unknown"));
    request.onsuccess = (event) => resolve(event.target.result ? event.target.result.value : null);
  });
}

async function setToDB(storeName, key, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.put({ key, value });
    request.onerror = (event) => {
      if (event.target.error.name === 'QuotaExceededError') {
        GM_notification("Storage full - attempting to clear cache.");
        clearStore('cache').then(() => {
          const retryRequest = store.put({ key, value });
          retryRequest.onsuccess = () => resolve();
          retryRequest.onerror = (event) => {
            if (event.target.error.name === 'QuotaExceededError') {
              GM_notification("Storage still full - clearing all stores.");
              clearAllStores().then(() => {
                const finalRetry = store.put({ key, value });
                finalRetry.onsuccess = () => resolve();
                finalRetry.onerror = (event) => reject("Final put error: " + (event.target.error ? event.target.error.message : "Unknown"));
              }).catch(() => reject("Failed to clear all stores."));
            } else {
              reject("Put error: " + (event.target.error ? event.target.error.message : "Unknown"));
            }
          };
        }).catch(() => reject("Failed to clear cache."));
      } else {
        reject("Put error: " + (event.target.error ? event.target.error.message : "Unknown"));
      }
    };
    request.onsuccess = () => resolve();
  });
}

async function deleteFromDB(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = (event) => reject("Delete error: " + (event.target.error ? event.target.error.message : "Unknown"));
    request.onsuccess = () => resolve();
  });
}

async function loadAllFromStore(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onerror = (event) => reject("GetAll error: " + (event.target.error ? event.target.error.message : "Unknown"));
    request.onsuccess = (event) => resolve(event.target.result);
  });
}

async function clearStore(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.clear();
    request.onerror = (event) => reject("Clear error: " + (event.target.error ? event.target.error.message : "Unknown"));
    request.onsuccess = () => resolve();
  });
}

async function clearAllStores() {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const stores = ['cache', 'targets', 'warTargets', 'factionMembers', 'rankedWars', 'enemyFactions', 'errors', 'settings'];
    const transaction = db.transaction(stores, "readwrite");
    let cleared = 0;
    stores.forEach(storeName => {
      const store = transaction.objectStore(storeName);
      const request = store.clear();
      request.onsuccess = () => {
        cleared++;
        if (cleared === stores.length) resolve();
      };
      request.onerror = (event) => reject("Clear error in " + storeName + ": " + (event.target.error ? event.target.error.message : "Unknown"));
    });
  });
}

const styleElement = document.createElement('style');
styleElement.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Pirata+One&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Arial&family=Helvetica&family=Times+New+Roman&family=Courier&family=Courier+New&family=Georgia&family=Verdana&family=Tahoma&family=Trebuchet+MS&family=Palatino&family=Garamond&family=Bookman&family=Comic+Sans+MS&family=Impact&family=Lucida+Sans+Unicode&family=Geneva&family=Monaco&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Roboto&family=Open+Sans&family=Lato&family=Montserrat&family=Raleway&family=Poppins&family=Oswald&family=Source+Sans+Pro&family=Nunito&family=Ubuntu&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Bangers&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Shadows+Into+Light&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Indie+Flower&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Lobster&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Chewy&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Nosifer&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Creepster&display=swap');
  @import url('https://fonts.googleapis.com/css2?family=Bungee&display=swap');

  #odin-overlay {
    color: var(--font-color);
    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
    box-shadow: 0 8px 32px rgba(0,0,0,0.6), var(--neon-glow);
    border-radius: 12px;
    font-family: var(--font-family), monospace;
    transition: all 0.3s ease;
    padding: 20px 10px 10px 10px;
    position: fixed !important;
  }

  #odin-overlay * {
    font-family: var(--font-family), monospace;
  }

  .odin-menu-btn, #odin-overlay button, #odin-overlay input, #odin-overlay select, #odin-overlay table th, #odin-overlay table td, #odin-overlay h3, #odin-overlay h4, #odin-overlay p, #odin-overlay a, #odin-overlay label, #tct-clock {
    font-family: var(--font-family), monospace;
  }

  #odin-menu {
    display: flex;
    justify-content: flex-start;
    border-bottom: 1px solid #404040;
    margin-bottom: 0;
    overflow-x: auto;
    white-space: nowrap;
    padding-left: 1.5%;
    background: #252525;
    position: relative;
    z-index: 20;
  }

  .odin-menu-btn {
    background: #303030;
    color: var(--font-color);
    border: 1px solid #505050;
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    padding: 8px 12px;
    margin: 0 4px 0 0;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2), var(--neon-glow);
  }

  .odin-menu-btn:hover {
    background: #404040;
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3), var(--neon-glow);
  }

  .odin-menu-btn.active {
    background: #252525;
    border: 1px solid #505050;
    border-bottom: none;
    box-shadow: 0 0 8px var(--neon-color), var(--neon-glow);
    color: var(--neon-color);
  }

  .odin-menu-btn:active {
    transform: scale(0.98);
    background-color: #353535;
  }

  #odin-overlay button {
    background: linear-gradient(135deg, #303030, #404040);
    color: var(--font-color);
    border: 1px solid #505050;
    padding: 4px 8px;
    cursor: pointer;
    font-size: 12px;
    transition: all 0.2s ease;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2), var(--neon-glow);
  }

  #odin-overlay button:hover {
    background: linear-gradient(135deg, #404040, #505050);
    color: #ffffff;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.3), var(--neon-glow);
  }

  #odin-overlay button:active {
    transform: scale(0.98);
    background: #353535;
  }

  #odin-overlay input, #odin-overlay select {
    background: #252525;
    color: var(--font-color);
    border: 1px solid #505050;
    padding: 8px;
    font-size: 14px;
    border-radius: 6px;
    transition: all 0.2s ease;
  }

  #odin-overlay input:focus, #odin-overlay select:focus {
    border-color: var(--neon-color);
    box-shadow: 0 0 4px var(--neon-color), var(--neon-glow);
  }

  #odin-overlay table {
    color: var(--font-color);
    min-width: 100%;
    border-collapse: separate;
    border-spacing: 0 4px;
    table-layout: fixed;
    background: #252525;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: var(--neon-glow);
  }

  #odin-overlay h3 {
    color: var(--header-color);
    margin: 16px 0 12px;
    text-align: center;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    font-weight: 700;
  }

  #odin-overlay .faction-header {
    color: var(--header-color);
    text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
  }

  #odin-overlay p {
    color: var(--font-color);
    margin: 12px 0;
    text-align: center;
  }

  #odin-overlay table th, #odin-overlay table td {
    border: 1px solid #404040;
    padding: 8px 12px;
    word-break: break-word;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
    color: var(--font-color) !important;
    background: #303030;
  }

  #odin-overlay table th {
    background: #252525;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--neon-color);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  #odin-section-content {
    margin-top: 10px;
    padding-left: 3px;
    padding-right: 3px;
  }

  #odin-overlay a {
    color: var(--link-color);
    text-decoration: none;
    transition: color 0.2s ease;
  }

  #odin-overlay a:hover {
    color: #4fc3f7;
    text-decoration: underline;
  }

  @media (max-width: 300px) {
    #odin-overlay .responsive-table { border: none; }
    #odin-overlay .responsive-table th { display: none; }
    #odin-overlay .responsive-table tr { margin-bottom: 10px; display: block; border: 1px solid #404040; border-radius: 8px; background: #303030; }
    #odin-overlay .responsive-table td { display: block; text-align: right; font-size: 13px; border: none; position: relative; padding-left: 50%; }
    #odin-overlay .responsive-table td:before { content: attr(data-label); position: absolute; left: 0; width: 50%; padding-left: 10px; font-weight: bold; text-align: left; }
  }

  .status-icon {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 6px;
    box-shadow: 0 0 4px rgba(255,255,255,0.2);
  }

  .status-icon.online { background-color: #4CAF50; }
  .status-icon.offline { background-color: #f44336; }
  .status-icon.idle { background-color: #ffeb3b; }

  .table-container {
    max-height: 300px;
    overflow: auto;
    width: 100%;
    border: 1px solid #ccc;
    position: relative;
  }

  #odin-content {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  #odin-section-content {
    flex: 1;
    overflow-y: auto;
    margin-top: 10px;
  }

  .status-btn {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    margin-right: 6px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    transition: transform 0.2s ease;
  }

  .status-btn:hover {
    transform: scale(1.1);
  }

  .status-btn.green { background: var(--neon-color); }
  .status-btn.yellow { background: #ffeb3b; }
  .status-btn.red { background: #f44336; }

  .button-group {
    display: flex;
    justify-content: center;
    gap: 12px;
    margin-bottom: 12px;
    padding: 0 10px;
  }

  .small-button-group button {
    padding: 2px 6px;
    font-size: 10px;
  }
  .small-button-group {
    padding-left: 5px;
    padding-right: 5px;
    box-sizing: border-box;
  }

  .add-form {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    padding: 0 10px;
  }

  .add-form input {
    flex: 1;
    max-width: 70%;
  }

  h4 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin: 6px 0;
    color: var(--neon-color);
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    font-weight: 700;
  }

  #tct-clock {
    text-align: center;
    color: var(--font-color);
    font-size: 18px;
    margin-bottom: 12px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    font-family: var(--font-family);
  }

  #odin-toggle-container {
    display: flex;
    gap: 10px;
    margin-left: 10px;
  }

  .odin-toggle-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .odin-profile-btn {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    background-color: #404040;
    border: none;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .odin-profile-btn img {
    width: 40px;
    height: 40px;
    filter: grayscale(100%) brightness(0.5);
    transition: filter 0.2s ease;
  }

  .odin-profile-btn.checked {
    background-color: var(--neon-color);
    box-shadow: 0 0 10px var(--neon-color);
  }

  .odin-profile-btn.checked img {
    filter: grayscale(0%) brightness(1);
  }

  .odin-profile-btn:active {
    transform: scale(0.95);
    box-shadow: 0 0 15px var(--neon-color) inset;
  }

  .odin-profile-btn:hover {
    box-shadow: 0 0 8px var(--neon-color);
  }

  .odin-toggle-label {
    color: var(--neon-color);
    font-size: 12px;
    text-shadow: 0 1px 1px rgba(0,0,0,0.2);
  }

  .odin-toggle { display: none; }

  .attack-btn {
    background: linear-gradient(135deg, var(--neon-color), #388E3C);
    color: white;
    border: none;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 4px;
    font-size: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2), var(--neon-glow);
  }

  .attack-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3), var(--neon-glow);
  }

  .attack-btn:active {
    transform: scale(0.95);
  }

  .attack-btn.disabled {
    background: #808080;
    cursor: not-allowed;
  }

  #odin-resize-handle-width {
    width: 12px;
    background: linear-gradient(90deg, #303030, #404040);
    cursor: ew-resize;
    position: absolute;
    top: 0;
    height: 100%;
    transition: background 0.2s ease;
  }

  #odin-resize-handle-width:hover {
    background: linear-gradient(90deg, #404040, #505050);
  }

  #odin-resize-handle-width::before, #odin-resize-handle-width::after {
    content: '↔';
    position: absolute;
    color: #a0a0a0;
    font-size: 12px;
  }

  #odin-resize-handle-width.left::before, #odin-resize-handle-width.left::after {
    right: 3px;
    left: auto;
  }

  #odin-resize-handle-width.right::before, #odin-resize-handle-width.right::after {
    left: 3px;
    right: auto;
  }

  #odin-resize-handle-width::before { top: 8px; }
  #odin-resize-handle-width::after { bottom: 8px; }

  #odin-resize-handle-height {
    height: 12px;
    background: linear-gradient(0deg, #303030, #404040);
    cursor: ns-resize;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    transition: background 0.2s ease;
  }

  #odin-resize-handle-height:hover {
    background: linear-gradient(0deg, #404040, #505050);
  }

  #odin-resize-handle-height::before, #odin-resize-handle-height::after {
    content: '↕';
    position: absolute;
    color: #a0a0a0;
    font-size: 12px;
  }

  #odin-resize-handle-height::before { left: 8px; top: 3px; }
  #odin-resize-handle-height::after { right: 8px; top: 3px; }

  #odin-resize-handle-top {
    height: 12px;
    background: linear-gradient(180deg, #303030, #404040);
    cursor: ns-resize;
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    transition: background 0.2s ease;
  }

  #odin-resize-handle-top:hover {
    background: linear-gradient(180deg, #404040, #505050);
  }

  #odin-resize-handle-top::before, #odin-resize-handle-top::after {
    content: '↕';
    position: absolute;
    color: #a0a0a0;
    font-size: 12px;
  }

  #odin-resize-handle-top::before { left: 8px; top: 3px; }
  #odin-resize-handle-top::after { right: 8px; top: 3px; }

  #odin-overlay table tr:hover td {
    background: #353535;
  }

  .remove-target, .remove-war-target, .remove-enemy-faction {
    background: linear-gradient(135deg, #f44336, #d32f2f);
    color: white;
    border: none;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 4px;
    font-size: 12px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2), var(--neon-glow);
  }

  .remove-target:hover, .remove-war-target:hover, .remove-enemy-faction:hover {
    transform: scale(1.05);
    box-shadow: 0 2px 6px rgba(0,0,0,0.3), var(--neon-glow);
  }

  .remove-target:active, .remove-war-target:active, .remove-enemy-faction:active {
    transform: scale(0.95);
  }

  .settings-group {
    margin-bottom: 20px;
    padding: 15px;
    background: #303030;
    border-radius: 8px;
    border: 1px solid #404040;
  }

  .settings-group h4 {
    margin-top: 0;
    color: var(--neon-color);
  }

  .settings-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .settings-row label {
    color: #d0d0d0;
  }

  #member-search, #enemy-search {
    position: sticky;
    z-index: 12;
    background: #252525;
    padding: 8px;
    width: 100%;
    margin: 0;
    box-sizing: border-box;
  }

  #odin-section-content > h3,
  #odin-section-content > h4 {
    position: sticky;
    top: 0;
    background: #252525;
    z-index: 11;
    margin-top: 0;
    margin-bottom: 0;
    padding-top: 4px;
    padding-bottom: 4px;
  }

  #odin-overlay table tbody td {
    position: relative;
    z-index: 1;
  }

  .small-button-group {
    padding-left: 5px;
    padding-right: 5px;
    box-sizing: border-box;
  }

  .button-group, .add-form {
    padding: 0 10px;
  }

  #odin-api-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100000;
  }

  #odin-api-modal-content {
    background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
    border: 2px solid #404040;
    border-radius: 12px;
    padding: 30px;
    width: 400px;
    max-width: 90%;
    text-align: center;
    color: #e0e0e0;
    box-shadow: 0 8px 32px rgba(0,0,0,0.6);
  }

  #odin-api-modal h3 {
    color: var(--neon-color);
    margin-bottom: 20px;
    font-size: 18px;
  }

  #odin-api-modal p {
    margin-bottom: 20px;
    font-size: 14px;
  }

  #odin-api-input {
    width: 100%;
    padding: 10px;
    margin-bottom: 20px;
    background: #252525;
    border: 1px solid #505050;
    border-radius: 6px;
    color: #d0d0d0;
    font-size: 14px;
    box-sizing: border-box;
  }

  #odin-api-input:focus {
    border-color: var(--neon-color);
    outline: none;
  }

  #odin-api-buttons {
    display: flex;
    gap: 10px;
    justify-content: center;
  }

  #odin-api-btn-enter, #odin-api-btn-cancel, #odin-api-btn-wait {
    padding: 10px 20px;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  #odin-api-btn-enter {
    background: linear-gradient(135deg, var(--neon-color), #0099CC);
    color: white;
  }

  #odin-api-btn-enter:hover {
    background: linear-gradient(135deg, #0099CC, var(--neon-color));
    transform: translateY(-2px);
  }

  #odin-api-btn-cancel {
    background: linear-gradient(135deg, #f44336, #d32f2f);
    color: white;
  }

  #odin-api-btn-cancel:hover {
    background: linear-gradient(135deg, #d32f2f, #f44336);
    transform: translateY(-2px);
  }

  #odin-api-btn-wait {
    background: linear-gradient(135deg, #FF9800, #F57C00);
    color: white;
  }

  #odin-api-btn-wait:hover {
    background: linear-gradient(135deg, #F57C00, #FF9800);
    transform: translateY(-2px);
  }

  #odin-close-btn {
    position: absolute;
    top: 5px;
    right: 5px;
    background: red;
    color: white;
    border: none;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
  }

  /* ← ONLY CHANGE: smaller clickable area, visual size unchanged → */
  #odin-floating-btn {
    position: fixed !important;
    bottom: -13px !important;
    left: 20px !important;
    z-index: 100001999999 !important;
    background-color: #303030;
    color: #ffffff;
    font-size: 16px;
    width: 50px !important;
    height: 63px !important;
    border-radius: 0;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    box-shadow: none;
    pointer-events: none !important; /* disable click on whole button */
  }

  #odin-floating-btn::before {
    content: "";
    position: absolute;
    width: 36px !important;   /* ← clickable area */
    height: 36px !important;  /* ← clickable area */
    background: transparent;
    border-radius: 8px;
    pointer-events: auto !important; /* re-enable click only here */
    cursor: pointer !important;
    z-index: 1;
  }

  #odin-floating-btn:hover {
    background-color: #404040;
    transform: translateY(-2px);
  }

  #odin-floating-btn img {
    width: 38px;
    height: 38px;
    border-radius: 0;
    object-fit: contain;
  }
`;
document.head.appendChild(styleElement);

/* … ALL YOUR CLASSES AND CODE BELOW ARE 100% UNCHANGED … */

/* (Utils, AjaxModule, ApiQueue, ApiModule, BaseModule, OdinState, OdinLogic, OdinUserInterface, and the final async init block are exactly the same as you posted) */

/* ← Paste the rest of your original script here unchanged → */
class Utils {
  static async sleep(ms) {
    return new Promise(e => setTimeout(e, ms));
  }

  static formatTime(seconds, alternateFormat = false) {
    seconds = Math.max(0, Math.floor(seconds));

    let hours = Math.floor(seconds / 3600);
    seconds -= hours * 3600;

    let minutes = Math.floor(seconds / 60);
    seconds -= minutes * 60;

    if (alternateFormat) {
      return (hours < 10 ? "0" : "") + hours + "h " + (minutes < 10 ? "0" : "") + minutes + "m " + (seconds < 10 ? "0" : "") + seconds + "s";
    } else {
      return "[" + (hours < 10 ? "0" : "") + hours + ":" + (minutes < 10 ? "0" : "") + minutes + ":" + (seconds < 10 ? "0" : "") + seconds + "]";
    }
  }

  static debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  static escapeHtml(text) {
    if (text == null) return '';
    return text
      .toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

/* … (continue pasting the rest of your script exactly as it was) … */

const state = new OdinState();
BaseModule._apiModule.registerState(state);

(async () => {
  await state.loadFromIDB();
  const cacheEntries = await loadAllFromStore('cache');
  cacheEntries.forEach(entry => {
    BaseModule._apiModule.cacheLog[entry.key] = entry.value;
  });
  let apiKey = state.settings.apiKey;
  BaseModule._apiModule.apiKey = apiKey;
  BaseModule._apiModule.callLog = state.settings.callLog;
  const ui = new OdinUserInterface(state, null);
  const logic = new OdinLogic(state, ui);
  ui.logic = logic;

  const isValidKey = apiKey ? await BaseModule._apiModule.checkKeyValidity(apiKey) : false;

  if (!isValidKey) {
    apiKey = await ui.promptForApiKey(!apiKey);
    if (apiKey) {
      state.settings.apiKey = apiKey;
      state.saveToIDB();
      BaseModule._apiModule.clearCache();
      BaseModule._apiModule.apiKeyIsValid = true;
      BaseModule._apiModule.apiKey = apiKey;
      await logic.init();
    } else {
      alert("API key is required. Script will not run.");
    }
  } else {
    BaseModule._apiModule.apiKeyIsValid = true;
    BaseModule._apiModule.apiKey = apiKey;
    await logic.init();
    ui.observeProfileChanges();
    if (location.href.includes("profiles.php")) {
      logic.addProfileButtons();
    }
  }
})();
