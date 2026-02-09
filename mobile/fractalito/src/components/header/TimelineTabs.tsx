import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export type TimelineType = "mylife" | "ourlife" | "babylife";

export function TimelineTabs(props: {
  value: TimelineType;
  onChange: (v: TimelineType) => void;
}) {
  const items: { key: TimelineType; label: string }[] = [
    { key: "mylife", label: "MyLife" },
    { key: "ourlife", label: "OurLife" },
    { key: "babylife", label: "BabyLife" },
  ];

  return (
    <View style={styles.segmented}>
      {items.map((it) => {
        const active = props.value === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => props.onChange(it.key)}
            style={[styles.item, active && styles.itemActive]}
          >
            <Text style={[styles.text, active && styles.textActive]}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.pillBg,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  item: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  itemActive: {
    backgroundColor: colors.primary,
  },
  text: {
    fontWeight: "600",
    color: "#4A4A4A",
  },
  textActive: {
    color: colors.primaryText,
  },
});
