"use client";

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function useAdminPagination<T extends { id: string }>(rows: T[], pageSize = 50) {
  const key = rows.map(row => row.id).join('\u0000');
  const [position, setPosition] = useState({ key, page: 1 });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = position.key === key ? Math.min(position.page, pages) : 1;
  const start = rows.length ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, rows.length);
  return { rows: rows.slice((page - 1) * pageSize, page * pageSize), page, pages, start, end, total: rows.length,
    setPage: (value: number) => setPosition({ key, page: Math.max(1, Math.min(value, pages)) }) };
}

type Props = Pick<ReturnType<typeof useAdminPagination>, 'page' | 'pages' | 'start' | 'end' | 'total' | 'setPage'>;

export function AdminPagination({ page, pages, start, end, total, setPage }: Props) {
  return <nav className="admin-pagination" aria-label="Table pagination">
    <span role="status">{start}-{end} of {total}</span>
    <div>
      <button type="button" className="admin-secondary" aria-label="Previous page" title="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /></button>
      <span>Page {page} of {pages}</span>
      <button type="button" className="admin-secondary" aria-label="Next page" title="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}><ChevronRight size={16} /></button>
    </div>
  </nav>;
}
