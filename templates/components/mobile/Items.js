import React from "react";
import { observer } from "mobx-react";
import { StyleSheet, View, ScrollView } from "react-native";
import { List, ListItem, Button } from "react-native-elements";

import nav from "../../helpers/NavigatorHelper";
import itemStore from "../../stores/ItemStore";
import { colors } from "../../assets/styles/AppStyles";
import Header from "../reusable/Header";

export default (Items = observer(() => {
  const routeInfo = nav.getCurrentRoute();
  const userId = routeInfo && routeInfo.params && routeInfo.params.userId;
  const items = itemStore.getItemsByUserId(userId);

  return (
    <View style={{ flex: 1 }}>
      <Header title="Items" />
      <View style={styles.screenContent}>
        <View style={styles.listContainer}>
          <ScrollView>
            <List containerStyle={{ marginTop: 0 }}>
              {items &&
                Object.keys(items)
                  .reverse()
                  .map((itemId, i) => (
                    <ListItem
                      key={i}
                      title={itemId}
                      onPress={() => nav.navigate("Item", { id: itemId })}
                    />
                  ))}
            </List>
          </ScrollView>
        </View>
        <View style={styles.bottomBtnContainer}>
          <Button
            backgroundColor={colors.success}
            title="New Item"
            onPress={() => nav.navigate("CreateItem")}
          />
        </View>
      </View>
    </View>
  );
}));

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    paddingTop: 0
  },
  listContainer: {
    flex: 8
  },
  bottomBtnContainer: {
    flex: 1,
    justifyContent: "center"
  }
});
