import { test, expect, type Page } from '@playwright/test';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function clearStorage(page: Page) {
  await page.evaluate(async () => {
    sessionStorage.clear();
    await fetch('/api/reset', { method: 'POST' });
  });
  await page.reload();
}

async function clearAutoLoadedQuizzes(page: Page) {
  // Reset server data to remove auto-loaded quizzes, then re-set just the provider password
  await page.evaluate(async () => {
    const res = await fetch('/api/data');
    const d = await res.json();
    const filtered = (d.quizzes || []).filter((q: any) => !q.id?.startsWith('quiz_seq_'));
    // Write back with only non-auto-loaded quizzes
    await fetch('/api/reset', { method: 'POST' });
    // Restore provider password and kids
    if (d.providerPasswordHash) {
      await fetch('/api/provider-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hash: d.providerPasswordHash }),
      });
    }
    for (const kid of d.kids) {
      await fetch('/api/kids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(kid),
      });
    }
    for (const quiz of filtered) {
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quiz),
      });
    }
  });
}

async function setupProvider(page: Page, password = 'test1234') {
  await page.goto('/');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm Password').fill(password);
  await page.getByRole('button', { name: /Set Password/i }).click();
  await expect(page).toHaveURL(/\/admin\/kids/);
}

async function addKid(page: Page, name: string, password: string, grade: string) {
  await page.goto('/admin/kids');
  await page.getByRole('button', { name: /\+ Add Kid/i }).click();
  await page.getByLabel(/Name/i).fill(name);
  await page.getByLabel('Password').fill(password);
  await page.getByLabel('Grade').fill(grade);
  await page.locator('.modal-content').getByRole('button', { name: 'Add Kid' }).click();
  await expect(page.locator('.modal-overlay')).toBeHidden();
}

async function createQuiz(
  page: Page,
  title: string,
  assignTo: string[],
  words: { word: string; sentence: string; choices: string[]; correctIndex: number }[]
) {
  await page.goto('/admin/quizzes/new');
  await page.getByPlaceholder('e.g. Week 12 Vocabulary').fill(title);

  // Assign to kids
  for (const kidName of assignTo) {
    await page.getByLabel(new RegExp(kidName)).check();
  }

  // Fill first word (already exists)
  for (let wi = 0; wi < words.length; wi++) {
    if (wi > 0) {
      await page.getByRole('button', { name: /Add Word/i }).click();
    }
    const w = words[wi];
    const card = page.locator('.card').filter({ hasText: `Word #${wi + 1}` });
    await card.getByPlaceholder('e.g. benevolent').fill(w.word);
    await card.getByPlaceholder(/e\.g\. The benevolent/).fill(w.sentence);
    for (let ci = 0; ci < 4; ci++) {
      await card.getByPlaceholder(`Choice ${ci + 1}`).fill(w.choices[ci]);
    }
    await card.locator(`input[name="correct_${wi}"]`).nth(w.correctIndex).check();
  }

  await page.getByRole('button', { name: /Create Quiz/i }).click();
  await expect(page).toHaveURL(/\/admin\/quizzes$/);
}

async function loginAsKid(page: Page, name: string, password: string) {
  await page.goto('/quiz/login');
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/quiz\/dashboard/);
}

async function loginAsProvider(page: Page, password = 'test1234') {
  await page.goto('/');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/\/admin\/dashboard/);
}

const SAMPLE_WORDS = [
  { word: 'benevolent', sentence: 'The benevolent king helped the poor.', choices: ['kind', 'cruel', 'lazy', 'angry'], correctIndex: 0 },
  { word: 'ephemeral', sentence: 'The beauty of the sunset was ephemeral.', choices: ['permanent', 'short-lived', 'bright', 'dark'], correctIndex: 1 },
  { word: 'gregarious', sentence: 'She was gregarious at the party.', choices: ['shy', 'tired', 'sociable', 'rude'], correctIndex: 2 },
];

const SAMPLE_PASSAGE = 'Water on Earth is constantly moving. The sun heats water in oceans, lakes, and rivers, causing it to evaporate into the atmosphere as water vapor. As the vapor rises, it cools and condenses into tiny droplets, forming clouds. When the droplets become heavy enough, they fall as precipitation.';

const SAMPLE_QUESTIONS = [
  { question: 'What causes water to evaporate?', choices: ["The moon's gravity", "The sun's heat", 'Wind', 'Cold temperatures'], correctIndex: 1 },
  { question: 'What happens when water vapor cools?', choices: ['It freezes', 'It condenses into droplets', 'It disappears', 'It gets warmer'], correctIndex: 1 },
  { question: 'What is the passage mainly about?', choices: ['Ocean life', 'The water cycle', 'Cloud types', 'Weather forecasting'], correctIndex: 1 },
];

const SAMPLE_SAT_QUESTIONS = [
  { passage: 'Fleming noticed that a mold called Penicillium had contaminated one of his petri dishes and killed the surrounding bacteria.', question: 'What did Fleming observe?', choices: ['Bacteria growing rapidly', 'Mold killing bacteria', 'A clean petri dish', 'Virus contamination'], correctIndex: 1 },
  { passage: 'The Industrial Revolution shifted economies from agrarian to manufacturing, fundamentally changing how people lived and worked.', question: 'What was the main effect of the Industrial Revolution?', choices: ['Increased farming', 'Economic shift to manufacturing', 'Population decline', 'Return to rural life'], correctIndex: 1 },
];

async function createSATQuiz(
  page: Page,
  title: string,
  assignTo: string[],
  satQuestions: { passage: string; question: string; choices: string[]; correctIndex: number }[]
) {
  await page.goto('/admin/quizzes/new');

  // Select SAT Reading type
  await page.getByRole('button', { name: 'SAT Reading' }).click();

  await page.getByPlaceholder('e.g. SAT Practice Set 1').fill(title);

  // Assign to kids
  for (const kidName of assignTo) {
    await page.getByLabel(new RegExp(kidName)).check();
  }

  // Fill questions
  for (let qi = 0; qi < satQuestions.length; qi++) {
    if (qi > 0) {
      await page.getByRole('button', { name: /Add Question/i }).click();
    }
    const sq = satQuestions[qi];
    const card = page.locator('.card').filter({ hasText: `Question #${qi + 1}` });
    await card.getByPlaceholder(/Short passage/).fill(sq.passage);
    await card.getByPlaceholder(/e\.g\. Which choice best/).fill(sq.question);
    for (let ci = 0; ci < 4; ci++) {
      await card.getByPlaceholder(`Choice ${ci + 1}`).fill(sq.choices[ci]);
    }
    await card.locator(`input[name="sat_correct_${qi}"]`).nth(sq.correctIndex).check();
  }

  await page.getByRole('button', { name: /Create Quiz/i }).click();
  await expect(page).toHaveURL(/\/admin\/quizzes$/);
}

