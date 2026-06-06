# Navix

Spatial navigation library for TV platforms. You group your elements into lists and grids — Navix manages focus traversal across that hierarchy automatically, using the keys you assign.

Targets **web** (Tizen, WebOS, browser) and **Flutter** (Android TV, Fire TV, Apple TV, desktop).

---

![Navix demo](./demo.gif)

---

## Architecture

**Navigation logic is self-contained.** Each package owns its full focus tree, behaviors, and input manager — no shared core dependency.

---

## Packages

### `@navix/react`

React 18+ package. Includes the full focus tree, all behaviors, and input manager. Peer dependency on `react` and `react-dom`.

```bash
bun add @navix/react
# or
npm install @navix/react
```

→ [React package docs](./packages/react/README.md)

### `navix` (Flutter)

Flutter adapter for TV platforms. No web dependencies.

```bash
flutter pub add navix
```

→ [Flutter package docs](./packages/flutter/README.md)
