import { observable, computed } from "mobx";

import itemDb from "../db/ItemDb";
import userStore from "./UserStore";

class ItemStore {
  subscribeToEvents() {
    userStore.onLogin(_loadItemsForUser);
    userStore.onLogout(_onUserLogout);
  }

  @observable items = new Map();
  @observable itemIdsByUser = new Map();

  @computed
  get itemsOfCurrentUser() {
    return this.getItemsByUserId(userStore.userId);
  }

  getItemsByUserId(userId) {
    _loadItemsForUser({ id: userId });
    let items = {};
    let itemIds = this.itemIdsByUser.get(userId);
    itemIds &&
      itemIds.forEach(itemId => {
        items[itemId] = this.getItemById(itemId);
      });
    return items;
  }

  getItemById(itemId) {
    if (!this.items.has(itemId)) {
      this.items.set(itemId, null); //avoid multiple listeners
      itemDb.listenToItem(itemId, (err, item) => {
        err ? console.log(err) : _storeItem(item);
      });
    }
    return this.items.get(itemId);
  }

  createItem(item) {
    const userId = userStore.userId;
    if (!item || !userId) {
      return;
    }
    itemDb.createItem(item, userId);
  }
}

const itemStore = new ItemStore();
export default itemStore;

const _updateItem = function() {
  let item = this;
  if (!item || !item.id) return console.error("bad data @ _updateItem()");
  const itemId = item.id;
  delete item.save;
  delete item.delete;
  delete item.id;
  itemDb.updateItem(itemId, item);
  item.save = _updateItem;
  item.delete = _deleteItem;
  item.id = itemId;
};

const _deleteItem = function() {
  const itemId = this.id;
  let usersItems = itemStore.itemIdsByUser.get(userStore.userId) || [];
  usersItems = usersItems.filter(id => id !== itemId);
  itemStore.itemIdsByUser.set(userStore.userId, usersItems);
  itemStore.items.delete(itemId);
  itemDb.deleteItem(itemId, userStore.userId);
};

const _storeItem = item => {
  const userId = item.createdBy;
  item.save = _updateItem;
  item.delete = _deleteItem;
  itemStore.items.set(item.id, item);
  let idsForUser = itemStore.itemIdsByUser.get(userId) || [];
  idsForUser.push(item.id);
  itemStore.itemIdsByUser.set(userId, idsForUser);
};

const _onUserLogout = () => {
  itemStore.itemIdsByUser.clear();
};

const _loadItemsForUser = user => {
  const userId = user.id;
  if (!userId || itemStore.itemIdsByUser.has(user.id)) {
    return;
  }
  itemStore.itemIdsByUser.set(userId, []);
  itemDb.listenToItemsByUser(user.id, (err, item) => {
    err ? console.log(err) : _storeItem(item);
  });
};
