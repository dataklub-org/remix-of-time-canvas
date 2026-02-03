import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function FloatingActions(props: {
  onJumpToDate: () => void;
  onAddMoment: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable onPress={props.onJumpToDate} style={styles.lightBtn}>
        <Text style={styles.lightText}>Jump to Date</Text>
      </Pressable>

      <Pressable onPress={props.onAddMoment} style={styles.darkBtn}>
        <Text style={styles.darkText}>+ Add Moment</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 14,
    bottom: 96,
    gap: 10,
    alignItems: "flex-end",
  },
  lightBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  lightText: { fontWeight: "700", color: colors.text },
  darkBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  darkText: { color: colors.primaryText, fontWeight: "800" },
});
