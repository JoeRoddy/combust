import React, { Component } from "react";
import { observer } from "mobx-react";

const fields = {};

@observer
export default class UpdateItem extends Component {
  state = {};

  updateItem = item => {
    fields &&
      Object.keys(fields).forEach(field => {
        if (this.state[field] || this.state[field] === "") {
          const val = this.state[field] || null;
          item[field] = val;
        }
      });
    item.save();
    this.props.toggleEdit();
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
    const { item } = this.props;

    return (
      <div className="CreateItem uk-flex uk-flex-center uk-padding">
        <form className="uk-width-large">
          <legend className="uk-legend">Update Item</legend>
          {fields &&
            Object.keys(fields).map(field => {
              return this.renderInputForField(field, item);
            })}
          <button
            className="uk-button uk-button-default"
            onClick={e => this.updateItem(item)}
          >
            Save Item
          </button>
        </form>
      </div>
    );
  }
}
