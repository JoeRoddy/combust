import { Link } from "react-router-dom";
import React, { Component } from "react";
import { observer } from "mobx-react";

import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";
import "./styles/Items.scss";

@observer
export default class Items extends Component {
  render() {
    const userId = this.props.match.params.userId;
    const user = userStore.getUserById(userId);
    let items = itemStore.getItemsByUserId(userId);

    return (
      <div className="Items uk-flex uk-flex-center uk-padding">
        <div className="uk-margin">
          {userId === userStore.userId && (
            <Link to="/createItem">
              <button className="uk-button uk-button-default">
                Create New Item
              </button>
            </Link>
          )}
          <h4>
            {" "}
            items {user && <span>belonging to {user.displayName}</span>}:{" "}
          </h4>
          <ul className="uk-list uk-list-divider">
            {items &&
              Object.keys(items)
                .reverse()
                .map(itemId => {
                  return (
                    <li key={itemId}>
                      <Link key={itemId} to={"/item/" + itemId}>
                        <div>{items[itemId] && <span>{itemId}</span>}</div>
                      </Link>
                    </li>
                  );
                })}
          </ul>
        </div>
      </div>
    );
  }
}
