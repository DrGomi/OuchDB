import { SQLTransaction, SQLResultSet, SQLError, ResultSetRow } from './SQLite.types';

export interface PouchDBRow extends ResultSetRow {
    deleted: number;
    doc_id: string;
    json: string;
    rev: string;
    seq: number;
}