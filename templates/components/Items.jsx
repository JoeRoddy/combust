import { Link } from "react-router-dom";
import React, { Component } from "react";
import { observer } from "mobx-react";

import itemStore from "../../stores/ItemStore";
import usersStore from "../../stores/UsersStore";
import "./styles/Items.css";

@observer
export default class Items extends Component {
  render() {
    const userId = this.props.match.params.userId;
    const user = usersStore.getUserById(userId);
    let items = itemStore.getItemsByUserId(userId);

    return (
      <div className="Items uk-padding">
        {userId === usersStore.userId && (
          <Link to="/createItem">
            <button className="uk-button uk-button-default">
              Create New Item
            </button>
          </Link>
        )}
        <div className="uk-margin-small">
          {" "}
          items {user && <span>belonging to {user.displayName}</span>}:{" "}
        </div>
        {items &&
          Object.keys(items).map(itemId => {
            return (
              <Link key={itemId} to={"/item/" + itemId}>
                <div>{items[itemId] && <span>{itemId}</span>}</div>
              </Link>
            );
          })}
      </div>
    );
  }
}
