function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;

  for (var i = 0, arr2 = new Array(len); i < len; i++) {
    arr2[i] = arr[i];
  }

  return arr2;
}

var arrayLikeToArray = _arrayLikeToArray;

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return arrayLikeToArray(arr);
}

var arrayWithoutHoles = _arrayWithoutHoles;

function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
}

var iterableToArray = _iterableToArray;

function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return arrayLikeToArray(o, minLen);
}

var unsupportedIterableToArray = _unsupportedIterableToArray;

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}

var nonIterableSpread = _nonIterableSpread;

function _toConsumableArray(arr) {
  return arrayWithoutHoles(arr) || iterableToArray(arr) || unsupportedIterableToArray(arr) || nonIterableSpread();
}

var toConsumableArray = _toConsumableArray;

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

var classCallCheck = _classCallCheck;

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

var defineProperty = _defineProperty;

// from : https://github.com/expo/expo/tree/master/packages/expo-sqlite/src
// import { Window, Database } from './WebSQL.types';
var OuchDB = function OuchDB(dbName) {
  var _this = this;

  classCallCheck(this, OuchDB);

  defineProperty(this, "db", void 0);

  defineProperty(this, "getAllRows", function (tx, table) {
    return new Promise(function (resolve, reject) {
      return tx.executeSql("SELECT * FROM \"".concat(table, "\""), [], function (tx, res) {
        return resolve([tx, res]);
      }, function (tx, err) {
        return reject([tx, err]);
      });
    });
  });

  defineProperty(this, "mapDocRows", function (res) {
    return Object.keys(res.rows).map(function (_) {
      return res.rows[_];
    });
  });

  defineProperty(this, "getRevInt", function (inRev) {
    return parseInt(inRev.split('-')[0]);
  });

  defineProperty(this, "compareDocs", function (leftDoc, rightDoc) {
    return leftDoc.doc_id !== rightDoc.doc_id ? true : leftDoc == rightDoc || _this.getRevInt(leftDoc.rev) > _this.getRevInt(rightDoc.rev);
  });

  defineProperty(this, "filterOldRevs", function (origSeq) {
    return origSeq.reduce(function (acc, iter) {
      return [].concat(toConsumableArray(acc), [iter]).filter(function (x) {
        return _this.compareDocs(x, iter);
      });
    }, []);
  });

  defineProperty(this, "deleteRev", function (tx, doc) {
    return new Promise(function (resolve, reject) {
      return tx.executeSql("DELETE FROM \"by-sequence\" WHERE doc_id = \"".concat(doc.doc_id, "\" AND rev = \"").concat(doc.rev, "\""), [], function () {
        return resolve();
      }, function (err) {
        return reject(err);
      });
    });
  });

  defineProperty(this, "deleteDiff", function (tx, origSeq, filterSeq) {
    return origSeq.filter(function (x) {
      return !filterSeq.includes(x);
    }).forEach(function (x) {
      return _this.deleteRev(tx, x);
    });
  });

  defineProperty(this, "getTables", function (tx) {
    return new Promise(function (resolve, reject) {
      return tx.executeSql('SELECT tbl_name from sqlite_master WHERE type = "table"', [], function (tx, res) {
        return resolve([tx, res]);
      }, function (tx, err) {
        return reject([tx, err]);
      });
    });
  });

  defineProperty(this, "drobTable", function (tx, tableName) {
    return new Promise(function (resolve, reject) {
      return tx.executeSql("DROP TABLE \"".concat(tableName, "\""), [], function (tx, res) {
        console.log("DROOOOP'D ".concat(tableName));
        resolve([tx, res]);
      }, function (tx, err) {
        console.log("NOOOOO ".concat(tableName), err);
        reject([tx, err]);
      });
    });
  });

  defineProperty(this, "dropAllTablesExcept", function (tx) {
    return Promise.all(['attach-store', 'local-store', 'attach-seq-store', 'document-store', 'metadata-store'].map(function (x) {
      return _this.drobTable(tx, x);
    })).then(function () {
      console.log('DROPPED IT LIKE IT\'S HOT!');
      return Promise.resolve(tx);
    });
  });

  // SOQ/12709074/how-do-you-explicitly-set-a-new-property-on-window-in-typescript
  this.db = window['openDatabase'](dbName, '1', 'foo', 2 * 1024 * 1024);
} // getDBTx = (dbName: string) => 
//     window.openDatabase(dbName, '1', 'foo', 2 * 1024 * 1024)
//         .transaction(tx => this.dbTx = tx);
;

export { OuchDB };
//# sourceMappingURL=main.esm.js.map
