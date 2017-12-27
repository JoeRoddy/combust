import { Link } from "react-router-dom";
import React from "react";
import { observer } from "mobx-react";

import itemStore from "../../../stores/ItemStore";
import usersStore from "../../../stores/UsersStore";

const fields = {};

const Item = props => {
  const itemId = props.match.params.itemId;
  let item = itemStore.getItemById(itemId);
  let userOwnedItem = item && item.createdBy === usersStore.userId;
  return (
    <div className="Item uk-padding">
      {item && (
        <div className="Item-details">
          <div>itemId:{" " + itemId}</div>
          <div>createdAt: {" " + new Date(item.createdAt).toString()}</div>
          {fields &&
            Object.keys(fields).map(field => {
              return (
                <div key={field}>
                  {field}:{" " + item[field]}
                </div>
              );
            })}
        </div>
      )}
      {userOwnedItem && (
        <div>
          <Link to={"/updateItem/" + itemId}>
            <button className="uk-button uk-button-default uk-margin-small">
              Update Item
            </button>
          </Link>
          <br />
          <Link to={"/itemsByUser/" + item.createdBy}>
            <button
              onClick={e => itemStore.deleteItem(itemId)}
              className="uk-button uk-button-danger"
            >
              Delete Item
            </button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default observer(Item);
