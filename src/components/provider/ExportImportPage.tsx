import { useRef, useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import { normalizeQuiz } from '../../utils/quizLoader';
import type { ExportData, Quiz } from '../../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalizeQuizzes(raw: any[]): Quiz[] {
  return raw.map((q, qi) => normalizeQuiz(q, qi + 1));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function ExportImportPage() {
  const { data, persistImport } = useAppData();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState('');

  const handleExport = () => {
    const exportData: ExportData = {
      exportedAt: new Date().toISOString(),
      version: 1,
      kids: data.kids,
      quizzes: data.quizzes,
      results: data.results,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vocab-quiz-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(reader.result as string);

        // Normalize: accept a bare quiz, array of quizzes, or full export
        let imported: ExportData;
        if (raw.version && Array.isArray(raw.quizzes)) {
          // Full export format
          imported = raw as ExportData;
        } else if (Array.isArray(raw)) {
          // Array of quizzes
          imported = { exportedAt: new Date().toISOString(), version: 1, kids: [], quizzes: normalizeQuizzes(raw), results: [] };
        } else if ((raw.words && Array.isArray(raw.words)) || (raw.passage && raw.questions) || raw.satQuestions) {
          // Single quiz object
          imported = { exportedAt: new Date().toISOString(), version: 1, kids: [], quizzes: normalizeQuizzes([raw]), results: [] };
        } else {
          setImportStatus('Invalid file format. Expected a quiz, array of quizzes, or a full export.');
          return;
        }

        // Server handles merge and kid name resolution
        persistImport({
          kids: imported.kids,
          quizzes: imported.quizzes,
          results: imported.results,
        });

        setImportStatus(`Imported ${imported.kids.length} kids, ${imported.quizzes.length} quizzes, ${imported.results.length} results.`);
      } catch {
        setImportStatus('Failed to parse file. Make sure it\'s a valid JSON export.');
      }
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div>
      <h1 className="page-title">Export & Import</h1>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Export Data</h2>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Download all kids, quizzes, and results as a JSON file. Use this for backups or transferring data.
        </p>
        <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Current data: {data.kids.length} kids, {data.quizzes.length} quizzes, {data.results.length} results
        </div>
        <button className="btn btn-primary" onClick={handleExport}>Download Export</button>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '0.5rem' }}>Import Data</h2>
        <p style={{ color: 'var(--color-text-light)', fontSize: '0.875rem', marginBottom: '1rem' }}>
          Upload a previously exported JSON file. Existing data with the same IDs will be updated; new data will be added.
        </p>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="input" style={{ padding: '0.5rem' }} />
        {importStatus && <p style={{ marginTop: '0.75rem', fontWeight: 600, color: importStatus.startsWith('Failed') || importStatus.startsWith('Invalid') ? 'var(--color-error)' : 'var(--color-success)' }}>{importStatus}</p>}
      </div>
    </div>
  );
}
