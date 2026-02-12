import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IndexScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [zoom, setZoom] = useState(1);
  const pinchStartDistance = useRef<number | null>(null);
  const pinchStartZoom = useRef(1);

  const clampZoom = (value: number) => Math.min(4, Math.max(0.5, value));
  const zoomLabel =
    zoom <= 0.75 ? '1w' : zoom <= 1.1 ? '1d' : zoom <= 1.8 ? '12h' : zoom <= 2.6 ? '6h' : '1h';

  const getDistance = (touches: any[]) => {
    if (touches.length < 2) return 0;
    const [a, b] = touches;
    const dx = a.pageX - b.pageX;
    const dy = a.pageY - b.pageY;
    return Math.sqrt(dx * dx + dy * dy);
  };

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
                pinchStartZoom.current = zoom;
              }
            }}
            onResponderMove={(e) => {
              if (e.nativeEvent.touches.length >= 2 && pinchStartDistance.current) {
                const nextDistance = getDistance(e.nativeEvent.touches);
                if (nextDistance > 0) {
                  const nextZoom = clampZoom(pinchStartZoom.current * (nextDistance / pinchStartDistance.current));
                  setZoom(nextZoom);
                }
              }
            }}
            onResponderRelease={() => {
              pinchStartDistance.current = null;
            }}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timelineTrack}
            >
              {[...Array(24)].map((_, i) => {
                const hour = (i + 3) % 24;
                const hourStr = hour.toString().padStart(2, '0') + ':00';
                const isNow = hour === 10;

                return (
                  <View key={i} style={[styles.hourMarker, { width: 80 * zoom }]}>
                    {isNow && (
                      <View style={styles.nowMarker}>
                        <Text style={styles.nowText}>Now</Text>
                        <View style={styles.nowLine} />
                      </View>
                    )}
                    <Text style={styles.hourText}>{hourStr}</Text>
                    <View style={styles.hourTick} />
                  </View>
                );
              })}
            </ScrollView>

            {/* Date label */}
            <Text style={styles.dateLabel}>Monday, Feb 9, 2026</Text>
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
            <TouchableOpacity
              style={styles.zoomIconButton}
              onPress={() => setZoom((z) => clampZoom(z / 1.25))}
            >
              <Text style={styles.zoomIconText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.zoomLabel}>{zoomLabel}</Text>
            <TouchableOpacity
              style={styles.zoomIconButton}
              onPress={() => setZoom((z) => clampZoom(z * 1.25))}
            >
              <Text style={styles.zoomIconText}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.segmentDivider} />
          <TouchableOpacity style={styles.jumpSegment}>
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
  },
  timelineTrack: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  hourMarker: {
    alignItems: 'center',
    position: 'relative',
  },
  hourText: {
    fontSize: 11,
    color: '#999',
    marginBottom: 8,
  },
  hourTick: {
    width: 1,
    height: 12,
    backgroundColor: '#ddd',
  },
  nowMarker: {
    position: 'absolute',
    top: -15,
    alignItems: 'center',
  },
  nowText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '600',
    marginBottom: 4,
  },
  nowLine: {
    width: 2,
    height: 50,
    backgroundColor: '#007AFF',
  },
  dateLabel: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    paddingVertical: 8,
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
