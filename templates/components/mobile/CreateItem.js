import React from "react";
import { StyleSheet } from "react-native";

import nav from "../../helpers/NavigatorHelper";
import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";
import { Form, Screen } from "../reusable";

const fields = {};

const CreateItem = props => {
  const handleSubmit = formData => {
    itemStore.createItem(formData);
    nav.goBack();
  };

  return (
    <Screen title="Create Item">
      <Form
        fields={fields}
        onSubmit={handleSubmit}
        onCancel={nav.goBack}
        title="Create Item"
        submitText="Save Item"
      />
    </Screen>
  );
};

const styles = StyleSheet.create({});

export default CreateItem;
