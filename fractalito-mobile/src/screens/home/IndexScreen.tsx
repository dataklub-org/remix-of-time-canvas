import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IndexScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>fractalito</Text>
        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <Text style={styles.signInText}>Sign In</Text>
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
        {/* Timeline with hours */}
        <View style={styles.timeline}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.timelineTrack}
          >
            {/* Hour markers */}
            {[...Array(24)].map((_, i) => {
              const hour = (i + 3) % 24; // Start from 03:00
              const hourStr = hour.toString().padStart(2, '0') + ':00';
              const isNow = hour === 10; // Current time marker (example: 10:00)
              
              return (
                <View key={i} style={styles.hourMarker}>
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

        {/* Info text below timeline */}
        <View style={styles.infoBox}>
          <Text style={styles.title}>A visual memory plane</Text>
          <Text style={styles.subtitle}>Time flows horizontally, moments live in space</Text>
          <Text style={styles.description}>
            Capture thoughts, experiences, and ideas as points on a timeline—
            organized by categories, enhanced by meaning and proximity
          </Text>
        </View>
      </View>

      {/* Bottom Buttons */}
      <View style={styles.bottomButtons}>
        <TouchableOpacity style={styles.jumpButton}>
          <Text style={styles.jumpButtonText}>Jump to Now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Add Moment</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
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
  timeline: {
    height: 150,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  timelineTrack: {
    flexDirection: 'row',
    paddingTop: 20,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  hourMarker: {
    width: 80,
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  jumpButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  jumpButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  addButton: {
    flex: 1,
    backgroundColor: '#000',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