async function createReadingQuiz(
  page: Page,
  title: string,
  assignTo: string[],
  passage: string,
  questions: { question: string; choices: string[]; correctIndex: number }[]
) {
  await page.goto('/admin/quizzes/new');

  // Select reading type
  await page.getByRole('button', { name: 'Reading Comprehension' }).click();

  await page.getByPlaceholder('e.g. The Water Cycle').fill(title);

  // Assign to kids
  for (const kidName of assignTo) {
    await page.getByLabel(new RegExp(kidName)).check();
  }

  // Fill passage
  await page.getByPlaceholder(/Paste or type the reading passage/).fill(passage);

  // Fill questions
  for (let qi = 0; qi < questions.length; qi++) {
    if (qi > 0) {
      await page.getByRole('button', { name: /Add Question/i }).click();
    }
    const q = questions[qi];
    const card = page.locator('.card').filter({ hasText: `Question #${qi + 1}` });
    await card.getByPlaceholder(/e\.g\. What is the main idea/).fill(q.question);
    for (let ci = 0; ci < 4; ci++) {
      await card.getByPlaceholder(`Choice ${ci + 1}`).fill(q.choices[ci]);
    }
    await card.locator(`input[name="q_correct_${qi}"]`).nth(q.correctIndex).check();
  }

  await page.getByRole('button', { name: /Create Quiz/i }).click();
  await expect(page).toHaveURL(/\/admin\/quizzes$/);
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('1. First-Time Setup', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
  });

  test('admin login page shows Rigor Vocab branding', async ({ page }) => {
    await expect(page.getByText('Rigor')).toBeVisible();
    await expect(page.getByText('Vocab')).toBeVisible();
    await expect(page.getByText('Admin Dashboard')).toBeVisible();
  });

  test('kid login page shows at /quiz/login', async ({ page }) => {
    await page.goto('/quiz/login');
    await expect(page.getByText('Student Login')).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });

  test('admin first-time shows set password form', async ({ page }) => {
    await expect(page.getByText('Welcome! Set a Password')).toBeVisible();
  });

  test('admin rejects short password', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('abc');
    await page.getByLabel('Confirm Password').fill('abc');
    await page.getByRole('button', { name: /Set Password/i }).click();
    await expect(page.getByText('at least 4 characters')).toBeVisible();
  });

  test('admin rejects mismatched passwords', async ({ page }) => {
    await page.getByLabel('Password', { exact: true }).fill('test1234');
    await page.getByLabel('Confirm Password').fill('different');
    await page.getByRole('button', { name: /Set Password/i }).click();
    await expect(page.getByText("don't match")).toBeVisible();
  });

  test('provider accepts valid password and navigates to kids page', async ({ page }) => {
    await setupProvider(page);
    await expect(page.getByRole('heading', { name: 'Kids' })).toBeVisible();
  });
});

test.describe('2. Kid Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
  });

  test('kids page shows empty state', async ({ page }) => {
    await expect(page.getByText('No kids yet')).toBeVisible();
  });

  test('add kid with valid data', async ({ page }) => {
    await addKid(page, 'Alice', 'alice123', '4th');
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Grade: 4th')).toBeVisible();
  });

  test('reject duplicate name', async ({ page }) => {
    await addKid(page, 'Alice', 'alice123', '4th');
    await page.getByRole('button', { name: /\+ Add Kid/i }).click();
    await page.getByLabel(/Name/i).fill('Alice');
    await page.getByLabel('Password').fill('other');
    await page.getByLabel('Grade').fill('9th');
    await page.locator('.modal-content').getByRole('button', { name: 'Add Kid' }).click();
    await expect(page.getByText('already used')).toBeVisible();
  });

  test('edit kid', async ({ page }) => {
    await addKid(page, 'Alice', 'alice123', '4th');
    await page.getByRole('button', { name: 'Edit' }).click();
    await page.getByLabel(/Name/i).fill('Alice Updated');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByText('Alice Updated')).toBeVisible();
  });

  test('delete kid', async ({ page }) => {
    await addKid(page, 'Alice', 'alice123', '4th');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('No kids yet')).toBeVisible();
  });
});

test.describe('3. Quiz Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await addKid(page, 'Bob', 'bob123', '9th');
  });

  test('quizzes page shows quiz list or empty state', async ({ page }) => {
    await page.goto('/admin/quizzes');
    // May have auto-loaded quizzes from public/quizzes/, so just verify the page renders
    await expect(page.getByRole('heading', { name: 'Quizzes' })).toBeVisible();
  });

  test('create quiz with validation errors then fix', async ({ page }) => {
    await page.goto('/admin/quizzes/new');
    await page.getByRole('button', { name: /Create Quiz/i }).click();
    await expect(page.getByText('title is required')).toBeVisible();
  });

  test('create quiz successfully', async ({ page }) => {
    await createQuiz(page, 'Week 1 Vocab', ['Alice'], SAMPLE_WORDS);
    await expect(page.getByText('Week 1 Vocab')).toBeVisible();
    await expect(page.getByText('3 words')).toBeVisible();
  });

  test('edit quiz', async ({ page }) => {
    await createQuiz(page, 'Week 1 Vocab', ['Alice'], SAMPLE_WORDS);
    // Click edit on the quiz we just created (last one in the list)
    await page.getByRole('link', { name: 'Edit' }).last().click();
    await page.getByPlaceholder('e.g. Week 12 Vocabulary').fill('Week 1 Updated');
    await page.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.getByText('Week 1 Updated')).toBeVisible();
  });

  test('delete quiz', async ({ page }) => {
    await createQuiz(page, 'Week 1 Vocab', ['Alice'], SAMPLE_WORDS);
    page.on('dialog', dialog => dialog.accept());
    // Delete the quiz we just created (last one)
    await page.getByRole('button', { name: 'Delete' }).last().click();
    await expect(page.getByText('Week 1 Vocab')).toBeHidden();
  });
});

test.describe('4. Quiz Assignment & Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await addKid(page, 'Bob', 'bob123', '9th');
    await createQuiz(page, 'Alice Only Quiz', ['Alice'], SAMPLE_WORDS);
    await createQuiz(page, 'Shared Quiz', ['Alice', 'Bob'], SAMPLE_WORDS);
    await createQuiz(page, 'Bob Only Quiz', ['Bob'], SAMPLE_WORDS);
  });

  test('Alice sees only her next untaken quiz', async ({ page }) => {
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    // Alice should see first assigned quiz (Alice Only Quiz, seq 1) as the next quiz
    await expect(page.getByText('Alice Only Quiz')).toBeVisible();
    // Bob Only Quiz should not be visible at all
    await expect(page.getByText('Bob Only Quiz')).toBeHidden();
  });

  test('Bob sees only his next untaken quiz', async ({ page }) => {
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Bob', 'bob123');
    // Bob should see Shared Quiz (seq 2) as the next quiz — it's his lowest seq
    await expect(page.getByText('Shared Quiz')).toBeVisible();
    // Alice Only Quiz should not be visible at all
    await expect(page.getByText('Alice Only Quiz')).toBeHidden();
  });
});

