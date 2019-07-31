import firebase from "firebase/app";
import "firebase/database";

class ItemDb {
  createItem(item, userId) {
    let defaultFields = {};
    item.createdAt = new Date().getTime();
    item.createdBy = userId;
    item = Object.assign(defaultFields, item);
    let db = firebase.database();
    let itemRef = db.ref("items/itemObjects").push();
    let itemId = itemRef.key;
    itemRef.set(item);
    db.ref(`items/itemIdsByUser/${userId}/${itemId}`).set(true);
  }

  updateItem(itemId, newData) {
    if (!itemId || !newData) {
      return;
    }
    delete newData.id;
    firebase
      .database()
      .ref("items/itemObjects")
      .child(itemId)
      .update(newData);
  }

  deleteItem(itemId, userId) {
    let db = firebase.database();
    let idRef = db
      .ref("items/itemIdsByUser")
      .child(userId)
      .child(itemId);
    let itemRef = db.ref("items/itemObjects").child(itemId);
    idRef.set(null);
    itemRef.set(null);
  }

  listenToItemsByUser(userId, callback) {
    _listenToItemIdsByUser(userId, (err, itemId) => {
      if (err) return callback(err);
      this.listenToItem(itemId, callback);
    });
  }

  loadItemsOnceByUser(userId, callback) {
    _loadItemIdsByUser(userId, (err, itemId) => {
      if (err) return callback(err);
      _loadItemOnce(itemId, callback);
    });
  }

  listenToItem(itemId, callback) {
    firebase
      .database()
      .ref("items/itemObjects")
      .child(itemId)
      .on("value", snapshot => {
        let item = snapshot.val();
        if (!item) {
          return callback("no userdata found for item w/id: " + itemId);
        }
        item.id = itemId;
        callback(null, item);
      });
  }
}

const _loadItemIdsByUser = function(userId, callback) {
  firebase
    .database()
    .ref("items/itemIdsByUser")
    .child(userId)
    .once("child_added")
    .then(snap => {
      callback(null, snap.key);
    });
};

const _loadItemOnce = function(itemId, callback) {
  firebase
    .database()
    .ref("items/itemObjects")
    .child(itemId)
    .once("value")
    .then(snapshot => {
      let item = snapshot.val();
      if (!item) {
        return callback("no userdata found for item w/id: " + itemId);
      }
      item.id = itemId;
      callback(null, item);
    });
};

const _listenToItemIdsByUser = function(userId, callback) {
  firebase
    .database()
    .ref("items/itemIdsByUser")
    .child(userId)
    .on("child_added", snap => {
      callback(null, snap.key);
    });
};

const itemDb = new ItemDb();

export default itemDb;
