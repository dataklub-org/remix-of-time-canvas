import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { colors } from "../../theme/colors";

export function AddMomentSheet(props: {
  visible: boolean;
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <Modal transparent animationType="slide" visible={props.visible} onRequestClose={props.onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add Moment</Text>

          <TextInput
            value={props.value}
            onChangeText={props.onChange}
            placeholder="Describe your moment…"
            placeholderTextColor="#8A8A8A"
            style={styles.input}
          />

          <View style={styles.row}>
            <Pressable onPress={props.onClose} style={[styles.btn, styles.ghostBtn]}>
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>

            <Pressable onPress={props.onSave} style={[styles.btn, styles.primaryBtn]}>
              <Text style={styles.primaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.bg,
    padding: 16,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
  },
  title: { fontSize: 18, fontWeight: "900", marginBottom: 12, color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 14,
    color: colors.text,
    backgroundColor: colors.bg,
  },
  row: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
  btn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
  ghostBtn: { backgroundColor: colors.pillBg },
  primaryBtn: { backgroundColor: colors.primary },
  ghostText: { fontWeight: "800", color: colors.text },
  primaryText: { color: colors.primaryText, fontWeight: "900" },
});
