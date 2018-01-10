import React, { Component } from "react";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";

import itemStore from "../../stores/ItemStore";

const fields = {};

@observer
export default class UpdateItem extends Component {
  state = {};

  updateItem = item => {
    let submitObject = {};
    fields &&
      Object.keys(fields).forEach(field => {
        if (this.state[field] || this.state[field] === "") {
          const val = this.state[field] || null;
          submitObject[field] = val;
        }
      });
    submitObject.id = this.props.match.params.itemId;
    itemStore.updateItem(submitObject);
  };

  handleChange = (e, field) => {
    const t = e.target.value;
    const val = fields[field] !== "number" || t === "" ? t : parseInt(t, 0);

    this.setState({ [field]: val });
  };

  renderInputForField = (field, item) => {
    const type = fields[field];

    return (
      <div className="uk-margin" key={field}>
        {type === "text" ? (
          <textarea
            className="uk-textarea uk-form-width-large"
            onChange={e => {
              this.handleChange(e, field);
            }}
            value={
              this.state[field] != null
                ? this.state[field]
                : item && item[field]
            }
            placeholder={field}
          />
        ) : (
          <input
            className="uk-input uk-form-width-large"
            type={type === "string" ? "text" : "number"}
            onChange={e => {
              this.handleChange(e, field);
            }}
            value={
              this.state[field] != null
                ? this.state[field]
                : item && item[field]
            }
            placeholder={field}
          />
        )}
      </div>
    );
  };

  render() {
    const itemId = this.props.match.params.itemId;
    let item = itemStore.getItemById(itemId);
    return (
      <div className="CreateItem uk-flex uk-flex-center uk-padding">
        <form className="uk-width-large">
          <legend className="uk-legend">Update Item</legend>
          {fields &&
            Object.keys(fields).map(field => {
              return this.renderInputForField(field, item);
            })}
          <Link key={itemId} to={"/item/" + itemId}>
            <button
              className="uk-button uk-button-default"
              onClick={this.updateItem}
            >
              Save Item
            </button>
          </Link>
        </form>
      </div>
    );
  }
}
