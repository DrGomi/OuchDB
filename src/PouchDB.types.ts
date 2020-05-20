// import { WebSQLResultSet, WebSQLTransaction, ResultSetRow } from './WebSQLite.types';

export interface PouchDBMinimalDoc {
    _id: string;
    // _rev: string;
    [key: string]: any;
}

export interface PouchDBDoc extends PouchDBMinimalDoc {
    _id: string;
    _rev: string;
    [key: string]: any;
}

export interface PouchDBRow {
    deleted: number;
    doc_id: string;
    json: string;
    rev: string;
    seq?: number;
}

export interface CouchFullDocsRow extends AllDocsRow {
    id: string;
    key: string;
    value: AllDocsRev;
    doc: PouchDBDoc;
}

export interface CouchAllFullDocsResponse extends AllDocsRow{
    total_rows: number;
    offset: number;
    rows: CouchFullDocsRow[];
}

export interface PouchDocMap {
    [key: string]: PouchDBDoc;
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
    doc: PouchDBRow;
}

export interface AllDocsResponse {
    total_rows?: number;
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

// export interface TurtleDocMap {
//     [key: string]: TurtleDoc;
// }

// export interface TurtleDoc extends FullCouchDoc {
//     name: string;
//     weapon: string;
//     bandana: string;
//     _id: string;
//     _rev: string;
// }

// export interface TurtleFullDocsRow extends AllDocsRow{
//     id: string;
//     key: string;
//     value: AllDocsRev;
//     doc: TurtleDoc;
// }

// export interface TurtleAllFullDocsResponse extends AllDocsRow{
//     total_rows: number;
//     offset: number;
//     rows: TurtleFullDocsRow[];
// }

export type couchResponse = ResultSetRow | AllFullDocsRow |
AllDocsResponse | AllFullDocsResponse // | TurtleAllFullDocsResponse;

export interface HTTPClient {
    get: (url: string) => Promise<any>;
}

export type DocSyncState = 'delete' | 'update' | 'add';

export interface DocSyncAction {
    state: DocSyncState;
    id: string;
    doc?: PouchDBDoc;
}

export type actionDone = 'success' | 'error'

export interface DocSyncTransaction {
    id: string;
    state: DocSyncState;
    done: actionDone;
}


type TextEncoding = 'UTF-8';
type DBAdapter = 'websql' | 'sqlite' | 'sqlite3'

export interface InfoObject {
    doc_count: number;
    update_seq: number;
    websql_encoding: TextEncoding;
    db_name: string;
    auto_compaction: Boolean;
    adapter: DBAdapter;
  }

  export interface DocCount {
      docCount: number;
  }

  export interface AllDocsOptions {
    include_docs?: Boolean;
    startkey?: string;
    endkey?: string;
    key?: string;
    keys?: string[];
  }