import React from "react";

import Form from "../reusable/Form";

const fields = {};

const UpdateItem = ({ item, toggleEdit }) => {
  const handleSubmit = formData => {
    fields &&
      Object.keys(fields).forEach(field => {
        const val = formData[field];
        if (val !== null && typeof val !== "undefined") {
          const val = formData[field] || null;
          item[field] = val;
        }
      });
    item.save();
    toggleEdit();
  };

  return (
    <div className="UpdateItem">
      <Form
        fields={fields}
        defaultValues={item}
        onSubmit={handleSubmit}
        onCancel={toggleEdit}
        title="Update Item"
        submitText="Save Item"
      />
    </div>
  );
};

export default UpdateItem;
