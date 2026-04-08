const toCsvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  const stringValue =
    typeof value === "string" ? value : JSON.stringify(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
};

export const rowsToCsv = (
  rows: Array<Record<string, unknown>>,
  columns?: string[]
): string => {
  if (rows.length === 0) {
    const header = columns && columns.length > 0 ? columns.join(",") : "";
    return `${header}\n`;
  }

  const resolvedColumns =
    columns && columns.length > 0 ? columns : Object.keys(rows[0]);
  const headerLine = resolvedColumns.map((column) => toCsvCell(column)).join(",");
  const valueLines = rows.map((row) =>
    resolvedColumns.map((column) => toCsvCell(row[column])).join(",")
  );

  return [headerLine, ...valueLines].join("\n");
};

export const downloadTextFile = (
  fileName: string,
  content: string,
  mimeType: string
): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadJson = (fileName: string, data: unknown): void => {
  downloadTextFile(fileName, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
};

export const downloadCsv = (
  fileName: string,
  rows: Array<Record<string, unknown>>,
  columns?: string[]
): void => {
  const csv = rowsToCsv(rows, columns);
  downloadTextFile(fileName, csv, "text/csv;charset=utf-8");
};
