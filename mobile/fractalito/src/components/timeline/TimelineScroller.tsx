import React from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { colors } from "../../theme/colors";

export function TimelineScroller(props: {
  scrollRef: React.RefObject<ScrollView | null>;
  contentWidth: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={props.scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ width: props.contentWidth }}
      >
        {props.children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
});