test.describe('5. Taking a Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createQuiz(page, 'Test Quiz', ['Alice'], SAMPLE_WORDS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('quiz page shows all questions scrollable', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Each word appears as a heading span and bold in the sentence
    await expect(page.locator('span').filter({ hasText: 'benevolent' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'ephemeral' })).toBeVisible();
    await expect(page.locator('span').filter({ hasText: 'gregarious' })).toBeVisible();
  });

  test('submit button disabled until all answered', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    const submitBtn = page.getByRole('button', { name: /Submit Quiz|answered/i });
    await expect(submitBtn).toBeDisabled();
    await expect(page.getByText('0/3 answered')).toBeVisible();
  });

  test('answer count updates as questions are answered', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Answer first question
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    await expect(page.getByText('1/3 answered')).toBeVisible();
  });

  test('full quiz submission with perfect score', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();

    // Answer all correctly
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();

    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();

    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();

    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    // Should see results
    await expect(page.getByText('3 out of 3')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('quiz submission with wrong answers', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();

    // Answer 1 correct, 2 wrong
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();

    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'permanent' }).click(); // wrong

    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'shy' }).click(); // wrong

    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    await expect(page.getByText('1 out of 3')).toBeVisible({ timeout: 10000 });
    // Should show wrong answers
    await expect(page.getByText('Your answer: permanent')).toBeVisible();
    await expect(page.getByText('Correct: short-lived')).toBeVisible();
  });
});

test.describe('6. Quiz Results (Kid)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createQuiz(page, 'Test Quiz', ['Alice'], SAMPLE_WORDS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');

    // Take the quiz
    await page.getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
  });

  test('results page shows score', async ({ page }) => {
    await expect(page.getByText('3 out of 3')).toBeVisible({ timeout: 10000 });
  });

  test('back to quizzes shows quiz in previously taken', async ({ page }) => {
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();
    // Quiz should now be in "Previously Taken" section
    await expect(page.getByText(/Previously Taken/)).toBeVisible();
    // Expand it
    await page.getByText(/Previously Taken/).click();
    await expect(page.getByRole('link', { name: 'Retake' })).toBeVisible();
  });

  test('try again starts fresh quiz', async ({ page }) => {
    await page.getByRole('link', { name: 'Try Again' }).click();
    // Should be on the quiz page with no answers selected
    await expect(page.getByText('0/3 answered')).toBeVisible();
  });
});

test.describe('7. Kid Results History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createQuiz(page, 'Test Quiz', ['Alice'], SAMPLE_WORDS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('empty history', async ({ page }) => {
    await page.getByRole('link', { name: 'My Results' }).click();
    await expect(page.getByText('No results yet')).toBeVisible();
  });

  test('history shows after taking quiz', async ({ page }) => {
    // Take quiz
    await page.getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    // Check history
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();
    await page.getByRole('link', { name: 'My Results' }).click();
    await expect(page.getByText('Test Quiz')).toBeVisible();
    await expect(page.getByText('3/3')).toBeVisible();
  });
});

test.describe('8. Provider Results View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await addKid(page, 'Bob', 'bob123', '9th');
    await createQuiz(page, 'Test Quiz', ['Alice', 'Bob'], SAMPLE_WORDS);

    // Alice takes quiz
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    // Log back in as provider
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsProvider(page);
  });

  test('results table shows attempts', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Test Quiz')).toBeVisible();
    await expect(page.getByText('3/3')).toBeVisible();
  });

  test('filter by kid', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await page.getByLabel('Filter by Kid').selectOption({ label: 'Bob' });
    await expect(page.getByText('No results yet')).toBeVisible();
  });

  test('result detail page shows per-word breakdown', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await page.getByRole('link', { name: 'Details' }).click();
    await expect(page.getByRole('cell', { name: 'benevolent', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'ephemeral', exact: true })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'gregarious', exact: true })).toBeVisible();
  });
});

test.describe('9. Provider Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createQuiz(page, 'Test Quiz', ['Alice'], SAMPLE_WORDS);

    // Alice takes quiz with 1 wrong answer
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'permanent' }).click(); // wrong
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsProvider(page);
  });

  test('analytics shows per-word stats', async ({ page }) => {
    await page.getByRole('link', { name: 'Analytics' }).click();
    await expect(page.getByRole('cell', { name: 'ephemeral' })).toBeVisible();
    await expect(page.getByRole('cell', { name: '100%' }).first()).toBeVisible(); // ephemeral miss rate
  });

  test('analytics filter by kid', async ({ page }) => {
    await page.getByRole('link', { name: 'Analytics' }).click();
    await page.getByLabel('Filter by Kid').selectOption({ label: 'Alice' });
    await expect(page.getByText('ephemeral')).toBeVisible();
  });
});

test.describe('10. Export / Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createQuiz(page, 'Test Quiz', ['Alice'], SAMPLE_WORDS);
  });

  test('export page shows data counts', async ({ page }) => {
    await page.goto('/admin/export');
    await expect(page.getByText('1 kids')).toBeVisible();
    // At least 1 quiz (may include auto-loaded quizzes)
    await expect(page.getByText(/\d+ quizzes/)).toBeVisible();
  });

  test('export downloads a file', async ({ page }) => {
    await page.goto('/admin/export');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Export/i }).click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/vocab-quiz-export.*\.json/);
  });

  test('import restores data', async ({ page }) => {
    // Export first
    await page.goto('/admin/export');
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /Download Export/i }).click(),
    ]);
    const path = await download.path();

    // Clear data
    await clearStorage(page);
    await setupProvider(page, 'newpass1234');
    await page.goto('/admin/export');
    await expect(page.getByText('0 kids')).toBeVisible();

    // Import
    await page.locator('input[type="file"]').setInputFiles(path!);
    await expect(page.getByText('Imported')).toBeVisible();
  });

  test('import resolves kid names to IDs in assignedKidIds', async ({ page }) => {
    // Kid "Alice" already exists from beforeEach
    // Import a full export that uses name "Alice" instead of the kid ID
    const quizJson = JSON.stringify({
      exportedAt: new Date().toISOString(),
      version: 1,
      kids: [],
      quizzes: [{
        id: 'quiz_name_test',
        title: 'Name-Resolved Quiz',
        assignedKidIds: ['Alice'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        words: [
          { id: 'word_0', word: 'test', sentence: 'A test sentence.', choices: ['a', 'b', 'c', 'd'], correctAnswer: 'a' }
        ]
      }],
      results: []
    });
    const tmpPath = '/tmp/name-resolve-test.json';
    await page.evaluate((content) => {
      // Write to a blob and create a file for upload
      (window as any).__testQuizJson = content;
    }, quizJson);

    // Create a temp file via the page
    await page.goto('/admin/export');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    const buffer = Buffer.from(quizJson);
    await fileChooser.setFiles({ name: 'test-quiz.json', mimeType: 'application/json', buffer });

    await expect(page.getByText('Imported')).toBeVisible();

    // Now log out and log in as Alice — the quiz should appear
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await expect(page.getByText('Name-Resolved Quiz')).toBeVisible();
  });
});

