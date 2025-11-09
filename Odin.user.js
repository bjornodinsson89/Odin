// ==UserScript==
// @name         Odin Tools
// @namespace    http://tampermonkey.net/
// @version      2.0
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
