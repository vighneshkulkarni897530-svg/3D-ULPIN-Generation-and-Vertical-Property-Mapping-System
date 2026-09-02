/**
 * Export and Print Utilities (Phase 9)
 * ====================================
 * Client-side utilities for downloading tabular CSV data and triggering
 * print/save-as-PDF with disclaimer headers and clean formatting.
 */

export function exportToCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]): void {
  if (typeof window === 'undefined') return;

  const escapeCell = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];

  const csvContent = lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function triggerPrintReport(): void {
  if (typeof window !== 'undefined') {
    window.print();
  }
}
