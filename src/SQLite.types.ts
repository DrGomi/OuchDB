// Definitions by: TeamworkGuy2 <https://github.com/TeamworkGuy2>

export interface Window extends WindowDatabase { }

// util interfaces
export interface DOMString extends String { }


//[Supplemental, NoInterfaceObject]
export interface WindowDatabase {
    openDatabase(name: DOMString, version: DOMString, displayName: DOMString, estimatedSize: number,
        creationCallback?: DatabaseCallback): Database;
}

export interface DatabaseCallback {
  (database: Database): void;
}

export interface Database {
  version: string;

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

export interface SQLVoidCallback {
  (): void;
}

export interface SQLTransactionCallback {
  (transaction: SQLTransaction): void;
}

export interface SQLTransactionErrorCallback {
  (error: SQLError): void;
}

export interface SQLTransaction {
  executeSql(
    sqlStatement: string,
    args?: any[],
    callback?: SQLStatementCallback,
    errorCallback?: SQLStatementErrorCallback
  ): void;
}

export interface SQLStatementCallback {
  (transaction: SQLTransaction, resultSet: SQLResultSet): void;
}

export interface SQLStatementErrorCallback {
  (transaction: SQLTransaction, error: SQLError): void;
}

export interface SQLResultSet {
  insertId: number;
  rowsAffected: number;
  rows: SQLResultSetRowList;
}

export interface SQLResultSetRowList {
  length: number;
  item(index: number): any;
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