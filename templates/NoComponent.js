import React from "react";
import { observer } from "mobx-react";
import { StyleSheet, Text, View } from "react-native";

import nav from "../../helpers/NavigatorHelper";
import { viewStyles, textStyles } from "../../assets/styles/AppStyles";
import Header from "../reusable/Header";

@observer
export default class Item extends React.Component {
  state = {};

  render() {
    return (
      <View>
        <Header title="Item" />
        <View style={viewStyles.padding}>
          <Text>
            Looks like the<Text style={textStyles.code}> item </Text>
            module doesn't have mobile views. The database and store should
            still work great!
          </Text>
          <Text style={{ paddingTop: 20 }}>
            Open up
            <Text style={textStyles.code}> src/components/item/Item.js </Text>
            to start creating your own views!
          </Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({});
