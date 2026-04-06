# Vocabulary Quiz Web App — Implementation Plan

## Context
Building a React + Vite vocabulary quiz web app for two kids (4th and 9th grade). The parent/provider creates quizzes, assigns them to kids, and reviews results. Kids log in with a PIN and only see their own quizzes/results. All data lives in localStorage with JSON import/export. No backend.

---

## Data Model

### Kid Profile
```json
{ "id": "kid_...", "name": "Alice", "pin": "1234", "grade": "4th", "createdAt": "..." }
```

### Quiz
```json
{
  "id": "quiz_...", "title": "Week 12 Vocabulary",
  "assignedKidIds": ["kid_..."],
  "words": [
    { "id": "word_0", "word": "benevolent", "sentence": "The benevolent king helped the poor.",
      "choices": ["kind", "cruel", "lazy", "angry"], "correctAnswer": "kind" }
  ]
}
```

### Quiz Result
```json
{
  "id": "result_...", "quizId": "quiz_...", "kidId": "kid_...",
  "kidName": "Alice", "quizTitle": "Week 12 Vocabulary",
  "startedAt": "...", "completedAt": "...", "score": 8, "totalWords": 10,
  "answers": [
    { "wordId": "word_0", "word": "benevolent", "selected": "kind",
      "correctAnswer": "kind", "isCorrect": true }
  ]
}
```

All data stored under single localStorage key `vocabQuiz_data`. Results are denormalized (include kidName, quizTitle) so exports are self-contained.

---

## Route Structure

| Path | Component | Auth |
|---|---|---|
| `/` | LandingPage | none |
| `/provider/*` | ProviderLayout + child routes | provider password |
| `/provider/dashboard` | DashboardPage | provider |
| `/provider/kids` | KidsManagePage | provider |
| `/provider/quizzes` | QuizzesManagePage | provider |
| `/provider/quizzes/new` | QuizForm | provider |
| `/provider/quizzes/:id/edit` | QuizForm | provider |
| `/provider/results` | ResultsPage | provider |
| `/provider/results/:id` | ResultDetailPage | provider |
| `/provider/analytics` | AnalyticsPage | provider |
| `/provider/export` | ExportImportPage | provider |
| `/kid/*` | KidLayout + child routes | kid PIN |
| `/kid/dashboard` | KidDashboard | kid |
| `/kid/quiz/:quizId` | QuizTakePage | kid |
| `/kid/quiz/:quizId/result/:resultId` | QuizResultPage | kid |
| `/kid/history` | KidResultsHistory | kid |

---

## File Structure
```
vocabQuiz/
  index.html, package.json, vite.config.js, tsconfig.json
  src/
    main.tsx, App.tsx, App.css, types.ts, constants.ts
    hooks/     useLocalStorage.ts, useAppData.ts, useAuth.ts
    utils/     storage.ts, crypto.ts, ids.ts, analytics.ts, exportImport.ts, validation.ts
    context/   AuthContext.tsx
    components/
      common/    Button, Card, Input, Modal, Badge, ProgressBar, Header, ProtectedRoute
      landing/   LandingPage, KidLoginForm, ProviderLoginForm
      provider/  ProviderLayout, DashboardPage, KidsManagePage, KidForm,
                 QuizzesManagePage, QuizForm, WordEditor,
                 ResultsPage, ResultDetailPage, AnalyticsPage, ExportImportPage
      kid/       KidLayout, KidDashboard, QuizTakePage, QuizResultPage, KidResultsHistory
```

---

## Key Design Decisions
- **Single localStorage key** — simple export/import, data volume is tiny
- **TypeScript** — catches data model mismatches at compile time
- **No CSS framework** — plain CSS with variables for the "clean but warm" aesthetic
- **No state management lib** — useAppData hook + React context is sufficient
- **Auth in memory only** — closing tab logs out (no persistent sessions)
- **SHA-256 for provider password** — via Web Crypto API, proportional security for a family app
- **Kid PINs in plaintext** — acceptable for family use

---

## Visual Design
- Warm off-white background (`#FFF8F0`), purple accent (`#6C63FF`), coral secondary (`#FF6584`)
- Rounded cards with soft shadows, friendly typography (Inter/system)
- Large touch targets (44px+) and 18px+ font in kid view
- Responsive layout (stacked on mobile)

---

## Build Phases (each phase is independently testable)

### Phase 1: Scaffolding + Data Layer
- Vite + React + TypeScript project setup
- `types.ts`, `constants.ts`, `utils/` (storage, crypto, ids)
- `useLocalStorage`, `useAppData` hooks

### Phase 2: Auth + Routing Shell
- `AuthContext`, `useAuth`, `ProtectedRoute`
- `LandingPage`, `KidLoginForm`, `ProviderLoginForm`
- `ProviderLayout`, `KidLayout`
- Full router config in `App.tsx`
- Common components (Button, Card, Input, Modal, Header)

### Phase 3: Provider — Kid Management
- `KidsManagePage`, `KidForm`
- CRUD for kid profiles, PIN uniqueness enforcement

### Phase 4: Provider — Quiz Creation
- `QuizzesManagePage`, `QuizForm`, `WordEditor`
- `validation.ts`
- Dynamic word list with useReducer, assign to kids

### Phase 5: Kid — Take Quiz (core feature)
- `KidDashboard`, `QuizTakePage`, `QuizResultPage`
- Scrollable quiz, submit, score + per-word review

### Phase 6: Provider — Results & Analytics
- `ResultsPage`, `ResultDetailPage`, `AnalyticsPage`
- `analytics.ts` — per-word miss rates, aggregation
- `ProgressBar`, `Badge` components

### Phase 7: Export/Import + History + Dashboard
- `ExportImportPage`, `exportImport.ts`
- `KidResultsHistory`, `DashboardPage`

### Phase 8: Polish
- Responsive tweaks, empty states, confirmation dialogs, favicon

---

## Verification
1. `npm run dev` — app runs without errors
2. First-run: set provider password, create 2 kids with different PINs
3. Create a quiz with 5+ words, assign to one kid
4. Log in as that kid — quiz appears; log in as other kid — quiz does NOT appear
5. Take quiz, submit — results page shows score + per-word breakdown
6. Provider views results and analytics — per-word miss rates display correctly
7. Export all data as JSON, clear localStorage, import — data restored
8. Verify mobile layout is usable
