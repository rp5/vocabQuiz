# Rigor Vocab — Code Review & Simplification Plan

## Summary

The app is well-structured with clean separation between admin and kid components. The central `useAppData` hook pattern is solid. Main areas for improvement: duplicated code, inline styles, and test coverage gaps.

---

## Simplification Opportunities

### 1. Extract duplicated `boldWord` helper
**Files:** `QuizTakePage.tsx` (lines 6-12), `QuizResultPage.tsx` (lines 4-10)
**Issue:** Identical function defined in two files.
**Fix:** Move to `src/utils/boldWord.tsx` and import in both components.

### 2. Consolidate `normalizeQuiz` logic
**Files:** `src/utils/quizLoader.ts` (lines 5-30), `src/components/provider/ExportImportPage.tsx` (lines 6-35)
**Issue:** Same quiz normalization logic (handle `assignTo`, derive ID from `seq`, map `answer` to `correctAnswer`) exists in two places.
**Fix:** Export `normalizeQuiz` from `quizLoader.ts` and reuse in `ExportImportPage.tsx`.

### 3. Move inline styles to CSS classes
**Priority candidates:**
- Choice buttons in `QuizTakePage.tsx` (11 inline properties) -> `.quiz-choice` and `.quiz-choice-selected`
- Collapsible toggle in `KidDashboard.tsx` -> `.collapsible-toggle`
- Sticky submit bar in `QuizTakePage.tsx` -> `.quiz-submit-bar`
- Score card in `QuizResultPage.tsx` -> `.result-score-card`

### 4. Compute `showSentence` once, not per word
**File:** `QuizTakePage.tsx` — `quiz.alwaysShowSentence !== false` is evaluated inside the word map loop.
**Fix:** Compute once before the return: `const showSentence = quiz.alwaysShowSentence ?? true;`

### 5. Use `useMemo` for `getLatestResult` in KidDashboard
**File:** `KidDashboard.tsx` (lines 26-30) — sorts filtered array on every call inside a render loop.
**Fix:** Build a `Map<quizId, latestResult>` once with `useMemo`.

### 6. Fix `KidLayout` logout path
**File:** `KidLayout.tsx` (line 10) — navigates to `/quiz` which redirects to `/quiz/login`.
**Fix:** Navigate directly to `/quiz/login` to avoid the extra redirect.

---

## Potential Bugs

### 1. Word IDs regenerated on quiz save (medium risk)
**File:** `QuizForm.tsx` (line 96) — word IDs are positional (`word_0`, `word_1`). Reordering words and saving changes IDs. Current analytics uses word text not ID, so no breakage today, but fragile for future changes.
**Fix:** Generate stable IDs at word creation time using `generateId('word')`.

### 2. `Math.max` spread on large arrays
**File:** `QuizForm.tsx` (line 56) — `Math.max(...quizzes.map(...))` can hit call-stack limit with hundreds of quizzes.
**Fix:** Use `quizzes.reduce((max, q) => Math.max(max, q.seq ?? 0), 0)`.

### 3. Division by zero in result percentage
**Files:** `QuizResultPage.tsx` (line 26), `ResultDetailPage.tsx` (line 18)
**Issue:** `result.score / result.totalWords` produces NaN if totalWords is 0.
**Fix:** Guard with `result.totalWords > 0 ? ... : 0`.

### 4. Auto-loader race condition (low risk)
**File:** `quizLoader.ts` — reads localStorage after async fetch completes. If user saves a quiz during the fetch, the loader overwrites their changes for file-based quiz IDs.
**Impact:** Low — loader runs on mount before user can edit. But worth documenting.

---

## Test Gaps

### Missing Tests

| Gap | Priority | Description |
|---|---|---|
| Quiz retake creates second result | High | After retaking, verify two results in history and latest score on dashboard |
| Dashboard next-quiz progression | High | After completing quiz 1, verify quiz 2 promotes to "Your Next Quiz" |
| `alwaysShowSentence` default (true) | Medium | Verify omitting the field shows sentences immediately |
| Analytics filter by quiz | Medium | Only filter-by-kid is tested |
| Import bare quiz array | Medium | Array-of-quizzes import path untested |
| Delete kid cascades to quiz assignments | Medium | Verify quiz no longer lists deleted kid |
| Dashboard stats update after quiz | Low | Verify "Total Attempts" and "Avg Score" reflect new data |
| Result detail "Back to Results" navigation | Low | Verify back link works |
| Export/import round-trip with results | Low | Verify imported results are accessible |
| Kid name case-insensitivity on login | Low | Verify "ALICE" logs in as "Alice" |

### Fragile Tests

| Test | Issue | Fix |
|---|---|---|
| Edit/delete quiz using `.last()` | Depends on quiz ordering; could edit wrong quiz | Match by title: `.filter({ hasText: 'Week 1 Vocab' })` |
| Auto-load test relies on real `PositiveTraits.json` | If file changes, test breaks | Import quiz programmatically or document dependency |
| `clearAutoLoadedQuizzes` filters by `quiz_seq_` prefix | Misses file quizzes with explicit IDs | Filter by checking against a known set of test-created IDs |

---

## Action Items (Recommended Order)

1. Extract `boldWord` to shared utility (5 min)
2. Consolidate `normalizeQuiz` (15 min)
3. Fix `showSentence` double computation (2 min)
4. Fix `KidLayout` logout path (1 min)
5. Add high-priority missing tests: retake + progression (30 min)
6. Move choice button styles to CSS (15 min)
7. Fix word ID generation in QuizForm (15 min)
8. Add remaining medium-priority tests (30 min)
