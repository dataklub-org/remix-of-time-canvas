import React from "react";
import { Modal, View, Text, Pressable, StyleSheet, Platform } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors } from "../../theme/colors";

export function DatePickerModal(props: {
  visible: boolean;
  value: Date;
  onChange: (d: Date) => void;
  onClose: () => void;
}) {
  // Android often shows a native picker without needing a custom modal UX
  if (Platform.OS === "android" && props.visible) {
    return (
      <DateTimePicker
        value={props.value}
        mode="date"
        onChange={(_: unknown, date?: Date) => {
          props.onClose();
          if (date) props.onChange(date);
        }}
      />
    );
  }

  // iOS: show inside our modal
  return (
    <Modal transparent animationType="fade" visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Pick a date</Text>

          <DateTimePicker
            value={props.value}
            mode="date"
            onChange={(_: unknown, date?: Date) => {
              if (date) props.onChange(date);
            }}
          />

          <Pressable onPress={props.onClose} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "center",
    padding: 18,
  },
  card: {
    backgroundColor: colors.bg,
    padding: 16,
    borderRadius: 16,
  },
  title: { fontSize: 16, fontWeight: "900", marginBottom: 12, color: colors.text },
  primaryBtn: {
    marginTop: 12,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  primaryText: { color: colors.primaryText, fontWeight: "900" },
});
