import { SQLTransaction, SQLResultSet, SQLError } from './SQLite.types';

export interface PouchDBRow{
    deleted: number;
    doc_id: string;
    json: string;
    rev: string;
    seq: number;
}