test.describe('11. Auth & Navigation Guards', () => {
  test('admin routes redirect to root when not logged in', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { sessionStorage.clear(); });
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL('/');
  });

  test('kid routes redirect to kid login when not logged in', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { sessionStorage.clear(); });
    await page.goto('/quiz/dashboard');
    await expect(page).toHaveURL(/\/quiz\/login/);
  });

  test('provider logout returns to landing', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL('/');
  });

  test('kid logout returns to kid login', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/quiz/);
  });
});

test.describe('12. Provider Re-login', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await page.getByRole('button', { name: 'Logout' }).click();
  });

  test('shows login form not first-time setup', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    await expect(page.getByText('Welcome! Set a Password')).toBeHidden();
  });

  test('rejects wrong password', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Password', { exact: true }).fill('wrongpass');
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText('Incorrect password')).toBeVisible();
  });

  test('accepts correct password', async ({ page }) => {
    await loginAsProvider(page);
    await expect(page).toHaveURL(/\/admin\/dashboard/);
  });
});

test.describe('13. Auto-load quizzes from public/quizzes/', () => {
  test('alwaysShowSentence=false hides sentence behind hint button', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');

    // Import a quiz with alwaysShowSentence: false
    const quizJson = JSON.stringify({
      title: 'Hint Quiz',
      seq: 99,
      assignTo: 'Alice',
      alwaysShowSentence: false,
      words: [
        { word: 'vivid', sentence: 'The vivid colors were beautiful.', choices: ['bright', 'dull', 'cold', 'fast'], answer: 'bright' }
      ]
    });
    await page.goto('/admin/export');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({ name: 'hint-quiz.json', mimeType: 'application/json', buffer: Buffer.from(quizJson) });
    await expect(page.getByText('Imported')).toBeVisible();

    // Log in as Alice and take the quiz
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();

    // Sentence should NOT be visible, hint button should be
    await expect(page.getByText('vivid colors')).toBeHidden();
    await expect(page.getByRole('button', { name: /Show word in a sentence/ })).toBeVisible();

    // Click the hint button — sentence should appear
    await page.getByRole('button', { name: /Show word in a sentence/ }).click();
    await expect(page.getByText('vivid colors')).toBeVisible();

    // Answer and submit
    await page.getByRole('button', { name: 'bright' }).click();
    await page.getByRole('button', { name: /Submit Quiz/ }).click();
    await expect(page.getByText('1 out of 1')).toBeVisible();
  });

  test('quizzes from public/quizzes/ are loaded and kid can see them', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'shrey', 'shrey123', '4th');
    // Trigger server-side quiz reload after reset
    await page.evaluate(async () => {
      await fetch('/api/reload-quizzes', { method: 'POST' });
    });
    await page.goto('/admin/quizzes');
    await page.waitForTimeout(1000);
    await page.reload();
    // Wait for auto-loader to fetch and process files
    await expect(page.getByText('Positive Traits')).toBeVisible({ timeout: 10000 });
    // Log in as shrey — should see the next quiz
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'shrey', 'shrey123');
    await expect(page.getByText('Positive Traits')).toBeVisible();
  });
});

test.describe('14. Quiz retake and progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    // Create two quizzes with different seq numbers
    await createQuiz(page, 'Quiz One', ['Alice'], SAMPLE_WORDS);
    await createQuiz(page, 'Quiz Two', ['Alice'], SAMPLE_WORDS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('after completing quiz 1, quiz 2 becomes the next quiz', async ({ page }) => {
    // Should see Quiz One first (lower seq)
    await expect(page.getByText('Quiz One')).toBeVisible();
    // Take it
    await page.getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    // Go back to dashboard
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();
    // Quiz Two should now be the next vocab quiz
    await expect(page.getByText('Vocabulary')).toBeVisible();
    await expect(page.getByText('Quiz Two')).toBeVisible();
    // Quiz One should be in Previously Taken
    await page.getByText(/Previously Taken/).click();
    await expect(page.getByText('Quiz One')).toBeVisible();
  });

  test('retaking a quiz creates a second result in history', async ({ page }) => {
    // Take quiz
    await page.getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    // Retake
    await page.getByRole('link', { name: 'Try Again' }).click();
    await page.locator('.card').filter({ hasText: 'benevolent' }).getByRole('button', { name: 'kind' }).click();
    await page.locator('.card').filter({ hasText: 'ephemeral' }).getByRole('button', { name: 'permanent' }).click();
    await page.locator('.card').filter({ hasText: 'gregarious' }).getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    // Check history has two entries
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();
    await page.getByRole('link', { name: 'My Results' }).click();
    const resultCards = page.locator('.card').filter({ hasText: 'Quiz One' });
    await expect(resultCards).toHaveCount(2);
  });

  test('all quizzes done shows "All caught up" message', async ({ page }) => {
    // Take quiz one
    await page.getByRole('link', { name: /Start/ }).click();
    const q1a = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1a.getByRole('button', { name: 'kind' }).click();
    const q2a = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2a.getByRole('button', { name: 'short-lived' }).click();
    const q3a = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3a.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();
    // Take quiz two
    await page.getByRole('link', { name: /Start/ }).click();
    await page.locator('.card').filter({ hasText: 'benevolent' }).getByRole('button', { name: 'kind' }).click();
    await page.locator('.card').filter({ hasText: 'ephemeral' }).getByRole('button', { name: 'short-lived' }).click();
    await page.locator('.card').filter({ hasText: 'gregarious' }).getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();
    // Should show "All caught up"
    await expect(page.getByText('All caught up')).toBeVisible();
  });
});

