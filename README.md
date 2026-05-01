# Navix

Spatial navigation library for TV platforms. Manages keyboard-driven focus across a tree of components — the same model used in every TV UI. You describe the structure (rows, grids, buttons), and Navix routes arrow key events through the tree automatically.

Targets **web** (Tizen, WebOS, browser) and **Flutter** (Android TV, Fire TV, Apple TV, desktop).

---

![Navix demo](./demo.gif)

---

## Architecture

```
┌──────────────────────────────────────┐
│  @navix/core  /  navix (Dart)        │
│                                      │
│  FocusNode  ←  FocusTree / Manager   │
│     ↑               ↑               │
│  register      InputManager /        │
│               HardwareKeyboard       │
└──────────────────────────────────────┘
          ↑ consumed by
┌─────────────────┐  ┌─────────────────┐
│  @navix/react   │  │  navix Flutter  │
│  (React 18+)    │  │  (Flutter 3.10+)│
└─────────────────┘  └─────────────────┘
```

**Core owns all logic.** It has no dependency on any UI framework or rendering engine. Each adapter is a thin lifecycle + context layer on top.

---

## Packages

### `@navix/core`

Framework-agnostic navigation core for web. All focus tree logic, event routing, and behaviors live here.

```bash
bun add @navix/core
# or
npm install @navix/core
```

### `@navix/react`

React 18+ adapter. Peer dependency on `react` and `react-dom`.

```bash
bun add @navix/core @navix/react
# or
npm install @navix/core @navix/react
```

→ [React package docs](./packages/react/README.md)

### `navix` (Flutter)

Flutter adapter for TV platforms. No web dependencies.

```yaml
dependencies:
  navix:
    path: ./packages/flutter # or pub.dev reference once published // TODO: update this after publish
```

→ [Flutter package docs](./packages/flutter/README.md)
