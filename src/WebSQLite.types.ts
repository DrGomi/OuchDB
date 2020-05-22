import { DocSyncTransaction, PouchDBRow } from './PouchDB.types';

interface DatabaseInfo {
    _db: {

        open: Boolean;
        filename: string;
        mode: number;
    }
}

export interface WebSQLDatabase {
    version: string;
    _db: DatabaseInfo;
    exec(queries: Query[], readOnly: boolean, callback: WebSQLiteCallback): void;

    transaction(
        callback: SQLTransactionCallback,
        errorCallback?: SQLTransactionErrorCallback,
        successCallback?: SQLVoidCallback
      ): void;
    
      readTransaction(
        callback: SQLTransactionCallback,
        errorCallback?: SQLTransactionErrorCallback,
        successCallback?: SQLVoidCallback
      ): void;
  }
  
  export type Query = { sql: string; args: unknown[] };

  export interface SQLVoidCallback {
    (): void;
  }
  
  export interface SQLTransactionCallback {
    (transaction: WebSQLTransaction): void;
  }
  
  export interface SQLTransactionErrorCallback {
    (error: SQLError): void;
  }
  
  export interface WebSQLTransaction {
    executeSql(
      sqlStatement: string,
      args?: any[],
      callback?: WebSQLStatementCallback,
      errorCallback?: SQLStatementErrorCallback
    ): void;
  }
  
  export interface WebSQLStatementCallback {
    (transaction: WebSQLTransaction, resultSet: WebSQLResultSet): void;
  }
  
  export interface SQLStatementErrorCallback {
    (transaction: WebSQLTransaction, error: SQLError): void;
  }
  

  export declare class SQLError {
    static UNKNOWN_ERR: number;
    static DATABASE_ERR: number;
    static VERSION_ERR: number;
    static TOO_LARGE_ERR: number;
    static QUOTA_ERR: number;
    static SYNTAX_ERR: number;
    static CONSTRAINT_ERR: number;
    static TIMEOUT_ERR: number;
  
    code: number;
    message: string;
  }

  
  export interface ResultSetError {
    error: Error;
  }
  
  export interface WebSQLResultSet {
    insertId?: number;
    rowsAffected: number;
    rows: WebSQLRows;
  }
  
  export interface WebSQLRows {
    _array: PouchDBRow[];
    length: number;
  }
  
  export interface ResultSetRow {
      [column: string]: ResultSetValue;
  }

  export type ResultSetValue = string | number;

  
  export type WebSQLiteCallback = (
    error?: Error | null,
    resultSet?: (ResultSetError | WebSQLResultSet)[]
  ) => void;
  
  
  type ResultOrError = WebSQLResultSet|SQLError;
  
  export type TxCallback = [WebSQLTransaction, ResultOrError];
  export type TxSuccessCallback = [WebSQLTransaction, WebSQLResultSet];
  export type TxErrorCallback = [WebSQLTransaction, SQLError];

export type TxSyncActionSuccess = [WebSQLTransaction, DocSyncTransaction];