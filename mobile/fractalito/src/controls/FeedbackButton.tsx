import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function FeedbackButton(props: { onPress?: () => void }) {
  return (
    <View style={styles.wrap}>
      <Pressable style={styles.btn} onPress={props.onPress}>
        <Text style={styles.text}>Feedback</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 14, bottom: 96 },
  btn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.success,
  },
  text: { color: colors.primaryText, fontWeight: "800" },
});
