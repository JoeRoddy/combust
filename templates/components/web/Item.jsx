import { Link } from "react-router-dom";
import React, { Component } from "react";
import { observer } from "mobx-react";

import itemStore from "../../stores/itemStore";
import userStore from "../../stores/userStore";
import UpdateItem from "./UpdateItem";

const fields = {};

@observer
class Item extends Component {
  state = {
    isUnderEdit: false
  };

  toggleEdit = () => {
    this.setState({ isUnderEdit: !this.state.isUnderEdit });
  };

  render() {
    const itemId = this.props.match.params.itemId;
    const item = itemStore.getItemById(itemId);
    if (!item) {
      return <span />;
    }
    const userOwnedItem = item && item.createdBy === userStore.userId;

    return (
      <div className="Item uk-flex uk-flex-center uk-padding">
        {!this.state.isUnderEdit ? (
          <div>
            <RenderItem item={item} />
            {userOwnedItem && (
              <ItemOptions item={item} toggleEdit={this.toggleEdit} />
            )}
          </div>
        ) : (
          <UpdateItem item={item} toggleEdit={this.toggleEdit} />
        )}
      </div>
    );
  }
}

export default Item;

const RenderItem = ({ item }) => {
  return (
    <div className="Item-details uk-margin-bottom">
      <h4 className="uk-heading-divider">
        <b>Item:</b>
        {" " + item.id}
      </h4>
      <div>
        <b>Created on:</b>
        {" " + new Date(item.createdAt).toString()}
      </div>
      {fields &&
        Object.keys(fields).map((field, i) => {
          return (
            <div key={i}>
              <b>{field}:</b>
              {" " + item[field]}
              {fields[field] === "image" && (
                <span>
                  <br />
                  <img className="uk-width-1-3" src={item[field]} alt="" />
                </span>
              )}
            </div>
          );
        })}
    </div>
  );
};

const ItemOptions = ({ item, toggleEdit }) => {
  return (
    <div>
      <button
        className="uk-button uk-button-default uk-margin-small-right"
        onClick={toggleEdit}
      >
        Update Item
      </button>
      <Link to={"/itemsByUser/" + item.createdBy}>
        <button
          onClick={e => item.delete()}
          className="uk-button uk-button-danger"
        >
          Delete Item
        </button>
      </Link>
    </div>
  );
};
