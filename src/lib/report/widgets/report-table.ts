import { ReportWidget } from './report-widget';

export type TableRow = object;

export class ReportTable extends ReportWidget {
  private rows: Record<string, TableRow> = {};
  private counter = 0;
  private MAX_ROWS = 300;

  constructor(private readonly title: string) {
    super();
  }

  setMaxRows(maxRows: number) {
    this.MAX_ROWS = maxRows;
  }

  private getIdFromRow(row: TableRow, idField = 'id'): string | number {
    row[idField] = row[idField] !== undefined ? row[idField] : this.counter;
    return row[idField];
  }

  insert(row: TableRow, idField = 'id'): boolean {
    let id = this.getIdFromRow(row, idField);

    if (!this.rows[idField] === undefined && this.rows[id] === undefined) {
      return false;
    }

    this.rows[id] = { ...row };
    this.counter++;
    return true;
  }

  clear() {
    this.rows = {};
    this.counter = 0;

    return true;
  }
  update(row: TableRow, idField = 'id'): boolean {
    let id = this.getIdFromRow(row, idField);

    if (this.rows[idField] === undefined) {
      return false;
    }

    this.rows[id] = { ...this.rows[id], ...row };
    return true;
  }

  upsert(row: TableRow, idField = 'id') {
    if (!row[idField] || !this.rows[idField]) {
      return this.insert(row, idField);
    } else {
      return this.update(row, idField);
    }
  }

  insertRecords(rows: TableRow[], idField = 'id') {
    for (let i = 0; i < rows.length; i++) {
      this.insert(rows[i], idField);
    }
  }

  updateRecords(rows: TableRow[], idField = 'id') {
    for (let i = 0; i < rows.length; i++) {
      this.update(rows[i], idField);
    }
  }

  upsertRecords(rows: TableRow[], idField = 'id') {
    for (let i = 0; i < rows.length; i++) {
      this.upsert(rows[i], idField);
    }
  }

  prepareDataToReport = (): TableDataReportBlock => {
    return {
      type: 'table',
      name: this.title,
      isVisible: this.isVisible,
      data: Object.values(this.rows).slice(-this.MAX_ROWS),
    };
  };
}
