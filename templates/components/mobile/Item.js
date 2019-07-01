import React from "react";
import { observer } from "mobx-react";
import { StyleSheet, Text, View, Image } from "react-native";

import nav from "../../helpers/NavigatorHelper";
import itemStore from "../../stores/ItemStore";
import userStore from "../../stores/UserStore";
import { Button, Screen } from "../reusable";
import UpdateItem from "./UpdateItem";

const fields = {};

@observer
class Item extends React.Component {
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
      <Screen title="Item">
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
      </Screen>
    );
  }
}

export default Item;

const styles = StyleSheet.create({
  bold: {
    fontWeight: "bold"
  },
  image: {
    height: 80,
    width: 80,
    marginTop: 20,
    marginBottom: 20
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
                {fields[field] === "image" ? (
                  <Image source={{ uri: item[field] }} style={styles.image} />
                ) : typeof item[field] == "boolean" ? (
                  item[field].toString()
                ) : (
                  item[field]
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
        title="Update Item"
        secondary
        onPress={toggleEdit}
        containerViewStyle={{ marginBottom: 10, marginTop: 10 }}
      />
      <Button
        danger
        onPress={e => {
          item.delete();
          nav.goBack();
        }}
        title="Delete Item"
      />
    </View>
  );
};
