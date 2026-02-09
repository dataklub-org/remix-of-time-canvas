import React, { useMemo, useRef, useState } from "react";
import { SafeAreaView, View, ScrollView, Dimensions } from "react-native";

import { TopHeader } from "../components/header/TopHeader";
import { TimelineType } from "../components/header/TimelineTabs";

import { TimelineScroller } from "../components/timeline/TimelineScroller";
import { TimeAxis } from "../components/timeline/TimeAxis";
import { NowMarker } from "../components/timeline/NowMarker";

import { BottomControls } from "../controls/BottomControls";
import { FloatingActions } from "../controls/FloatingActions";
import { FeedbackButton } from "../controls/FeedbackButton";

import { AddMomentSheet } from "../components/modals/AddMomentSheet";
import { DatePickerModal } from "../components/modals/DatePickerModal";

import { colors } from "../theme/colors";
import { buildHours, clamp, nowHourFloat, zoomLabel } from "../utils/time";

const HOURS_START = 3;
const HOURS_END = 17;
const PX_PER_HOUR_DEFAULT = 160;

export default function TimelineScreen() {
  const [timeline, setTimeline] = useState<TimelineType>("mylife");
  const [isSignedIn, setIsSignedIn] = useState(false);

  const [selectedDate, setSelectedDate] = useState(new Date());

  // Zoom
  const [pxPerHour, setPxPerHour] = useState(PX_PER_HOUR_DEFAULT);

  // Modals
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showAddMoment, setShowAddMoment] = useState(false);
  const [momentText, setMomentText] = useState("");

  // Scroll
  const scrollRef = useRef<ScrollView>(null);
  const screenW = Dimensions.get("window").width;

  const hours = useMemo(() => buildHours(HOURS_START, HOURS_END), []);
  const contentWidth = useMemo(() => {
    return (HOURS_END - HOURS_START) * pxPerHour + screenW;
  }, [pxPerHour, screenW]);

  const nowX = useMemo(() => {
    const h = nowHourFloat(new Date());
    return (h - HOURS_START) * pxPerHour;
  }, [pxPerHour]);

  const onJumpToNow = () => {
    const x = clamp(nowX - screenW / 2, 0, contentWidth);
    scrollRef.current?.scrollTo({ x, animated: true });
  };

  const onZoomIn = () => setPxPerHour((v) => clamp(v + 30, 90, 280));
  const onZoomOut = () => setPxPerHour((v) => clamp(v - 30, 90, 280));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <TopHeader
        timeline={timeline}
        onTimelineChange={setTimeline}
        isSignedIn={isSignedIn}
        onPressAuth={() => setIsSignedIn((s) => !s)}
      />

      {/* Timeline area */}
      <View style={{ flex: 1 }}>
        <TimelineScroller scrollRef={scrollRef} contentWidth={contentWidth}>
          <View style={{ height: "100%", justifyContent: "center" }}>
            <TimeAxis
              hours={hours}
              hoursStart={HOURS_START}
              pxPerHour={pxPerHour}
              screenWidth={screenW}
              selectedDate={selectedDate}
            />
            <NowMarker x={nowX} />
          </View>
        </TimelineScroller>
      </View>

      <BottomControls
        onZoomOut={onZoomOut}
        onZoomIn={onZoomIn}
        zoomLabel={zoomLabel(pxPerHour)}
        onJumpToNow={onJumpToNow}
      />

      <FloatingActions
        onJumpToDate={() => setShowDatePicker(true)}
        onAddMoment={() => setShowAddMoment(true)}
      />

      <FeedbackButton onPress={() => { /* later: open feedback modal */ }} />

      <DatePickerModal
        visible={showDatePicker}
        value={selectedDate}
        onChange={setSelectedDate}
        onClose={() => setShowDatePicker(false)}
      />

      <AddMomentSheet
        visible={showAddMoment}
        value={momentText}
        onChange={setMomentText}
        onClose={() => setShowAddMoment(false)}
        onSave={() => {
          // For Step 1: just close (later you'll save to Supabase)
          setShowAddMoment(false);
          setMomentText("");
        }}
      />
    </SafeAreaView>
  );
}
