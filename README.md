
# MyOvae - Your PCOS Wellness Companion

This is a Next.js starter project for MyOvae, a personalized wellness app for managing PCOS.

## Getting Started

To get started with development, run the following command:

```bash
npm run dev
```

This will start the Next.js development server. Open [http://localhost:3000](http://localhost:3000) to see the application.

## Core Technologies

*   **Framework**: Next.js (with App Router)
*   **Language**: TypeScript
*   **Styling**: Tailwind CSS
*   **UI Components**: ShadCN
*   **Animations**: Framer Motion
*   **Backend**: Firebase (Authentication & Firestore)
*   **AI**: Genkit

## Navigation System

The application uses a custom "dock" navigation system for primary navigation on authenticated pages.

### Components

*   **`DockProvider`**: A React Context provider that manages the state of the dock (e.g., hovered items, active item). It must wrap the layout that contains the dock.
*   **`Dock`**: The main container component for the navigation items. It is fixed to the bottom of the viewport.
*   **`Dock.Item`**: Individual navigation items within the dock. These are memoized for performance.
*   **`Dock.Tooltip`**: A tooltip that appears on hover (desktop) or long-press (mobile) to show the label of a dock item.

### Behavior

*   **Desktop**: On desktop, tooltips appear when a user hovers over an icon. The active icon has a subtle "breathing" animation.
*   **Mobile**: On mobile, tooltips are revealed via a long-press gesture to avoid interfering with taps.
*   **Accessibility**: The dock respects the `prefers-reduced-motion` browser setting, disabling animations for users who have requested it.
*   **Error Handling**: The dock is wrapped in an `ErrorBoundary` to prevent any issues within the navigation from crashing the entire application page.

For a detailed breakdown of the migration from the previous sidebar navigation, see the [Migration Plan](./docs/MIGRATION_PLAN.md).
