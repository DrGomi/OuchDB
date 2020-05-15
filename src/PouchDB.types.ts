import { SQLTransaction, SQLResultSet, SQLError, ResultSetRow } from './SQLite.types';

export interface PouchDBRow extends ResultSetRow {
    deleted: number;
    doc_id: string;
    json: string;
    rev: string;
    seq: number;
}

interface AllDocsRev {
    rev: string;
}

export interface AllDocsRow {
    id: string;
    key: string;
    value: AllDocsRev
}

export interface AllDocsResponse {
    total_rows: number;
    offset: number;
    rows: AllDocsRow[];
}