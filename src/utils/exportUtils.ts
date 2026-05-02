/**
 * Utilidades para exportar datos a CSV
 */

import Papa from 'papaparse';

export interface ExportOptions {
  filename: string;
  headers: string[];
  data: any[];
}

/**
 * Exporta datos a CSV y descarga el archivo
 */
export const exportToCSV = (options: ExportOptions) => {
  const { filename, headers, data } = options;

  const csv = Papa.unparse({
    fields: headers,
    data: data.map((row) => {
      const newRow: any = {};
      headers.forEach((header) => {
        newRow[header] = row[header] || '';
      });
      return newRow;
    }),
  });

  // Agregar BOM para UTF-8 (Excel reconoce tildes correctamente)
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Exporta tabla HTML a CSV (alternativa simple)
 */
export const downloadTableAsCSV = (tableId: string, filename: string) => {
  const table = document.getElementById(tableId);
  if (!table) return;

  let csv: string[] = [];
  const rows = table.querySelectorAll('tr');

  rows.forEach((row) => {
    const cols = row.querySelectorAll('td, th');
    let rowData: string[] = [];
    cols.forEach((col) => {
      rowData.push('"' + col.textContent?.trim().replace(/"/g, '""') + '"');
    });
    csv.push(rowData.join(','));
  });

  const csvContent = 'data:text/csv;charset=utf-8,' + csv.join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
};
