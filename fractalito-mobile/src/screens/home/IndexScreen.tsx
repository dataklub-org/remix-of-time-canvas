import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { format, isWeekend, startOfMonth, eachDayOfInterval, startOfDay, endOfDay, isSunday, isThursday, isSaturday, startOfYear } from 'date-fns';
import { timeToX, getTickInterval, getTimeUnit, ZOOM_LEVELS, getZoomLevelIndex, MIN_MS_PER_PIXEL, MAX_MS_PER_PIXEL, clampZoom } from '../../utils/timeUtils';
import { formatTickLabel } from '../../utils/formatUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IndexScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const [centerTime, setCenterTime] = useState(() => Date.now());
  const [msPerPixel, setMsPerPixel] = useState(() => ZOOM_LEVELS[3].msPerPixel);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartMsPerPixel = useRef(msPerPixel);

  const unitLabels: Record<string, string> = {
    '5min': '5m',
    '10min': '10m',
    '30min': '30m',
    'hour': '1h',
    '6hour': '6h',
    'day': '1d',
    'week': '1w',
    'month': '1mo',
    'year': '1y',
  };

  const zoomIndex = getZoomLevelIndex(msPerPixel);
  const zoomLabel = unitLabels[ZOOM_LEVELS[zoomIndex].unit];

  const getDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleZoomIn = () => {
    if (zoomIndex > 0) {
      setMsPerPixel(ZOOM_LEVELS[zoomIndex - 1].msPerPixel);
    }
  };

  const handleZoomOut = () => {
    if (zoomIndex < ZOOM_LEVELS.length - 1) {
      setMsPerPixel(ZOOM_LEVELS[zoomIndex + 1].msPerPixel);
    }
  };

  const handleJumpToNow = () => {
    setCenterTime(Date.now());
  };

  const MIN_TICK_SPACING = 50;
  const timeUnit = getTimeUnit(msPerPixel);
  const isSubDayLevel = ['5min', '10min', '30min', 'hour', '6hour'].includes(timeUnit);
  const isDayLevel = timeUnit === 'day';
  const isWeekLevel = timeUnit === 'week';
  const isMonthLevel = timeUnit === 'month';
  const isYearLevel = timeUnit === 'year';
  const isWeekOrHigher = ['week', 'month', 'year'].includes(timeUnit);

  const visibleTimeRange = viewportWidth * msPerPixel;
  const startTime = centerTime - visibleTimeRange / 2;
  const endTime = centerTime + visibleTimeRange / 2;

  const ticks = (() => {
    interface TickInfo {
      timestamp: number;
      label: string;
      priority: number;
      isMonth?: boolean;
      isSunday?: boolean;
      isSaturday?: boolean;
      isYear?: boolean;
    }

    const allTicks: TickInfo[] = [];

    if (isWeekOrHigher) {
      let yearDate = startOfYear(new Date(startTime));
      while (yearDate.getTime() <= endTime) {
        if (yearDate.getTime() >= startTime - visibleTimeRange * 0.1) {
          allTicks.push({
            timestamp: yearDate.getTime(),
            label: format(yearDate, 'yyyy'),
            priority: 4,
            isYear: true,
          });
        }
        yearDate = new Date(yearDate.getFullYear() + 1, 0, 1);
      }
    }

    if (isYearLevel) {
      let currentDate = startOfMonth(new Date(startTime));
      while (currentDate.getTime() <= endTime) {
        const monthStart = startOfMonth(currentDate);
        if (monthStart.getTime() >= startTime - visibleTimeRange * 0.1) {
          allTicks.push({
            timestamp: monthStart.getTime(),
            label: format(monthStart, 'MMM'),
            priority: 3,
            isMonth: true,
          });

          const tenth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 10);
          if (tenth.getTime() >= startTime && tenth.getTime() <= endTime) {
            allTicks.push({
              timestamp: tenth.getTime(),
              label: `10${getOrdinalSuffix(10)}`,
              priority: 1,
            });
          }

          const twentieth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 20);
          if (twentieth.getTime() >= startTime && twentieth.getTime() <= endTime) {
            allTicks.push({
              timestamp: twentieth.getTime(),
              label: `20${getOrdinalSuffix(20)}`,
              priority: 1,
            });
          }
        }
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }
    } else if (isMonthLevel) {
      let currentDate = startOfMonth(new Date(startTime));
      while (currentDate.getTime() <= endTime) {
        const monthStart = startOfMonth(currentDate);
        if (monthStart.getTime() >= startTime - visibleTimeRange * 0.1) {
          allTicks.push({
            timestamp: monthStart.getTime(),
            label: format(monthStart, 'MMM'),
            priority: 3,
            isMonth: true,
          });
        }
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }

      const days = eachDayOfInterval({ start: new Date(startTime), end: new Date(endTime) });
      days.filter(day => isSunday(day)).forEach(day => {
        const dayNum = day.getDate();
        allTicks.push({
          timestamp: startOfDay(day).getTime(),
          label: `Sun ${dayNum}${getOrdinalSuffix(dayNum)}`,
          priority: 2,
          isSunday: true,
        });
      });
    } else if (isWeekLevel) {
      let currentDate = startOfMonth(new Date(startTime));
      while (currentDate.getTime() <= endTime) {
        const monthStart = startOfMonth(currentDate);
        if (monthStart.getTime() >= startTime - visibleTimeRange * 0.1) {
          allTicks.push({
            timestamp: monthStart.getTime(),
            label: format(monthStart, 'MMM'),
            priority: 3,
            isMonth: true,
          });
        }
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }

      const days = eachDayOfInterval({ start: new Date(startTime), end: new Date(endTime) });
      days.forEach(day => {
        const isSun = isSunday(day);
        const isThurs = isThursday(day);
        if (isSun || isThurs) {
          const dayNum = day.getDate();
          allTicks.push({
            timestamp: startOfDay(day).getTime(),
            label: isSun ? `Sun ${dayNum}${getOrdinalSuffix(dayNum)}` : `Thu ${dayNum}${getOrdinalSuffix(dayNum)}`,
            priority: isSun ? 2 : 1,
            isSunday: isSun,
          });
        }
      });
    } else if (isDayLevel) {
      const interval = getTickInterval(msPerPixel);
      const firstTick = Math.ceil(startTime / interval) * interval;
      for (let t = firstTick; t <= endTime; t += interval) {
        const date = new Date(t);
        const isSat = isSaturday(date);
        const isSun = isSunday(date);
        allTicks.push({
          timestamp: t,
          label: formatTickLabel(t, msPerPixel),
          priority: 1,
          isSaturday: isSat,
          isSunday: isSun,
        });
      }
    } else {
      const interval = getTickInterval(msPerPixel);
      const firstTick = Math.ceil(startTime / interval) * interval;
      for (let t = firstTick; t <= endTime; t += interval) {
        allTicks.push({
          timestamp: t,
          label: formatTickLabel(t, msPerPixel),
          priority: 1,
        });
      }
    }

    allTicks.sort((a, b) => a.timestamp - b.timestamp);

    const filtered: TickInfo[] = [];
    for (const tick of allTicks) {
      const x = timeToX(tick.timestamp, centerTime, msPerPixel, viewportWidth);
      let overlaps = false;
      let overlapIndex = -1;
      for (let i = 0; i < filtered.length; i++) {
        const existingX = timeToX(filtered[i].timestamp, centerTime, msPerPixel, viewportWidth);
        if (Math.abs(x - existingX) < MIN_TICK_SPACING) {
          overlaps = true;
          overlapIndex = i;
          break;
        }
      }
      if (!overlaps) {
        filtered.push(tick);
      } else if (overlapIndex >= 0 && tick.priority > filtered[overlapIndex].priority) {
        filtered[overlapIndex] = tick;
      }
    }

    return filtered;
  })();

  const weekendHighlights = (() => {
    if (!isWeekOrHigher) return [];
    const days = eachDayOfInterval({ start: new Date(startTime), end: new Date(endTime) });
    return days.filter(day => isWeekend(day)).map(day => ({
      start: startOfDay(day).getTime(),
      end: endOfDay(day).getTime(),
    }));
  })();

  const nowX = timeToX(Date.now(), centerTime, msPerPixel, viewportWidth);
  const nowVisible = nowX >= 0 && nowX <= viewportWidth;
  const centerDate = new Date(centerTime);
  const dateLabel = format(centerDate, 'EEEE, MMM d, yyyy');

  function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>fractalito</Text>
        <TouchableOpacity style={styles.signInButton} onPress={() => navigation.navigate('Profile')}>
          <Text style={styles.signInText}>{profile?.username || user?.email || 'Profile'}</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tabActive}>
          <Text style={styles.tabTextActive}>MyLife</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>OurLife</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>BabyLife</Text>
        </TouchableOpacity>
      </View>

      {/* Timeline Canvas */}
      <View style={styles.canvasContainer}>
        <View style={styles.timelineWrapper}>
          {/* Timeline with hours */}
          <View
            style={styles.timeline}
            onStartShouldSetResponder={(e) => e.nativeEvent.touches.length >= 2}
            onMoveShouldSetResponder={(e) => e.nativeEvent.touches.length >= 2}
            onResponderGrant={(e) => {
              if (e.nativeEvent.touches.length >= 2) {
                pinchStartDistance.current = getDistance(e.nativeEvent.touches);
                pinchStartMsPerPixel.current = msPerPixel;
              }
            }}
            onResponderMove={(e) => {
              if (e.nativeEvent.touches.length >= 2 && pinchStartDistance.current) {
                const nextDistance = getDistance(e.nativeEvent.touches);
                if (nextDistance > 0) {
                  const scale = nextDistance / pinchStartDistance.current;
                  const nextMsPerPixel = Math.min(
                    MAX_MS_PER_PIXEL,
                    Math.max(MIN_MS_PER_PIXEL, pinchStartMsPerPixel.current / scale)
                  );
                  setMsPerPixel(nextMsPerPixel);
                }
              }
            }}
            onResponderRelease={() => {
              pinchStartDistance.current = null;
              setMsPerPixel((value) => clampZoom(value));
            }}
          >
            <View style={styles.axisLine} />

            {weekendHighlights.map((weekend) => {
              const startX = timeToX(weekend.start, centerTime, msPerPixel, viewportWidth);
              const endX = timeToX(weekend.end, centerTime, msPerPixel, viewportWidth);
              const rectWidth = endX - startX;
              return (
                <View
                  key={weekend.start}
                  style={[
                    styles.weekendHighlight,
                    { left: startX, width: rectWidth },
                  ]}
                />
              );
            })}

            {ticks.map((tick) => {
              const x = timeToX(tick.timestamp, centerTime, msPerPixel, viewportWidth);
              const isWeekendDay = tick.isSunday || tick.isSaturday;
              const isItalic = isDayLevel && (tick.isSaturday || tick.isSunday);
              const fontWeight = tick.isYear || tick.isMonth ? '700' : '500';
              const baseColor = tick.isYear ? '#3a4555' : (tick.isMonth ? '#5a6577' : '#7a8494');

              return (
                <View key={tick.timestamp} style={[styles.tickGroup, { left: x }]}>
                  <View
                    style={[
                      styles.tickLine,
                      {
                        backgroundColor: tick.isYear ? '#3a4555' : (isWeekendDay ? '#E0D7D3' : '#b0b8c4'),
                        height: tick.isYear || tick.isMonth ? 16 : 12,
                        width: tick.isYear || tick.isMonth ? 2 : 1,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.tickLabel,
                      {
                        color: baseColor,
                        fontStyle: isItalic ? 'italic' : 'normal',
                        fontWeight,
                      },
                    ]}
                  >
                    {tick.label}
                  </Text>
                </View>
              );
            })}

            {isSubDayLevel && (
              <Text style={styles.dateLabel}>{dateLabel}</Text>
            )}

            {isWeekOrHigher && (
              <Text style={styles.yearLabel}>{format(centerDate, 'yyyy')}</Text>
            )}

            {nowVisible && (
              <View style={[styles.nowMarker, { left: nowX }]}>
                <Text style={styles.nowText}>Now</Text>
                <View style={styles.nowLine} />
              </View>
            )}
          </View>

          {/* Info text below timeline (show only before sign in) */}
          {!user?.id && (
            <View style={styles.infoBox}>
              <Text style={styles.title}>A visual memory plane</Text>
              <Text style={styles.subtitle}>Time flows horizontally, moments live in space</Text>
              <Text style={styles.description}>
                Capture thoughts, experiences, and ideas as points on a timeline—
                organized by categories, enhanced by meaning and proximity
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Floating actions + bottom control bar */}
      <View style={[styles.bottomDock, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.floatingRow}>
          <TouchableOpacity style={styles.feedbackPill}>
            <Text style={styles.feedbackIcon}>💬</Text>
            <Text style={styles.feedbackText}>Feedback</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.circleButton}>
              <Text style={styles.circleButtonText}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleButton}>
              <Text style={styles.circleButtonText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.circleButton, styles.circleButtonDark]}>
              <Text style={[styles.circleButtonText, styles.circleButtonTextDark]}>+M</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.controlBar}>
          <View style={styles.zoomSegment}>
            <TouchableOpacity style={styles.zoomIconButton} onPress={handleZoomOut}>
              <Text style={styles.zoomIconText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{zoomLabel}</Text>
            <TouchableOpacity style={styles.zoomIconButton} onPress={handleZoomIn}>
              <Text style={styles.zoomIconText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.segmentDivider} />
          <TouchableOpacity style={styles.jumpSegment} onPress={handleJumpToNow}>
            <Text style={styles.jumpSegmentText}>Jump to Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  logo: {
    fontSize: 20,
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  signInButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  signInText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tabActive: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#000',
  },
  tabText: {
    fontSize: 14,
    color: '#666',
  },
  tabTextActive: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  timelineWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  timeline: {
    height: 120,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  axisLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 60,
    height: 1,
    backgroundColor: '#b0b8c4',
  },
  weekendHighlight: {
    position: 'absolute',
    top: 20,
    height: 80,
    backgroundColor: 'rgba(224, 215, 211, 0.3)',
    borderRadius: 4,
  },
  tickGroup: {
    position: 'absolute',
    top: 0,
    alignItems: 'center',
    width: 70,
    marginLeft: -35,
  },
  tickLine: {
    marginTop: 54,
  },
  tickLabel: {
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
  },
  nowMarker: {
    position: 'absolute',
    top: 22,
    alignItems: 'center',
  },
  nowText: {
    fontSize: 12,
    color: '#4a7dff',
    fontWeight: '600',
    marginBottom: 4,
  },
  nowLine: {
    width: 2,
    height: 40,
    backgroundColor: '#4a7dff',
  },
  dateLabel: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: '#5a6577',
  },
  yearLabel: {
    position: 'absolute',
    top: 92,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 12,
    color: '#5a6577',
  },
  infoBox: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  description: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
  },
  floatingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  controlBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  zoomSegment: {
    flex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    height: 34,
  },
  zoomIconButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomIconText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },
  zoomLabel: {
    fontSize: 11,
    color: '#444',
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#e0e0e0',
  },
  jumpSegment: {
    flex: 6,
    backgroundColor: '#111',
    height: 34,
    marginLeft: 8,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  jumpSegmentText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  rightActions: {
    gap: 12,
    alignItems: 'flex-end',
  },
  circleButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  circleButtonDark: {
    backgroundColor: '#111',
  },
  circleButtonText: {
    fontSize: 18,
  },
  circleButtonTextDark: {
    color: '#fff',
    fontWeight: '700',
  },
  feedbackPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18a64a',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  feedbackIcon: {
    fontSize: 16,
    color: '#fff',
  },
  feedbackText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
