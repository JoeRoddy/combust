import React, { Component } from "react";
import { observer } from "mobx-react";
import { Link } from "react-router-dom";

import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";

const fields = {};

@observer
export default class CreateItem extends Component {
  state = {};

  submit = e => {
    let submitObject = {};
    fields &&
      Object.keys(fields).forEach(field => {
        const val = this.state[field];
        if (val) {
          submitObject[field] = this.state[field];
        }
      });
    itemStore.createItem(submitObject);
  };

  handleChange = (e, field) => {
    const t = e.target.value;
    const val = fields[field] !== "number" || t === "" ? t : parseInt(t, 0);

    this.setState({ [field]: val });
  };

  renderInputForField = field => {
    const type = fields[field];

    return (
      <div className="uk-margin" key={field}>
        {type === "text" ? (
          <textarea
            className="uk-textarea uk-form-width-large"
            onChange={e => {
              this.handleChange(e, field);
            }}
            value={this.state[field] != null ? this.state[field] : ""}
            placeholder={field}
          />
        ) : (
          <input
            className="uk-input uk-form-width-large"
            type={type === "string" ? "text" : "number"}
            onChange={e => {
              this.handleChange(e, field);
            }}
            value={this.state[field] != null ? this.state[field] : ""}
            placeholder={field}
          />
        )}
      </div>
    );
  };

  render() {
    return (
      <div className="CreateItem uk-flex uk-flex-center uk-padding">
        <form className="uk-width-large">
          <legend className="uk-legend">Create Item</legend>
          {fields &&
            Object.keys(fields).map(field => {
              return this.renderInputForField(field);
            })}
          <Link to={"/itemsByUser/" + userStore.userId}>
            <button
              className="uk-button uk-button-default"
              onClick={this.submit}
            >
              Save Item
            </button>
          </Link>
        </form>
      </div>
    );
  }
}
