import { useState } from 'react';
import { useAppData } from '../../hooks/useAppData';
import type { Kid } from '../../types';

export default function KidsManagePage() {
  const { kids, addKid, updateKid, deleteKid, isNameTaken } = useAppData();
  const [editing, setEditing] = useState<Kid | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Kids</h1>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowForm(true); }}>
          + Add Kid
        </button>
      </div>

      {kids.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--color-text-light)', fontSize: '1.125rem' }}>No kids yet. Add your first kid profile to get started!</p>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {kids.map(kid => (
          <div key={kid.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '1.125rem' }}>{kid.name}</div>
              <div style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>
                Grade: {kid.grade} &middot; Login URL: /quiz
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(kid); setShowForm(true); }}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={() => {
                if (confirm(`Delete ${kid.name}? This will also remove their quiz assignments and results.`)) {
                  deleteKid(kid.id);
                }
              }}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <KidFormModal
          kid={editing}
          isNameTaken={isNameTaken}
          onSave={(data) => {
            if (editing) {
              updateKid(editing.id, data);
            } else {
              addKid(data);
            }
            setShowForm(false);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function KidFormModal({ kid, isNameTaken, onSave, onClose }: {
  kid: Kid | null;
  isNameTaken: (name: string, excludeId?: string) => boolean;
  onSave: (data: { name: string; password: string; grade: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(kid?.name ?? '');
  const [password, setPassword] = useState(kid?.password ?? '');
  const [grade, setGrade] = useState(kid?.grade ?? '');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    if (isNameTaken(name.trim(), kid?.id)) { setError('That name is already used by another kid'); return; }
    if (!password) { setError('Password is required'); return; }
    if (!grade.trim()) { setError('Grade is required'); return; }
    onSave({ name: name.trim(), password, grade: grade.trim() });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h3 className="modal-title">{kid ? 'Edit Kid' : 'Add Kid'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="label" htmlFor="kid-name">Name (used as username)</label>
            <input id="kid-name" className="input" value={name} onChange={e => { setName(e.target.value); setError(''); }} autoFocus />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="label" htmlFor="kid-password">Password</label>
              <input id="kid-password" className="input" type="text" value={password} onChange={e => { setPassword(e.target.value); setError(''); }} />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="kid-grade">Grade</label>
              <input id="kid-grade" className="input" value={grade} onChange={e => { setGrade(e.target.value); setError(''); }} placeholder="e.g. 4th" />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{kid ? 'Save' : 'Add Kid'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
