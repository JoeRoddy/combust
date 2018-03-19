import React from "react";

import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";
import Form from "../reusable/Form";

const fields = {};

const CreateItem = ({ history }) => {
  const handleSubmit = formData => {
    itemStore.createItem(formData);
    history.push("/itemsByUser/" + userStore.userId);
  };

  return (
    <div className="CreateItem uk-flex uk-flex-center uk-padding">
      <Form
        onSubmit={handleSubmit}
        fields={fields}
        title="Create Item"
        submitText="Save Item"
      />
    </div>
  );
};

export default CreateItem;