test.describe('15. Delete kid cascades', () => {
  test('deleting a kid removes their quiz assignments and results', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createQuiz(page, 'Cascade Quiz', ['Alice'], SAMPLE_WORDS);
    // Alice takes the quiz
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();
    await page.locator('.card').filter({ hasText: 'benevolent' }).getByRole('button', { name: 'kind' }).click();
    await page.locator('.card').filter({ hasText: 'ephemeral' }).getByRole('button', { name: 'short-lived' }).click();
    await page.locator('.card').filter({ hasText: 'gregarious' }).getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    // Log back as admin and delete Alice
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsProvider(page);
    await page.goto('/admin/kids');
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Delete' }).click();
    // Verify Alice is gone
    await expect(page.getByText('No kids yet')).toBeVisible();
    // Verify results are gone
    await page.goto('/admin/results');
    await expect(page.getByText('No results yet')).toBeVisible();
  });
});

test.describe('16. Backend API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
  });

  test('data persists across page reloads (server-side storage)', async ({ page }) => {
    await setupProvider(page);
    await addKid(page, 'PersistKid', 'persist123', '5th');
    // Full page reload — data should come from server, not localStorage
    await page.reload();
    await page.waitForTimeout(1000);
    await page.goto('/admin/kids');
    await expect(page.getByText('PersistKid')).toBeVisible();
  });

  test('API CRUD: create and retrieve kid via server', async ({ page }) => {
    // Directly test the API
    const kid = await page.evaluate(async () => {
      const res = await fetch('/api/kids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'APIKid', password: 'api123', grade: '3rd' }),
      });
      return res.json();
    });
    expect(kid).toHaveProperty('id');
    expect(kid).toHaveProperty('name', 'APIKid');

    // Verify it's in the full data
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/data');
      return res.json();
    });
    const found = data.kids.find((k: any) => k.name === 'APIKid');
    expect(found).toBeTruthy();
  });

  test('API CRUD: create and delete quiz via server', async ({ page }) => {
    const quiz = await page.evaluate(async () => {
      const res = await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'API Quiz', seq: 999, assignedKidIds: [],
          words: [{ id: 'w0', word: 'test', sentence: 'A test.', choices: ['a','b','c','d'], correctAnswer: 'a' }],
        }),
      });
      return res.json();
    });
    expect(quiz).toHaveProperty('id');

    // Delete it
    await page.evaluate(async (id) => {
      await fetch(`/api/quizzes/${id}`, { method: 'DELETE' });
    }, quiz.id);

    // Verify it's gone
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/data');
      return res.json();
    });
    const found = data.quizzes.find((q: any) => q.id === quiz.id);
    expect(found).toBeFalsy();
  });

  test('API: save result persists to server', async ({ page }) => {
    const result = await page.evaluate(async () => {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quizId: 'q1', kidId: 'k1', kidName: 'Test', quizTitle: 'Test Quiz',
          startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
          score: 5, totalWords: 10, answers: [],
        }),
      });
      return res.json();
    });
    expect(result).toHaveProperty('id');

    // Verify persistence
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/data');
      return res.json();
    });
    expect(data.results.some((r: any) => r.id === result.id)).toBe(true);
  });

  test('API: reset clears all data', async ({ page }) => {
    // Add some data
    await page.evaluate(async () => {
      await fetch('/api/kids', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'ResetKid', password: 'x', grade: '1st' }),
      });
    });

    // Reset
    await page.evaluate(async () => {
      await fetch('/api/reset', { method: 'POST' });
    });

    // Verify empty
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/data');
      return res.json();
    });
    expect(data.kids).toHaveLength(0);
    expect(data.quizzes).toHaveLength(0);
    expect(data.results).toHaveLength(0);
  });

  test('API: concurrent result submissions both persist', async ({ page }) => {
    // Submit two results simultaneously
    const results = await page.evaluate(async () => {
      const makeResult = (kidName: string) => ({
        quizId: 'q1', kidId: `kid_${kidName}`, kidName, quizTitle: 'Test',
        startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
        score: 3, totalWords: 5, answers: [],
      });
      const [r1, r2] = await Promise.all([
        fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeResult('Alice')) }).then(r => r.json()),
        fetch('/api/results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(makeResult('Bob')) }).then(r => r.json()),
      ]);
      return [r1, r2];
    });
    expect(results[0]).toHaveProperty('id');
    expect(results[1]).toHaveProperty('id');

    // Both should be in the data
    const data = await page.evaluate(async () => {
      const res = await fetch('/api/data');
      return res.json();
    });
    expect(data.results.length).toBeGreaterThanOrEqual(2);
    expect(data.results.some((r: any) => r.kidName === 'Alice')).toBe(true);
    expect(data.results.some((r: any) => r.kidName === 'Bob')).toBe(true);
  });
});

// ─── Reading Comprehension Tests ───────────────────────────────────────────

test.describe('17. Reading Quiz Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
  });

  test('quiz form shows type selector for new quiz', async ({ page }) => {
    await page.goto('/admin/quizzes/new');
    await expect(page.getByRole('button', { name: 'Vocabulary' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reading Comprehension' })).toBeVisible();
  });

  test('switching to reading type shows passage and questions editor', async ({ page }) => {
    await page.goto('/admin/quizzes/new');
    await page.getByRole('button', { name: 'Reading Comprehension' }).click();
    await expect(page.getByPlaceholder(/Paste or type the reading passage/)).toBeVisible();
    await expect(page.getByText('Question #1')).toBeVisible();
  });

  test('reading quiz validation requires passage and question', async ({ page }) => {
    await page.goto('/admin/quizzes/new');
    await page.getByRole('button', { name: 'Reading Comprehension' }).click();
    await page.getByRole('button', { name: /Create Quiz/i }).click();
    await expect(page.getByText('title is required')).toBeVisible();
    await expect(page.getByText('Passage text is required')).toBeVisible();
  });

  test('create reading quiz successfully', async ({ page }) => {
    await createReadingQuiz(page, 'Water Cycle Reading', ['Alice'], SAMPLE_PASSAGE, SAMPLE_QUESTIONS);
    await expect(page.getByText('Water Cycle Reading')).toBeVisible();
    await expect(page.getByText('3 questions')).toBeVisible();
    await expect(page.getByText('Reading', { exact: true })).toBeVisible();
  });

  test('edit reading quiz shows locked type', async ({ page }) => {
    await createReadingQuiz(page, 'Water Cycle Reading', ['Alice'], SAMPLE_PASSAGE, SAMPLE_QUESTIONS);
    await page.getByRole('link', { name: 'Edit' }).last().click();
    // Type should be displayed but not changeable
    await expect(page.getByText('Reading Comprehension')).toBeVisible();
    // The type selector buttons should NOT be present (locked for editing)
    await expect(page.getByRole('button', { name: 'Vocabulary' })).toBeHidden();
  });
});

test.describe('18. Taking a Reading Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createReadingQuiz(page, 'Water Cycle', ['Alice'], SAMPLE_PASSAGE, SAMPLE_QUESTIONS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('reading quiz shows passage at top', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    await expect(page.getByText('Water on Earth is constantly moving')).toBeVisible();
  });

  test('reading quiz shows questions with choices', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    await expect(page.getByText('What causes water to evaporate?')).toBeVisible();
    await expect(page.getByText('What happens when water vapor cools?')).toBeVisible();
    await expect(page.getByText('What is the passage mainly about?')).toBeVisible();
  });

  test('reading quiz submit disabled until all answered', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    const submitBtn = page.getByRole('button', { name: /Submit Quiz|answered/i });
    await expect(submitBtn).toBeDisabled();
    await expect(submitBtn).toContainText('0/3 answered');
  });

  test('reading quiz perfect score', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();

    // Answer all correctly using bubble choices in split-screen layout
    await page.locator('.sat-choice').filter({ hasText: "The sun's heat" }).click();
    await page.locator('.sat-choice').filter({ hasText: 'It condenses into droplets' }).click();
    await page.locator('.sat-choice').filter({ hasText: 'The water cycle' }).click();

    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    await expect(page.getByText('3 out of 3')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('reading quiz wrong answers show review', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();

    // Answer using bubble choices
    await page.locator('.sat-choice').filter({ hasText: 'Wind' }).click(); // wrong
    await page.locator('.sat-choice').filter({ hasText: 'It condenses into droplets' }).click(); // correct
    await page.locator('.sat-choice').filter({ hasText: 'Ocean life' }).click(); // wrong

    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    await expect(page.getByText('1 out of 3')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Your answer: Wind')).toBeVisible();
    await expect(page.getByText("Correct: The sun's heat")).toBeVisible();
  });
});

