import React from "react";
import { observer } from "mobx-react";
import { StyleSheet, Text, View, Image } from "react-native";
import { Button } from "react-native-elements";

import nav from "../../helpers/NavigatorHelper";
import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";
import { colors, viewStyles } from "../../assets/styles/AppStyles";
import Header from "../reusable/Header";
import UpdateItem from "./UpdateItem";

const fields = {};

@observer
export default class Item extends React.Component {
  state = {
    isUnderEdit: false
  };

  toggleEdit = () => {
    this.setState({ isUnderEdit: !this.state.isUnderEdit });
  };

  render() {
    const routeInfo = nav.getCurrentRoute();
    const itemId = routeInfo && routeInfo.params && routeInfo.params.id;
    const item = itemStore.getItemById(itemId);
    if (!item) {
      return <View />;
    }
    const userOwnedItem = item && item.createdBy === userStore.userId;

    return (
      <View>
        <Header title="Item" />
        <View style={viewStyles.padding}>
          {!this.state.isUnderEdit ? (
            <View>
              <RenderItem item={item} />
              {userOwnedItem && (
                <ItemOptions item={item} toggleEdit={this.toggleEdit} />
              )}
            </View>
          ) : (
            <UpdateItem item={item} toggleEdit={this.toggleEdit} />
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  bold: {
    fontWeight: "bold"
  }
});

const RenderItem = ({ item }) => {
  return (
    <View>
      <Text>
        <Text style={styles.bold}>Item:</Text>
        {" " + item.id}
      </Text>
      <Text>
        <Text style={styles.bold}>Created on:</Text>
        {" " + new Date(item.createdAt).toString()}
      </Text>
      {fields &&
        Object.keys(fields).map((field, i) => {
          return (
            <View key={i}>
              <Text>
                <Text style={styles.bold}>{field}:</Text>
                {" " + item[field]}
                {fields[field] === "image" && (
                  <Image source={{ uri: item[field] }} />
                )}
              </Text>
            </View>
          );
        })}
    </View>
  );
};

const ItemOptions = ({ item, toggleEdit }) => {
  return (
    <View>
      <Button
        onPress={toggleEdit}
        backgroundColor={colors.success}
        containerViewStyle={{ marginBottom: 10, marginTop: 10 }}
        title="Update Item"
      />
      <Button
        backgroundColor={colors.warning}
        onPress={e => {
          item.delete();
          nav.goBack();
        }}
        title="Delete Item"
      />
    </View>
  );
};
