import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";
import { TimelineType } from "./TimelineTabs";

const TIMELINE_ITEMS: { key: TimelineType; label: string }[] = [
  { key: "mylife", label: "MyLife" },
  { key: "ourlife", label: "OurLife" },
  { key: "babylife", label: "BabyLife" },
];

export function TopHeader(props: {
  timeline: TimelineType;
  onTimelineChange: (v: TimelineType) => void;
  isSignedIn: boolean;
  onPressAuth: () => void;
}) {
  const [open, setOpen] = useState(false);

  const currentLabel =
    TIMELINE_ITEMS.find((it) => it.key === props.timeline)?.label ?? "MyLife";

  return (
    <View style={styles.header}>
      <Text style={styles.logo}>fractalito</Text>

      <View style={styles.tabsWrap}>
        <Pressable
          onPress={() => setOpen((v) => !v)}
          style={styles.dropdownTrigger}
        >
          <Text style={styles.dropdownLabel}>{currentLabel}</Text>
          <Text style={styles.dropdownChevron}>▾</Text>
        </Pressable>

        {open && (
          <View style={styles.dropdownMenu}>
            {TIMELINE_ITEMS.map((it) => {
              const active = it.key === props.timeline;
              return (
                <Pressable
                  key={it.key}
                  onPress={() => {
                    props.onTimelineChange(it.key);
                    setOpen(false);
                  }}
                  style={[styles.dropdownItem, active && styles.dropdownItemActive]}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      active && styles.dropdownItemTextActive,
                    ]}
                  >
                    {it.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      <Pressable onPress={props.onPressAuth} style={styles.authBtn}>
        <Text style={styles.authText}>
          {props.isSignedIn ? "Account" : "Sign In"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 60,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.bg,
  },
  logo: { fontSize: 20, fontWeight: "800", color: colors.text },
  tabsWrap: {
    flexShrink: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.pillBg,
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  dropdownChevron: {
    marginLeft: 6,
    fontSize: 12,
    color: colors.mutedText,
  },
  dropdownMenu: {
    position: "absolute",
    top: 44,
    alignSelf: "center",
    minWidth: 140,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 10,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItemActive: {
    backgroundColor: colors.pillBg,
  },
  dropdownItemText: {
    fontSize: 14,
    color: colors.text,
  },
  dropdownItemTextActive: {
    fontWeight: "700",
  },
  authBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  authText: { color: colors.primaryText, fontWeight: "700" },
});