test.describe('19. Reading Quiz Results (Provider)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createReadingQuiz(page, 'Water Cycle', ['Alice'], SAMPLE_PASSAGE, SAMPLE_QUESTIONS);

    // Alice takes the reading quiz
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();
    await page.locator('.sat-choice').filter({ hasText: "The sun's heat" }).click();
    await page.locator('.sat-choice').filter({ hasText: 'It condenses into droplets' }).click();
    await page.locator('.sat-choice').filter({ hasText: 'The water cycle' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsProvider(page);
  });

  test('results table shows reading quiz attempt', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await expect(page.getByText('Alice')).toBeVisible();
    await expect(page.getByText('Water Cycle')).toBeVisible();
    await expect(page.getByText('3/3')).toBeVisible();
  });

  test('result detail shows Question column for reading quiz', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await page.getByRole('link', { name: 'Details' }).click();
    // Should show "Question" header instead of "Word"
    await expect(page.getByRole('columnheader', { name: 'Question' })).toBeVisible();
    // Should NOT show "Sentence" column
    await expect(page.getByRole('columnheader', { name: 'Sentence' })).toBeHidden();
    // Should show the question text
    await expect(page.getByRole('cell', { name: /What causes water to evaporate/ })).toBeVisible();
  });
});

test.describe('20. Mixed Vocab and Reading Quiz Progression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    // Create a vocab quiz first (lower seq), then a reading quiz
    await createQuiz(page, 'Vocab Quiz', ['Alice'], SAMPLE_WORDS);
    await createReadingQuiz(page, 'Reading Quiz', ['Alice'], SAMPLE_PASSAGE, SAMPLE_QUESTIONS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('kid sees vocab quiz first, then reading quiz after completing it', async ({ page }) => {
    // Should see both cards
    await expect(page.getByText('Vocab Quiz')).toBeVisible();
    await expect(page.getByText('Reading Quiz')).toBeVisible();

    // Take the vocab quiz (click Start in the vocab card)
    await page.locator('.card').filter({ hasText: 'Vocab Quiz' }).getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    // Go back to dashboard
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();

    // Should now see Reading Quiz in the reading card
    await expect(page.getByText('Reading Quiz')).toBeVisible();

    // Should show "3 questions" not "3 words"
    await expect(page.getByText('3 questions')).toBeVisible();
  });

  test('kid dashboard shows reading quiz item count', async ({ page }) => {
    // Take the vocab quiz first
    await page.locator('.card').filter({ hasText: 'Vocab Quiz' }).getByRole('link', { name: /Start/ }).click();
    await page.locator('.card').filter({ hasText: 'benevolent' }).getByRole('button', { name: 'kind' }).click();
    await page.locator('.card').filter({ hasText: 'ephemeral' }).getByRole('button', { name: 'short-lived' }).click();
    await page.locator('.card').filter({ hasText: 'gregarious' }).getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();

    // The next quiz card should show "3 questions"
    await expect(page.getByText('3 questions')).toBeVisible();
  });
});

test.describe('21. Reading Quiz Import', () => {
  test('import reading quiz via JSON file', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');

    const quizJson = JSON.stringify({
      title: 'Imported Reading Quiz',
      type: 'reading',
      seq: 50,
      assignTo: 'Alice',
      passage: 'The quick brown fox jumps over the lazy dog.',
      questions: [
        { question: 'What did the fox do?', choices: ['Jumped', 'Slept', 'Ran', 'Ate'], answer: 'Jumped' },
      ],
    });

    await page.goto('/admin/export');
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('input[type="file"]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({ name: 'reading-quiz.json', mimeType: 'application/json', buffer: Buffer.from(quizJson) });
    await expect(page.getByText('Imported')).toBeVisible();

    // Verify quiz appears
    await page.goto('/admin/quizzes');
    await expect(page.getByText('Imported Reading Quiz')).toBeVisible();
    await expect(page.getByText('Reading', { exact: true })).toBeVisible();

    // Kid can take it
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();
    await expect(page.getByText('The quick brown fox')).toBeVisible();
    await expect(page.getByText('What did the fox do?')).toBeVisible();
  });
});

// ─── SAT Reading Tests ─────────────────────────────────────────────────────

test.describe('22. SAT Reading Quiz Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
  });

  test('quiz form shows SAT Reading type option', async ({ page }) => {
    await page.goto('/admin/quizzes/new');
    await expect(page.getByRole('button', { name: 'SAT Reading' })).toBeVisible();
  });

  test('SAT Reading editor shows passage + question per item', async ({ page }) => {
    await page.goto('/admin/quizzes/new');
    await page.getByRole('button', { name: 'SAT Reading' }).click();
    await expect(page.getByPlaceholder(/Short passage/)).toBeVisible();
    await expect(page.getByPlaceholder(/e\.g\. Which choice best/)).toBeVisible();
  });

  test('create SAT quiz successfully', async ({ page }) => {
    await createSATQuiz(page, 'SAT Practice 1', ['Alice'], SAMPLE_SAT_QUESTIONS);
    await expect(page.getByText('SAT Practice 1')).toBeVisible();
    await expect(page.getByText('2 questions')).toBeVisible();
    await expect(page.getByText('SAT Reading', { exact: true })).toBeVisible();
  });
});

