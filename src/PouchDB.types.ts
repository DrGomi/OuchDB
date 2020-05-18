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
    value: AllDocsRev;
}

export interface AllFullDocsRow extends AllDocsRow{
    id: string;
    key: string;
    value: AllDocsRev;
    doc: ResultSetRow;
}

export interface AllDocsResponse {
    total_rows: number;
    offset: number;
    rows: AllDocsRow[];
}

export interface FullCouchDoc {
    _id: string;
    _rev: string;
}

export interface AllFullDocsResponse extends AllDocsRow{
    total_rows: number;
    offset: number;
    rows: AllFullDocsRow[];
}

export interface TurtleDocMap {
    [key: string]: TurtleDoc;
}

export interface TurtleDoc extends FullCouchDoc {
    name: string;
    weapon: string;
    bandana: string;
    _id: string;
    _rev: string;
}

export interface TurtleFullDocsRow extends AllDocsRow{
    id: string;
    key: string;
    value: AllDocsRev;
    doc: TurtleDoc;
}

export interface TurtleAllFullDocsResponse extends AllDocsRow{
    total_rows: number;
    offset: number;
    rows: TurtleFullDocsRow[];
}

export type couchResponse = ResultSetRow | AllFullDocsRow | TurtleDoc |
AllDocsResponse | AllFullDocsResponse | TurtleAllFullDocsResponse;

export interface HTTPClient {
    get: (url: string) => Promise<any>;
}

export type DocSyncState = 'delete' | 'update' | 'add';

export interface DocSyncAction {
    state: DocSyncState;
    id: string;
    doc?: TurtleDoc;
}

export type actionDone = 'success' | 'error'

export interface DocSyncTransaction {
    id: string;
    state: DocSyncState;
    done: actionDone;
}

export type TxSyncActionSuccess = [SQLTransaction, DocSyncTransaction];