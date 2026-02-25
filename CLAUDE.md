# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
yarn start              # Start dev server (excalidraw-app)
yarn test:app           # Run tests with vitest
yarn test:update        # Run tests with snapshot updates
yarn test:typecheck     # TypeScript type checking
yarn test:code          # ESLint checking
yarn fix                # Auto-fix formatting and linting
yarn test:coverage      # Run tests with coverage report
```

### Running Single Tests

```bash
yarn test:app -- --grep "test name"           # Run specific test by name
yarn test:app -- packages/excalidraw/tests/selection.test.tsx  # Run specific file
```

### Building Packages

```bash
yarn build:packages     # Build all internal packages (common, math, element, excalidraw)
yarn build:app          # Build the web application
```

## Project Architecture

### Monorepo Structure

- **`packages/excalidraw/`** - Main React component library (`@excalidraw/excalidraw`)
- **`packages/element/`** - Element creation, manipulation, and selection logic (`@excalidraw/element`)
- **`packages/math/`** - Geometry primitives with branded types (`@excalidraw/math`)
- **`packages/common/`** - Shared constants, utilities, and types (`@excalidraw/common`)
- **`packages/utils/`** - Export utilities (canvas, SVG, clipboard)
- **`excalidraw-app/`** - The full web application (excalidraw.com)

### Package Dependencies

```
@excalidraw/excalidraw
  └── @excalidraw/element
        ├── @excalidraw/common
        └── @excalidraw/math
```

### State Management

- Uses **Jotai** with isolated scope (`jotai-scope`) for editor state
- Main store: `packages/excalidraw/editor-jotai.ts`
- Import from `@excalidraw/excalidraw/editor-jotai` (not directly from jotai)

### Geometry Types

Use branded types from `@excalidraw/math/types` for type safety:

- `GlobalPoint` - World/canvas space coordinates
- `LocalPoint` - Local coordinate space
- `Radians`, `Degrees` - Angle measurements
- `LineSegment`, `Polygon`, `Curve`, `Ellipse` - Geometric primitives

**Always use Point types instead of `{ x, y }` objects.**

## Testing

### Test Utilities

Located in `packages/excalidraw/tests/helpers/`:

- `api.ts` - `API` class for element creation and scene manipulation
- `ui.ts` - `Keyboard`, `Pointer`, `UI` classes for simulating user interaction
- Test state available via `window.h` (app instance, state, elements)

### Writing Tests

```typescript
import { render } from "../test-utils";
import { API } from "./helpers/api";
import { UI, Keyboard, Pointer } from "./helpers/ui";

// Create elements
const rect = API.createElement({
  type: "rectangle",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
});
API.setElements([rect]);

// Simulate interactions
Pointer.click(50, 50);
Keyboard.keyDown("Delete");
```

## Code Conventions

### TypeScript

- Prefer implementations without allocation where possible
- Trade RAM for CPU cycles (optimize for performance)
- Use optional chaining (`?.`) and nullish coalescing (`??`)

### React

- Functional components with hooks
- CSS modules for component styling (`.scss` files colocated)
- Follow hooks rules (no conditional hooks)

### Naming

- `PascalCase` for components, interfaces, type aliases
- `camelCase` for variables, functions, methods
- `ALL_CAPS` for constants

## Key Entry Points

- Main component: `packages/excalidraw/index.tsx` exports `<Excalidraw>`
- App component: `packages/excalidraw/components/App.tsx`
- Element types: `packages/element/src/types.ts`
- Actions: `packages/excalidraw/actions/`
