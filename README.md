# Homie — Your Home, Simplified

React + TypeScript frontend for the Smart Household Management System.

## Tech Stack

- **React 18** + **TypeScript**
- **Vite** — build tool
- **React Router v6** — routing
- **TanStack Query v5** — server state, caching, background refetch
- **Zustand** — auth/global state (persisted to localStorage)
- **Axios** — HTTP client with JWT interceptors + auto token refresh
- **shadcn/ui** + **Tailwind CSS** — UI components
- **React Hook Form** + **Zod** — forms and validation

## Getting Started

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`

## Project Structure

```
src/
├── api/
│   ├── axios.ts        # Axios instance with JWT interceptors & refresh logic
│   └── services.ts     # All API service functions
├── components/
│   ├── layout/         # AppLayout, BottomNav, ProtectedRoute
│   └── ui/             # shadcn components (Button, Input, Card, etc.)
├── hooks/
│   └── useToast.ts
├── lib/
│   └── utils.ts        # cn, formatCurrency, formatDate, getInitials
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── OnboardingPage.tsx  # Create or join household
│   ├── DashboardPage.tsx   # Balance overview + debts
│   ├── HouseholdPage.tsx   # Members + invite code
│   ├── AddExpensePage.tsx  # Add expense (equal or custom split)
│   └── SettingsPage.tsx    # Profile + logout
├── store/
│   └── authStore.ts    # Zustand auth store (persisted)
└── types/
    └── index.ts        # All TypeScript interfaces
```

## Auth Flow

1. Login → receives `accessToken` + `refreshToken` → stored in Zustand (persisted to localStorage)
2. Every request → Axios interceptor attaches `Authorization: Bearer <accessToken>`
3. On 401 → auto refresh using `refreshToken` → retries failed request
4. If refresh fails → clears auth → redirects to `/login`

## Key Notes

- `householdId` is stored in `localStorage` after creating/joining a household
- Balances auto-refresh every 30 seconds on the dashboard
- Mobile-first design with bottom navigation
- All protected routes redirect to `/login` if not authenticated
