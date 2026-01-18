# Frontend Development Plan

> **Stack**: Vite + React 19 + Tailwind CSS 4 + shadcn/ui (new-york)
> **Status**: Initial setup complete ✅

---

## Current Setup

| Component            | Status                |
| -------------------- | --------------------- |
| Vite + React         | ✅ Configured         |
| Tailwind CSS 4       | ✅ With CSS variables |
| shadcn/ui            | ✅ new-york style     |
| Path aliases (`@/*`) | ✅ Configured         |
| TypeScript           | ✅ Strict mode        |
| ESLint               | ✅ Configured         |

---

## Project Structure (To Build)

```
frontend/src/
├── main.tsx                    # ✅ Entry point
├── App.tsx                     # ✅ Root component
├── index.css                   # ✅ Tailwind + shadcn styles
├── lib/
│   └── utils.ts                # ✅ shadcn utilities
├── components/
│   └── ui/                     # shadcn components (add as needed)
├── api/
│   └── client.ts               # API client with auth
├── stores/                     # State management (zustand or context)
│   ├── auth.ts
│   ├── sessions.ts
│   └── messages.ts
├── hooks/
│   └── use-toast.ts            # Toast notifications
├── pages/
│   ├── Login.tsx               # API key auth
│   ├── Dashboard.tsx           # Overview
│   ├── Sessions.tsx            # Session management
│   ├── Messages.tsx            # Message center
│   ├── Templates.tsx           # Template manager
│   ├── Scheduling.tsx          # [Placeholder]
│   ├── Groups.tsx              # [Placeholder]
│   └── Contacts.tsx            # [Placeholder]
└── layouts/
    └── MainLayout.tsx          # Sidebar + header
```

---

## Implementation Phases

### Phase A: Core Infrastructure (2-3 days)

| Task    | Description                                                                              |
| ------- | ---------------------------------------------------------------------------------------- |
| **A.1** | Install react-router-dom for routing                                                     |
| **A.2** | Add shadcn components: `button`, `card`, `input`, `dialog`, `toast`, `sonner`, `sidebar` |
| **A.3** | Create API client (`@/api/client.ts`) with auth headers                                  |
| **A.4** | Create auth context/store for API key management                                         |
| **A.5** | Create `MainLayout` with sidebar navigation                                              |
| **A.6** | Setup routing with layout wrapper                                                        |

---

### Phase B: Core Pages (3-4 days)

| Page          | Features                                            |
| ------------- | --------------------------------------------------- |
| **Login**     | API key input, validation, localStorage persistence |
| **Dashboard** | Session stats cards, quick actions, recent messages |
| **Sessions**  | Session list, create modal, QR modal, status badges |
| **Messages**  | Message log table, quick send form, filters         |
| **Templates** | Template CRUD, test send, variable preview          |

---

### Phase C: Phase 6 Placeholders (1 day)

| Page           | Content                                           |
| -------------- | ------------------------------------------------- |
| **Scheduling** | "Scheduled Messages - Coming Soon" with mockup UI |
| **Groups**     | "Group Management - Coming Soon" with mockup UI   |
| **Contacts**   | "Contact Management - Coming Soon" with mockup UI |

---

## shadcn Components to Install

```bash
# Core UI
npx shadcn@latest add button card input label textarea select

# Navigation
npx shadcn@latest add sidebar navigation-menu

# Feedback
npx shadcn@latest add toast sonner alert dialog

# Data display
npx shadcn@latest add table badge avatar separator

# Forms
npx shadcn@latest add form (if using react-hook-form)
```

---

## API Integration

The frontend will consume the existing Express API at `/api/v1/`:

| Endpoint                                   | Page                |
| ------------------------------------------ | ------------------- |
| `POST /sessions/start`                     | Sessions            |
| `GET /sessions`                            | Sessions, Dashboard |
| `GET /sessions/:id/qr`                     | Sessions (QR modal) |
| `POST /sessions/:id/stop`                  | Sessions            |
| `POST /sessions/:id/logout`                | Sessions            |
| `POST /sessions/:id/message/send/text`     | Messages            |
| `POST /sessions/:id/message/send/file`     | Messages            |
| `POST /sessions/:id/message/send/template` | Templates           |
| `GET /sessions/messages/log`               | Messages, Dashboard |
| `GET /templates`                           | Templates           |
| `POST /templates`                          | Templates           |
| `DELETE /templates/:name`                  | Templates           |

---

## Backend Integration

Update `src/app.ts` to serve the built frontend:

```typescript
// Serve frontend build
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// SPA fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});
```

---

## Next Steps

1. Install react-router-dom
2. Add core shadcn components
3. Create API client with interceptors
4. Build Login page
5. Build MainLayout with sidebar
6. Migrate session management from old UI
7. Build message center
8. Add placeholder pages

---

## Development Commands

```bash
# Frontend development (with HMR)
cd frontend && npm run dev

# Build for production
cd frontend && npm run build

# Backend serves built frontend
npm run dev  # (from root)
```