test.describe('23. Taking a SAT Reading Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createSATQuiz(page, 'SAT Practice', ['Alice'], SAMPLE_SAT_QUESTIONS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('SAT quiz shows split-screen with passage and question', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Should show passage on left
    await expect(page.getByText('Fleming noticed')).toBeVisible();
    // Should show question on right
    await expect(page.getByText('What did Fleming observe?')).toBeVisible();
    // Should show numbered nav
    await expect(page.locator('.sat-nav-btn').first()).toBeVisible();
    await expect(page.getByText('Q 1 of 2')).toBeVisible();
  });

  test('SAT quiz navigation between questions', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Should be on Q1
    await expect(page.locator('.sat-passage-content').getByText('Fleming noticed')).toBeVisible();
    // Click Next
    await page.getByRole('button', { name: 'Next' }).click();
    // Should be on Q2
    await expect(page.locator('.sat-passage-content').getByText('Industrial Revolution')).toBeVisible();
    await expect(page.getByText('Q 2 of 2')).toBeVisible();
    // Click Previous
    await page.getByRole('button', { name: 'Previous' }).click();
    // Back to Q1
    await expect(page.locator('.sat-passage-content').getByText('Fleming noticed')).toBeVisible();
  });

  test('SAT quiz numbered nav jumps to question', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Click question 2 in nav bar
    await page.locator('.sat-nav-btn').nth(1).click();
    await expect(page.locator('.sat-passage-content').getByText('Industrial Revolution')).toBeVisible();
  });

  test('SAT quiz review screen shows answered status', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Answer Q1
    await page.locator('.sat-choice').filter({ hasText: 'Mold killing bacteria' }).click();
    // Go to Q2
    await page.getByRole('button', { name: 'Next' }).click();
    // Click Review
    await page.getByRole('button', { name: /Review/ }).click();
    // Should show review screen
    await expect(page.getByText('Review Your Answers')).toBeVisible();
    await expect(page.getByText('1 of 2 answered')).toBeVisible();
  });

  test('SAT quiz full submission with perfect score', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Answer Q1
    await page.locator('.sat-choice').filter({ hasText: 'Mold killing bacteria' }).click();
    // Go to Q2
    await page.getByRole('button', { name: 'Next' }).click();
    // Answer Q2
    await page.locator('.sat-choice').filter({ hasText: 'Economic shift to manufacturing' }).click();
    // Review & Submit
    await page.getByRole('button', { name: /Review/ }).click();
    await expect(page.getByText('2 of 2 answered')).toBeVisible();
    await page.getByRole('button', { name: /Submit Test/ }).click();
    // Should see results
    await expect(page.getByText('2 out of 2')).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
  });

  test('SAT quiz review lets you go back to fix answers', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Answer Q1
    await page.locator('.sat-choice').filter({ hasText: 'Mold killing bacteria' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    // Go to review without answering Q2
    await page.getByRole('button', { name: /Review/ }).click();
    // Click Q2 button to go back
    await page.getByRole('button', { name: '2', exact: true }).click();
    // Should be back on Q2
    await expect(page.locator('.sat-passage-content').getByText('Industrial Revolution')).toBeVisible();
  });
});

test.describe('24. SAT Quiz Results (Provider)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createSATQuiz(page, 'SAT Practice', ['Alice'], SAMPLE_SAT_QUESTIONS);

    // Alice takes the SAT quiz
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();
    await page.locator('.sat-choice').filter({ hasText: 'Mold killing bacteria' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.locator('.sat-choice').filter({ hasText: 'Economic shift to manufacturing' }).click();
    await page.getByRole('button', { name: /Review/ }).click();
    await page.getByRole('button', { name: /Submit Test/ }).click();

    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsProvider(page);
  });

  test('results show SAT quiz attempt', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await expect(page.getByText('SAT Practice')).toBeVisible();
    await expect(page.getByText('2/2')).toBeVisible();
  });

  test('result detail shows Question column for SAT quiz', async ({ page }) => {
    await page.getByRole('link', { name: 'Results' }).click();
    await page.getByRole('link', { name: 'Details' }).click();
    await expect(page.getByRole('columnheader', { name: 'Question' })).toBeVisible();
    await expect(page.getByRole('cell', { name: /What did Fleming observe/ })).toBeVisible();
  });
});

test.describe('25. SAT Quiz on Kid Dashboard', () => {
  test('SAT quiz grouped with reading card', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');
    await createSATQuiz(page, 'SAT Practice', ['Alice'], SAMPLE_SAT_QUESTIONS);
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    // SAT quiz should appear in the Reading card
    await expect(page.getByText('SAT Practice')).toBeVisible();
    await expect(page.getByText('2 questions')).toBeVisible();
  });
});

// ─── Timed SAT Reading Tests ───────────────────────────────────────────────

