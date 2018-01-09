import { observable, computed } from "mobx";

import itemService from "../service/ItemService";
import usersStore from "./UsersStore";

class ItemStore {
  subscribeToEvents() {
    //must be inline functions, or use .bind(this)
    usersStore.onLogin(this.loadItemsForUser.bind(this));
    usersStore.onLogout(this.onUserLogout.bind(this));
  }

  @observable itemMap = new Map();
  @observable itemIdsByUserMap = new Map();

  loadItemsForUser(user) {
    const userId = user.id;
    if (!userId || this.itemIdsByUserMap.has(user.id)) {
      return;
    }
    this.itemIdsByUserMap.set(userId, []);
    itemService.listenToItemsByUser(user.id, (err, item) => {
      err ? console.log(err) : this.storeItem(item, userId);
    });
  }

  storeItem(item, userId) {
    this.itemMap.set(item.id, item);
    let idsForUser = this.itemIdsByUserMap.get(userId) || [];
    idsForUser.push(item.id);
    this.itemIdsByUserMap.set(userId, idsForUser);
  }

  @computed
  get itemsOfClientUser() {
    return this.getItemsByUserId(usersStore.userId);
  }

  getItemsByUserId(userId) {
    this.loadItemsForUser({ id: userId });
    let items = {};
    let itemIds = this.itemIdsByUserMap.get(userId);
    itemIds &&
      itemIds.forEach(itemId => {
        items[itemId] = this.getItemById(itemId);
      });
    return items;
  }

  getItemById(itemId) {
    if (!this.itemMap.has(itemId)) {
      this.itemMap.set(itemId, null); //avoid multiple listeners
      itemService.listenToItem(itemId, (err, item) => {
        err ? console.log(err) : this.itemMap.set(itemId, item);
      });
    }
    return this.itemMap.get(itemId);
  }

  createItem(item) {
    const userId = usersStore.userId;
    if (!item || !userId) {
      return;
    }

    itemService.createItem(item, userId);
  }

  deleteItem(itemId) {
    let usersItems = this.itemIdsByUserMap.get(usersStore.userId) || [];
    usersItems = usersItems.filter(id => id !== itemId);
    this.itemIdsByUserMap.set(usersStore.userId, usersItems);
    this.itemMap.delete(itemId);
    itemService.deleteItem(itemId, usersStore.userId);
  }

  updateItem(item) {
    if (!item) return;
    const itemId = item.id;
    delete item.id;
    itemService.updateItem(itemId, item);
  }

  onUserLogout() {
    this.itemIdsByUserMap.clear();
  }
}

const itemStore = new ItemStore();
export default itemStore;
