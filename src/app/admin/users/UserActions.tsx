// src/app/admin/users/UserActions.tsx
// Acțiuni admin pe un user — schimbare rol + ștergere.
//
// Protecții self-lockout aici la nivel de UI (butoane disabled), DAR
// adevărata apărare e pe server (în API). UI-ul e doar pentru UX.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Role = 'USER' | 'AUTHOR' | 'ADMIN';

export default function UserActions({
  userId,
  currentRole,
  isSelf,
}: {
  userId: string;
  currentRole: Role;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function changeRole(newRole: Role) {
    if (newRole === currentRole) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Schimbare rol eșuată');
      } else {
        router.refresh();
      }
    } catch {
      alert('Eroare de rețea');
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser() {
    if (!window.confirm('Ștergi acest cont? Toate articolele, comentariile și fișierele asociate vor fi șterse — IREVERSIBIL.')) {
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Ștergere eșuată');
      } else {
        router.refresh();
      }
    } catch {
      alert('Eroare de rețea');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {/* Schimbare rol — disabled pentru selfto previne self-lockout din UI;
          server-ul aplică aceeași regulă oricum. */}
      <select
        defaultValue={currentRole}
        disabled={isSelf || loading}
        onChange={(e) => changeRole(e.target.value as Role)}
        className="bg-carbon-800 border border-carbon-700 px-2 py-1 font-mono text-xs disabled:opacity-50"
      >
        <option value="USER">USER</option>
        <option value="AUTHOR">AUTHOR</option>
        <option value="ADMIN">ADMIN</option>
      </select>

      <button
        type="button"
        onClick={deleteUser}
        disabled={isSelf || loading}
        className="text-red-400 hover:text-red-300 font-mono text-xs disabled:opacity-30"
        title={isSelf ? 'Nu te poți șterge singur' : 'Șterge cont'}
      >
        🗑
      </button>
    </div>
  );
}
