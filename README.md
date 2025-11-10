**Odin Tools is a comprehensive userscript for Torn City, focused on faction management and gameplay enhancement, it provides tools for tracking targets, monitoring faction members and enemies, chain bonus alerts**

**Note:** Requires [Tampermonkey](https://www.tampermonkey.net/) or [Greasemonkey](https://www.greasespot.net/) for installation. Compatible with Chrome, Firefox, Edge, and other modern browsers. Matches \`https://www.torn.com/*\` and \`https://www2.torn.com/*\`.

## Features

Odin Tools offers modular tools tailored for faction warfare and daily management. Key features include:

- **Targets & War Targets Management**
  - Add/remove up to 50 targets per list via ID or profile toggles.
  - Auto-refresh: Hospital targets every 10s, others every 2min.
  - Display: Profiles, status timers (hospital/jail/travel), life, respect from last 100 attacks, one-click attack buttons.
  - Import/export JSON for backups/sharing.

- **Faction & Enemy Monitoring**
  - Faction members list: Searchable, sortable (status, name, level, position, days in faction, last action).
  - Status priority modes: Cycle online > idle > offline (green/yellow/red buttons).
  - Enemy factions: Add by ID or auto-pull from ranked wars; per-faction tables.
  - Global enemy search and online alerts (threshold: default 5).

- **Chain & Alert System**
  - Real-time chain monitoring: Flashing screen + notifications for low timeouts (<4min default).
  - Bonus warnings: Alerts within 20/10 hits of milestones (e.g., 500, 1000 hits).
  - Configurable: Enable/disable popups, set thresholds.

- **UI & Utilities**
  -left/right positioning, neon themes, 50+ fonts, custom colors.
  - Server clock: Accurate TCT with auto-sync (fallback UTC).
   - Error logger: View/export grouped logs.

- **Performance Optimizations**
  - Visibility-aware polling (30s active, 5min background).
  - Responsive tables for mobile; debounced searches/sorts.

Features are tabbed for easy navigation, with persistent state across sessions.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2. Visit the [Greasy Fork page](https://greasyfork.org/scripts/[SCRIPT_ID]/odin-tools) and click "Install this script".
3. Alternatively, clone the repo and load \`Odin.user.js\` manually in Tampermonkey.
4. Reload Torn City – a floating Odin button appears (bottom-left by default). Click to open.
5. Enter your Fill access Torn API key on first run (see [API Handling](#api-handling))
##Your API never leaves your Browser, or Torn servers, Odin Tools is designed specifically to only communicate within Torn, and does not send API data to any outside source.

## Configuration

Access settings via the "Settings" tab in the overlay:

### Alert Settings
- Chain timeout threshold: 1-4.5 minutes (default: 4min).
- Enemy online alert: Number of rivals (default: 5).
- Toggles: Flashing screen, popup notifications.

### UI Customization
- Overlay position: Left/right side.
- Themes: Neon glow (on/off, color picker), font family (50+ options like Orbitron, Roboto).
- Colors: Font, header, link (predefined palette).

### Data Management
- Clear cache: Reset API responses.
- Change API key: Update/validate on-the-fly.

Changes auto-save. Reload page for layout shifts.

## Storage

Odin Tools uses **IndexedDB** (\`OdinDB\`, v3) for local persistence.

- **Key Stores**:
  - \`cache\`: TTL API data (max 200 entries, auto-clean 1min).
  - \`targets\`/\`warTargets\`: Lists with timestamps (≤50 items).
  - \`factionMembers\`: Current faction snapshot.
  - \`enemyFactions\`: Rivals with update times.
  - \`settings\`: Prefs (alerts, UI, key – plain text).

- **Handling**:
  - Quota overflow: Auto-clear cache, notify.
  - Privacy: Device-only; no sync/transmission.
  - Access: Async promises with error fallbacks.

## Functionality

Core logic in \`OdinLogic\` class. High-level flow:

- **Init**: Load DB, validate API, render UI.
- **Polling**: Chunked API calls, visibility checks.
- **Events**: AJAX hooks for attacks, MutationObserver for profiles.
- **Timers**: 1s countdowns, 5s chain fast-poll.
- **Errors**: Log/group, retry (3x backoff).

Optimized for low impact; cleans intervals on close/unload.

## API Handling

Integrates [Torn API](https://api.torn.com/) (read-only, full access key required).

- **Setup/Validation**: Prompt/full-access key; check via \`/user?selections=basic\`.
- **Key Endpoints**:
  - User profiles: \`/user/{ID}?selections=profile\` (fallback basic).
  - Faction: \`/faction?selections=basic|rankedwars|chain\`.
  - Attacks: \`/user?selections=attacks\`.

- **Optimizations**:
  - Queue: Concurrency 3, priorities (chain high).
  - Throttle: 100/min, exponential wait.
  - Cache: In-mem + DB, TTL 30s-5min.

- **Security**: Local storage only; error alerts (e.g., rate limit code 6).

## Code Structure

The \`Odin.user.js\` file is organized with JSDoc headers and bullet-point comments for clarity. Key sections:

- **Storage Management**: IndexedDB setup and CRUD functions.
- **Features Overview**: Inline docs for targets, alerts, UI.
- **API Handling**: Queue, throttling, caching in \`ApiModule\`.
- **Core Classes**: \`OdinState\` (DB), \`OdinLogic\` (polling/events), \`OdinUserInterface\` (rendering).


## Changelog

- **v2.0** (2025-11-09): IndexedDB, enemy wars, chain bonuses, resizer, fonts/neon.
- **v1.0** (2025-10-15): Basic targets/members/API.

## License

MIT - [LICENSE](LICENSE).

---

**Hail Odin!** Questions? Message BiornOdinsson89 in Torn or open an issue.