test.describe('26. Timed SAT Reading Quiz', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');

    // Import a timed SAT quiz via API
    await page.evaluate(async () => {
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'timed_sat_1',
          title: 'Timed SAT Practice',
          type: 'satReading',
          timed: true,
          seq: 9000,
          assignedKidIds: [],
          words: [],
          satQuestions: [
            { id: 'tsq_0', passage: 'Passage about history.', question: 'What is the topic?', choices: ['History', 'Science', 'Art', 'Math'], correctAnswer: 'History' },
            { id: 'tsq_1', passage: 'Passage about biology.', question: 'What field is this?', choices: ['Physics', 'Biology', 'Chemistry', 'Geology'], correctAnswer: 'Biology' },
          ],
        }),
      });
      // Assign to Alice by fetching data and patching
      const res = await fetch('/api/data');
      const data = await res.json();
      const alice = data.kids.find((k: any) => k.name === 'Alice');
      if (alice) {
        await fetch('/api/quizzes/timed_sat_1', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assignedKidIds: [alice.id] }),
        });
      }
    });

    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
  });

  test('timed quiz shows timer in nav bar', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    await expect(page.getByTestId('sat-timer')).toBeVisible();
    await expect(page.getByTestId('sat-timer')).toHaveText('00:00');
    // Wait 2 seconds and verify timer advanced
    await page.waitForTimeout(2100);
    const text = await page.getByTestId('sat-timer').textContent();
    expect(text).not.toBe('00:00');
  });

  test('pause button blurs content and stops timer', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Wait for timer to start
    await page.waitForTimeout(1100);
    // Click Pause
    await page.getByRole('button', { name: 'Pause' }).click();
    // Content should be blurred
    await expect(page.locator('.sat-split--blurred')).toBeVisible();
    // Should show "Test Paused"
    await expect(page.getByText('Test Paused')).toBeVisible();
    // Timer should show Resume button
    await expect(page.getByRole('button', { name: 'Resume' })).toBeVisible();
  });

  test('resume button restores content', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(page.locator('.sat-split--blurred')).toBeVisible();
    // Click Resume
    await page.getByRole('button', { name: 'Resume' }).click();
    // Blur should be gone
    await expect(page.locator('.sat-split--blurred')).toBeHidden();
    // Should show Pause button again
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  });

  test('timed quiz shows time taken in results', async ({ page }) => {
    await page.getByRole('link', { name: /Start/ }).click();
    // Wait briefly so timer is non-zero
    await page.waitForTimeout(1100);
    // Answer both questions
    await page.locator('.sat-choice').filter({ hasText: 'History' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.locator('.sat-choice').filter({ hasText: 'Biology' }).click();
    await page.getByRole('button', { name: /Review/ }).click();
    await page.getByRole('button', { name: /Submit Test/ }).click();
    // Result page should show time
    await expect(page.getByText(/Time:/)).toBeVisible();
  });

  test('non-timed SAT quiz does not show timer', async ({ page }) => {
    // Create a non-timed SAT quiz via API
    await page.evaluate(async () => {
      const res = await fetch('/api/data');
      const data = await res.json();
      const alice = data.kids.find((k: any) => k.name === 'Alice');
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'untimed_sat_1',
          title: 'Untimed SAT',
          type: 'satReading',
          seq: 1,
          assignedKidIds: alice ? [alice.id] : [],
          words: [],
          satQuestions: [
            { id: 'usq_0', passage: 'A passage.', question: 'A question?', choices: ['A', 'B', 'C', 'D'], correctAnswer: 'A' },
          ],
        }),
      });
    });
    await page.reload();
    // The untimed quiz has lower seq so should appear first
    await page.getByRole('link', { name: /Start/ }).click();
    // Timer should NOT be visible
    await expect(page.getByTestId('sat-timer')).toBeHidden();
  });
});

// ─── Additional Coverage Tests ─────────────────────────────────────────────

test.describe('27. Bold word with multiple occurrences', () => {
  test('word appearing twice in sentence is bolded both times', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');

    // Create a quiz where the word appears twice in the sentence
    await page.goto('/admin/quizzes/new');
    await page.getByPlaceholder('e.g. Week 12 Vocabulary').fill('Double Word Quiz');
    await page.getByLabel(/Alice/).check();
    const card = page.locator('.card').filter({ hasText: 'Word #1' });
    await card.getByPlaceholder('e.g. benevolent').fill('test');
    await card.getByPlaceholder(/e\.g\. The benevolent/).fill('The test was a real test of skill.');
    for (let ci = 0; ci < 4; ci++) {
      await card.getByPlaceholder(`Choice ${ci + 1}`).fill(`choice${ci + 1}`);
    }
    await card.locator('input[name="correct_0"]').nth(0).check();
    await page.getByRole('button', { name: /Create Quiz/i }).click();

    // Take the quiz as Alice
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();

    // Both occurrences of "test" should be bolded
    const boldElements = page.locator('strong').filter({ hasText: 'test' });
    await expect(boldElements).toHaveCount(2);
  });
});

test.describe('28. Analytics excludes reading/SAT quiz results', () => {
  test('analytics page only shows vocab words, not Q1/Q2 from reading quizzes', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await clearAutoLoadedQuizzes(page);
    await addKid(page, 'Alice', 'alice123', '4th');

    // Create a vocab quiz and a reading quiz
    await createQuiz(page, 'Vocab Quiz', ['Alice'], SAMPLE_WORDS);
    await createReadingQuiz(page, 'Reading Quiz', ['Alice'], SAMPLE_PASSAGE, SAMPLE_QUESTIONS);

    // Alice takes both quizzes
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');

    // Take vocab quiz
    await page.locator('.card').filter({ hasText: 'Vocab Quiz' }).getByRole('link', { name: /Start/ }).click();
    const q1 = page.locator('.card').filter({ hasText: 'benevolent' });
    await q1.getByRole('button', { name: 'kind' }).click();
    const q2 = page.locator('.card').filter({ hasText: 'ephemeral' });
    await q2.getByRole('button', { name: 'short-lived' }).click();
    const q3 = page.locator('.card').filter({ hasText: 'gregarious' });
    await q3.getByRole('button', { name: 'sociable' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();
    await page.getByRole('link', { name: /Back to Quizzes/i }).click();

    // Take reading quiz
    await page.getByRole('link', { name: /Start/ }).click();
    await page.locator('.sat-choice').filter({ hasText: "The sun's heat" }).click();
    await page.locator('.sat-choice').filter({ hasText: 'It condenses into droplets' }).click();
    await page.locator('.sat-choice').filter({ hasText: 'The water cycle' }).click();
    await page.getByRole('button', { name: /Submit Quiz/i }).click();

    // Log in as admin and check analytics
    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsProvider(page);
    await page.getByRole('link', { name: 'Analytics' }).click();

    // Vocab words should be visible
    await expect(page.getByRole('cell', { name: 'benevolent' })).toBeVisible();
    // Q1/Q2/Q3 from reading quiz should NOT be visible
    await expect(page.getByRole('cell', { name: 'q1' })).toBeHidden();
    await expect(page.getByRole('cell', { name: 'q2' })).toBeHidden();
    // Quiz filter dropdown should show "All Vocab Quizzes" as default option
    await expect(page.getByLabel('Filter by Quiz')).toContainText('All Vocab Quizzes');
  });
});

test.describe('29. alwaysShowSentence defaults to true', () => {
  test('quiz without alwaysShowSentence shows sentences immediately', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await setupProvider(page);
    await addKid(page, 'Alice', 'alice123', '4th');

    // Create a quiz via API without alwaysShowSentence field
    await page.evaluate(async () => {
      const res = await fetch('/api/data');
      const data = await res.json();
      const alice = data.kids.find((k: any) => k.name === 'Alice');
      await fetch('/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'no_hint_quiz',
          title: 'Default Sentence Quiz',
          seq: 1,
          assignedKidIds: alice ? [alice.id] : [],
          words: [
            { id: 'w0', word: 'vivid', sentence: 'The vivid colors were amazing.', choices: ['bright', 'dull', 'cold', 'fast'], correctAnswer: 'bright' }
          ],
        }),
      });
    });

    await page.getByRole('button', { name: 'Logout' }).click();
    await loginAsKid(page, 'Alice', 'alice123');
    await page.getByRole('link', { name: /Start/ }).click();

    // Sentence should be visible immediately (no hint button)
    await expect(page.getByText('vivid colors')).toBeVisible();
    await expect(page.getByRole('button', { name: /Show word in a sentence/ })).toBeHidden();
  });
});
