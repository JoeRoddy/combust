import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "react-native-elements";

import nav from "../../helpers/NavigatorHelper";
import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";
import { colors, viewStyles } from "../../assets/styles/AppStyles";
import Header from "../reusable/Header";
import Form from "../reusable/Form";

const fields = { name: "string", age: "string", photo: "image" };

const CreateItem = () => {
  const handleSubmit = formData => {
    itemStore.createItem(formData);
    nav.goBack();
  };

  return (
    <View>
      <Header title="Create Item" />
      <View style={viewStyles.padding}>
        <Form
          fields={fields}
          onSubmit={handleSubmit}
          onCancel={nav.goBack}
          title="Create Item"
          submitText="Save Item"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({});

export default CreateItem;
