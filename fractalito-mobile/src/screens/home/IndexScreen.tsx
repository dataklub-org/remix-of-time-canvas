import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useEffect, useRef, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useMomentsStore, DEFAULT_TIMELINE_ID } from '../../stores/useMomentsStore';
import type { Category } from '../../types/moment';
import * as ImagePicker from 'expo-image-picker';
import {
  format,
  addDays,
  isWeekend,
  startOfMonth,
  eachDayOfInterval,
  startOfDay,
  endOfDay,
  isSunday,
  isThursday,
  isSaturday,
  startOfYear,
  addMonths,
  subMonths,
  endOfMonth,
  isSameDay,
  getDay,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isToday,
} from 'date-fns';
import { timeToX, getTickInterval, getTimeUnit, ZOOM_LEVELS, getZoomLevelIndex, MIN_MS_PER_PIXEL, MAX_MS_PER_PIXEL, clampZoom } from '../../utils/timeUtils';
import { formatTickLabel } from '../../utils/formatUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IndexScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, isAuthenticated } = useAuth();
  const addMoment = useMomentsStore((state) => state.addMoment);
  const updateMomentY = useMomentsStore((state) => state.updateMomentY);
  const setAuthenticated = useMomentsStore((state) => state.setAuthenticated);
  const moments = useMomentsStore((state) => state.moments);
  const userTimelineId = useMomentsStore((state) => state.userTimelineId);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [centerTime, setCenterTime] = useState<number>(Date.now());
  const [msPerPixel, setMsPerPixel] = useState<number>(ZOOM_LEVELS[3].msPerPixel);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [newMomentOpen, setNewMomentOpen] = useState(false);
  const [savingMoment, setSavingMoment] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [peopleInput, setPeopleInput] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [startDateInput, setStartDateInput] = useState(format(new Date(), 'MM/dd/yyyy'));
  const [startTimeInput, setStartTimeInput] = useState(format(new Date(), 'hh:mm a'));
  const [endDateInput, setEndDateInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [memorable, setMemorable] = useState(false);
  const [keepOriginalSize, setKeepOriginalSize] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);
  const [endPickerMonth, setEndPickerMonth] = useState<Date>(() => new Date());
  const [endPickerHour, setEndPickerHour] = useState<number>(10);
  const [endPickerMinute, setEndPickerMinute] = useState<number>(0);
  const [endPickerPeriod, setEndPickerPeriod] = useState<'AM' | 'PM'>('AM');
  const endDateFieldRef = useRef<any>(null);
  const endTimeFieldRef = useRef<any>(null);
  const [endDateAnchor, setEndDateAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [endTimeAnchor, setEndTimeAnchor] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [dragMomentYById, setDragMomentYById] = useState<Record<string, number>>({});
  const [isPanning, setIsPanning] = useState(false);
  const [isPinching, setIsPinching] = useState(false);
  const lastTouchRef = useRef<{ x: number; y: number; centerTime: number; scrollOffset: number } | null>(null);
  const pinchStartRef = useRef<{ distance: number; msPerPixel: number } | null>(null);
  const draggingMomentIdRef = useRef<string | null>(null);
  const dragCardStartRef = useRef<{ pageY: number; momentY: number } | null>(null);
  const dragMomentCurrentYRef = useRef<Record<string, number>>({});
  const pickerOpenedAtRef = useRef<number>(0);

  useEffect(() => {
    setAuthenticated(isAuthenticated, user?.id || null);
  }, [isAuthenticated, setAuthenticated, user?.id]);

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

  const handleSelectDate = (date: Date) => {
    const noonDate = setMilliseconds(setSeconds(setMinutes(setHours(date, 12), 0), 0), 0);
    setCenterTime(noonDate.getTime());
    setSelectedDate(date);
    setCalendarOpen(false);
  };

  const handleCalendarPrev = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleCalendarNext = () => setCurrentMonth((prev) => addMonths(prev, 1));

  const handleSubmitFeedback = async () => {
    if (feedbackRating === 0 || feedbackSubmitting) return;
    setFeedbackSubmitting(true);
    try {
      const response = await fetch('https://formspree.io/f/mwvnlpee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Rating: ${feedbackRating}/5 stars\n\nFeedback:\n${feedbackText}`,
        }),
      });

      if (response.ok) {
        Alert.alert('Thank you', 'Thank you for your feedback!');
        setFeedbackRating(0);
        setFeedbackText('');
        setFeedbackOpen(false);
      } else {
        Alert.alert('Error', 'Failed to send feedback. Please try again.');
      }
    } catch {
      Alert.alert('Error', 'Failed to send feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const maxVerticalScroll = Math.max(200, viewportHeight / 2);

  const handlePanStart = (e: any) => {
    if (draggingMomentIdRef.current) return;
    if (!e?.nativeEvent?.touches) return;
    const touches = e.nativeEvent.touches;

    if (touches.length >= 2) {
      setIsPinching(true);
      setIsPanning(false);
      const distance = getDistance(touches);
      pinchStartRef.current = { distance, msPerPixel };
      lastTouchRef.current = null;
      return;
    }

    if (touches.length !== 1) return;
    const { pageX, pageY } = touches[0];
    setIsPanning(true);
    setIsPinching(false);
    lastTouchRef.current = { x: pageX, y: pageY, centerTime, scrollOffset };
  };

  const handlePanMove = (e: any) => {
    if (draggingMomentIdRef.current) return;
    if (!e?.nativeEvent?.touches) return;
    const touches = e.nativeEvent.touches;

    if (touches.length >= 2) {
      const distance = getDistance(touches);
      if (!pinchStartRef.current || distance === 0) return;

      const scale = distance / pinchStartRef.current.distance;
      const nextMsPerPixel = Math.min(
        MAX_MS_PER_PIXEL,
        Math.max(MIN_MS_PER_PIXEL, pinchStartRef.current.msPerPixel / scale)
      );
      setMsPerPixel(nextMsPerPixel);
      pinchStartRef.current = { distance, msPerPixel: nextMsPerPixel };
      setIsPinching(true);
      setIsPanning(false);
      return;
    }

    if (!isPanning || !lastTouchRef.current || touches.length !== 1) return;
    const { pageX, pageY } = touches[0];

    const deltaX = pageX - lastTouchRef.current.x;
    const deltaY = pageY - lastTouchRef.current.y;

    if (Math.abs(deltaX) > 0) {
      const timeDelta = deltaX * msPerPixel;
      const newCenterTime = lastTouchRef.current.centerTime - timeDelta;
      setCenterTime(newCenterTime);
      lastTouchRef.current.centerTime = newCenterTime;
    }

    if (Math.abs(deltaY) > 0) {
      const nextScroll = Math.max(
        -maxVerticalScroll,
        Math.min(maxVerticalScroll, lastTouchRef.current.scrollOffset + deltaY)
      );
      setScrollOffset(nextScroll);
      lastTouchRef.current.scrollOffset = nextScroll;
    }

    lastTouchRef.current.x = pageX;
    lastTouchRef.current.y = pageY;
  };

  const handlePanEnd = () => {
    if (draggingMomentIdRef.current) return;
    setIsPanning(false);
    setIsPinching(false);
    lastTouchRef.current = null;
    pinchStartRef.current = null;
    setMsPerPixel((value) => clampZoom(value));
  };

  const resetNewMomentForm = () => {
    const now = new Date();
    setDescriptionInput('');
    setPeopleInput('');
    setPeople([]);
    setLocationInput('');
    setCategory('personal');
    setMemorable(false);
    setStartDateInput(format(now, 'MM/dd/yyyy'));
    setStartTimeInput(format(now, 'hh:mm a'));
    setEndDateInput('');
    setEndTimeInput('');
    setEndDatePickerOpen(false);
    setEndTimePickerOpen(false);
    setEndPickerMonth(now);
    setKeepOriginalSize(false);
    setPhoto(null);
  };

  const endCalendarStart = startOfWeek(startOfMonth(endPickerMonth), { weekStartsOn: 1 });
  const endCalendarDays = Array.from({ length: 42 }, (_, i) => addDays(endCalendarStart, i));
  const endCalendarWeeks = Array.from({ length: 6 }, (_, weekIdx) =>
    endCalendarDays.slice(weekIdx * 7, weekIdx * 7 + 7)
  );

  const applyEndTime = (hour: number, minute: number, period: 'AM' | 'PM') => {
    const nextValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
    setEndPickerHour(hour);
    setEndPickerMinute(minute);
    setEndPickerPeriod(period);
    setEndTimeInput(nextValue);
  };

  const openEndDatePicker = () => {
    setEndTimePickerOpen(false);
    endDateFieldRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setEndDateAnchor({ x, y, width, height });
    });
    pickerOpenedAtRef.current = Date.now();
    setTimeout(() => setEndDatePickerOpen(true), 0);
  };

  const openEndTimePicker = () => {
    setEndDatePickerOpen(false);
    endTimeFieldRef.current?.measureInWindow((x: number, y: number, width: number, height: number) => {
      setEndTimeAnchor({ x, y, width, height });
    });
    const parsed = endTimeInput.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (parsed) {
      setEndPickerHour(Number(parsed[1]));
      setEndPickerMinute(Number(parsed[2]));
      setEndPickerPeriod(parsed[3].toUpperCase() as 'AM' | 'PM');
    } else {
      const now = new Date();
      const h = Number(format(now, 'hh'));
      const m = now.getMinutes();
      const p = format(now, 'a').toUpperCase() as 'AM' | 'PM';
      applyEndTime(h, m, p);
    }
    pickerOpenedAtRef.current = Date.now();
    setTimeout(() => setEndTimePickerOpen(true), 0);
  };

  const setEndToNow = () => {
    const now = new Date();
    setEndDateInput(format(now, 'MM/dd/yyyy'));
    applyEndTime(Number(format(now, 'hh')), now.getMinutes(), format(now, 'a').toUpperCase() as 'AM' | 'PM');
  };

  const parseDateTime = (dateInput: string, timeInput: string) => {
    const dateMatch = dateInput.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    const timeMatch = timeInput.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!dateMatch || !timeMatch) return null;
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    const year = Number(dateMatch[3]);
    const rawHour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (month < 1 || month > 12 || day < 1 || day > 31 || rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) {
      return null;
    }
    let hour = rawHour % 12;
    if (timeMatch[3].toUpperCase() === 'PM') hour += 12;
    const d = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (d.getMonth() !== month - 1 || d.getDate() !== day || d.getFullYear() !== year) return null;
    return d.getTime();
  };

  const saveMoment = async (): Promise<number | null> => {
    const desc = descriptionInput.trim();
    if (!desc) return null;

    const startTs = parseDateTime(startDateInput, startTimeInput);
    if (!startTs) {
      Alert.alert('Invalid Start', 'Use date MM/DD/YYYY and time hh:mm AM/PM.');
      return null;
    }

    let endTs: number | undefined;
    const hasEndDate = !!endDateInput.trim();
    const hasEndTime = !!endTimeInput.trim();
    if (hasEndDate !== hasEndTime) {
      Alert.alert('Invalid End', 'Please choose both End Date and End Time.');
      return null;
    }
    if (hasEndDate && hasEndTime) {
      const parsedEnd = parseDateTime(endDateInput, endTimeInput);
      if (!parsedEnd || parsedEnd <= startTs) {
        Alert.alert('Invalid End', 'End must be after Start.');
        return null;
      }
      endTs = parsedEnd;
    }

    setSavingMoment(true);
    try {
      await addMoment({
        timestamp: startTs,
        endTime: endTs,
        y: 70 + moments.length * 8,
        description: desc,
        people: people.join(', '),
        location: locationInput.trim(),
        category,
        memorable,
        photo: photo || undefined,
        width: 260,
      });
      return startTs;
    } catch (error) {
      console.error('Error creating moment:', error);
      Alert.alert('Error', 'Failed to create moment');
      return null;
    } finally {
      setSavingMoment(false);
    }
  };

  const handleCreateMoment = async () => {
    const createdTs = await saveMoment();
    if (createdTs !== null) {
      setCenterTime(createdTs);
      resetNewMomentForm();
      setNewMomentOpen(false);
    }
  };

  const handleAutosaveAndClose = async () => {
    if (descriptionInput.trim()) {
      const ok = await saveMoment();
      if (!ok) return;
    }
    resetNewMomentForm();
    setNewMomentOpen(false);
  };

  const handleDiscardMoment = () => {
    resetNewMomentForm();
    setNewMomentOpen(false);
  };

  const handleAddPerson = () => {
    const next = peopleInput.trim();
    if (!next) return;
    if (!people.includes(next)) setPeople((prev) => [...prev, next]);
    setPeopleInput('');
  };

  const handlePickPhoto = async (fromCamera: boolean) => {
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') return;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') return;
      }

      const mediaTypes =
        (ImagePicker as any).MediaType?.Images
          ? [(ImagePicker as any).MediaType.Images]
          : ImagePicker.MediaTypeOptions.Images;

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes, quality: keepOriginalSize ? 1 : 0.7 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes, quality: keepOriginalSize ? 1 : 0.7 });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting photo:', error);
    }
  };

  const handleOpenNewMoment = () => {
    const now = new Date();
    setStartDateInput(format(now, 'MM/dd/yyyy'));
    setStartTimeInput(format(now, 'hh:mm a'));
    setEndDatePickerOpen(false);
    setEndTimePickerOpen(false);
    setEndPickerMonth(now);
    setNewMomentOpen(true);
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
  const timelineY = 60;
  const visibleMoments = moments.filter((moment) => {
    const inTimeline =
      moment.timelineId === DEFAULT_TIMELINE_ID ||
      (!!userTimelineId && moment.timelineId === userTimelineId);
    const inRange =
      moment.timestamp >= startTime - visibleTimeRange * 0.1 &&
      moment.timestamp <= endTime + visibleTimeRange * 0.1;
    const passesZoomRule =
      isWeekLevel || isMonthLevel || isYearLevel ? moment.memorable === true : true;

    return inTimeline && inRange && passesZoomRule;
  });

  function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  }

  const datePickerWidth = Math.min(340, viewportWidth - 24);
  const datePickerLeft = endDateAnchor
    ? Math.max(12, Math.min(endDateAnchor.x + endDateAnchor.width - datePickerWidth, viewportWidth - datePickerWidth - 12))
    : 12;
  const datePickerTop = endDateAnchor
    ? Math.min(endDateAnchor.y + endDateAnchor.height + 8, viewportHeight - 430)
    : 100;

  const timePickerWidth = Math.min(340, viewportWidth - 24);
  const timePickerLeft = endTimeAnchor
    ? Math.max(12, Math.min(endTimeAnchor.x + endTimeAnchor.width - timePickerWidth, viewportWidth - timePickerWidth - 12))
    : 12;
  const timePickerTop = endTimeAnchor
    ? Math.min(endTimeAnchor.y + endTimeAnchor.height + 8, viewportHeight - 360)
    : 120;

  const startMomentDrag = (momentId: string, initialY: number, pageY: number) => {
    draggingMomentIdRef.current = momentId;
    dragCardStartRef.current = { pageY, momentY: initialY };
    dragMomentCurrentYRef.current[momentId] = initialY;
  };

  const moveMomentDrag = (momentId: string, pageY: number) => {
    if (!dragCardStartRef.current || draggingMomentIdRef.current !== momentId) return;
    const nextY = dragCardStartRef.current.momentY + (pageY - dragCardStartRef.current.pageY);
    dragMomentCurrentYRef.current[momentId] = nextY;
    setDragMomentYById((prev) => ({ ...prev, [momentId]: nextY }));
  };

  const endMomentDrag = (momentId: string) => {
    const finalY = dragMomentCurrentYRef.current[momentId];
    if (typeof finalY === 'number') {
      updateMomentY(momentId, finalY);
    }
    setDragMomentYById((prev) => {
      const next = { ...prev };
      delete next[momentId];
      return next;
    });
    delete dragMomentCurrentYRef.current[momentId];
    draggingMomentIdRef.current = null;
    dragCardStartRef.current = null;
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
        <View
          style={[styles.timelineWrapper, { transform: [{ translateY: scrollOffset }] }]}
          onStartShouldSetResponder={(e) => e.nativeEvent.touches.length >= 1}
          onMoveShouldSetResponder={(e) => e.nativeEvent.touches.length >= 1}
          onResponderGrant={handlePanStart}
          onResponderMove={handlePanMove}
          onResponderRelease={handlePanEnd}
          onResponderTerminate={handlePanEnd}
        >
          {/* Timeline with hours */}
          <View
            style={styles.timeline}
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

            {visibleMoments.map((moment) => {
              const startX = timeToX(moment.timestamp, centerTime, msPerPixel, viewportWidth);
              const endTimeValue = typeof moment.endTime === 'number'
                ? moment.endTime
                : (moment.endTime ? Number(moment.endTime) : undefined);
              const endX = timeToX(endTimeValue ?? moment.timestamp, centerTime, msPerPixel, viewportWidth);
              const baseCardWidth = moment.width ?? viewportWidth * 0.62;
              const cardWidth = Math.max(190, Math.min(320, baseCardWidth));
              const cardLeft = Math.max(8, Math.min(viewportWidth - cardWidth - 8, startX + 2));
              const cardRight = cardLeft + cardWidth;
              const accentColor = moment.category === 'personal' ? '#f59e0b' : '#4a7dff';
              const cardTop = dragMomentYById[moment.id] ?? moment.y;
              const cardHeight = Math.max(56, moment.height ?? 56);
              const cardBottom = cardTop + cardHeight;
              const isAboveTimeline = cardBottom < timelineY;
              const curveStrength = Math.abs(timelineY - (isAboveTimeline ? cardBottom : cardTop)) * 0.4;
              const svgYOffset = viewportHeight;
              const curveStartY = (isAboveTimeline ? cardBottom : cardTop) + svgYOffset;
              const curveTimelineY = timelineY + svgYOffset;

              return (
                <View key={moment.id}>
                  <Svg
                    style={[styles.momentCurveSvg, { top: -viewportHeight }]}
                    width={viewportWidth}
                    height={viewportHeight * 2}
                  >
                    <Path
                      d={`M ${cardLeft} ${curveStartY}
                          C ${cardLeft} ${curveStartY + (isAboveTimeline ? curveStrength : -curveStrength)},
                            ${startX} ${curveTimelineY + (isAboveTimeline ? -curveStrength : curveStrength)},
                            ${startX} ${curveTimelineY}`}
                      stroke={accentColor}
                      strokeWidth={2}
                      fill="none"
                    />
                    <Path
                      d={`M ${cardRight} ${curveStartY}
                          C ${cardRight} ${curveStartY + (isAboveTimeline ? curveStrength : -curveStrength)},
                            ${endX} ${curveTimelineY + (isAboveTimeline ? -curveStrength : curveStrength)},
                            ${endX} ${curveTimelineY}`}
                      stroke={accentColor}
                      strokeWidth={2}
                      fill="none"
                    />
                  </Svg>
                  <View
                    style={[
                      styles.momentCard,
                      {
                        left: cardLeft,
                        top: cardTop,
                        width: cardWidth,
                        borderLeftColor: accentColor,
                      },
                    ]}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderTerminationRequest={() => false}
                    onResponderGrant={(e) => {
                      const pageY = e.nativeEvent.pageY ?? e.nativeEvent.touches?.[0]?.pageY;
                      if (typeof pageY === 'number') {
                        startMomentDrag(moment.id, cardTop, pageY);
                      }
                    }}
                    onResponderMove={(e) => {
                      const pageY = e.nativeEvent.pageY ?? e.nativeEvent.touches?.[0]?.pageY;
                      if (typeof pageY === 'number') {
                        moveMomentDrag(moment.id, pageY);
                      }
                    }}
                    onResponderRelease={() => endMomentDrag(moment.id)}
                    onResponderTerminate={() => endMomentDrag(moment.id)}
                  >
                    <View style={styles.momentCardMainRow}>
                      <View style={styles.momentTextWrap}>
                        <Text style={styles.momentTitle} numberOfLines={1}>
                          {moment.description}
                        </Text>
                        <Text style={styles.momentMeta} numberOfLines={1}>
                          {format(moment.timestamp, 'hh:mm a')}
                        </Text>
                      </View>
                      {!!moment.photo && (
                        <Image
                          source={{ uri: moment.photo }}
                          style={styles.momentThumb}
                          resizeMode="cover"
                        />
                      )}
                    </View>
                    {moment.memorable && (
                      <View style={styles.momentBadge}>
                        <Text style={styles.momentBadgeText}>M</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
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
          <TouchableOpacity style={styles.feedbackPill} onPress={() => setFeedbackOpen(true)}>
            <Text style={styles.feedbackIcon}>💬</Text>
            <Text style={styles.feedbackText}>Feedback</Text>
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.circleButton}>
              <Text style={styles.circleButtonText}>📷</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.circleButton} onPress={() => setCalendarOpen(true)}>
              <Text style={styles.circleButtonText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.circleButton, styles.circleButtonDark]} onPress={handleOpenNewMoment}>
              <Text style={[styles.circleButtonText, styles.circleButtonTextDark]}>+</Text>
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

      {/* New Moment modal */}
      <Modal visible={newMomentOpen} transparent animationType="fade" onRequestClose={handleAutosaveAndClose}>
        <Pressable style={styles.newMomentOverlay} onPress={handleAutosaveAndClose}>
          <View />
        </Pressable>
        <View style={styles.newMomentOverlayCard}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.newMomentKeyboard}>
            <View style={styles.newMomentCard}>
              <View style={styles.newMomentHeader}>
                <Text style={styles.newMomentTitle}>New Moment</Text>
                <TouchableOpacity onPress={handleDiscardMoment}>
                  <Text style={styles.newMomentClose}>x</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.newMomentScroll} contentContainerStyle={styles.newMomentBody} showsVerticalScrollIndicator>
                <Text style={styles.newMomentLabel}>Description *</Text>
                <TextInput
                  style={[styles.newMomentInput, styles.newMomentTextArea]}
                  placeholder="What happened?"
                  placeholderTextColor="#7e8a9d"
                  value={descriptionInput}
                  onChangeText={setDescriptionInput}
                  multiline
                />
                <TouchableOpacity style={styles.newMomentCreateBtn} onPress={handleCreateMoment} disabled={savingMoment}>
                  <Text style={styles.newMomentCreateText}>{savingMoment ? 'Creating...' : 'Create'}</Text>
                </TouchableOpacity>

                <Text style={styles.newMomentLabel}>People</Text>
                <View style={styles.newMomentPeopleRow}>
                  <TextInput
                    style={[styles.newMomentInput, styles.newMomentPeopleInput]}
                    placeholder="Add person..."
                    placeholderTextColor="#7e8a9d"
                    value={peopleInput}
                    onChangeText={setPeopleInput}
                  />
                  <TouchableOpacity style={styles.newMomentAddBtn} onPress={handleAddPerson}>
                    <Text style={styles.newMomentAddText}>+</Text>
                  </TouchableOpacity>
                </View>
                {people.length > 0 && <Text style={styles.newMomentPeopleAdded}>Added: {people.join(', ')}</Text>}

                <Text style={styles.newMomentLabel}>Location</Text>
                <TextInput
                  style={styles.newMomentInput}
                  placeholder="Where?"
                  placeholderTextColor="#7e8a9d"
                  value={locationInput}
                  onChangeText={setLocationInput}
                />

                <View style={styles.newMomentTimeRow}>
                  <View style={styles.newMomentTimeCol}>
                    <Text style={styles.newMomentLabel}>Start</Text>
                    <TextInput style={styles.newMomentInput} value={startDateInput} onChangeText={setStartDateInput} />
                    <TextInput style={styles.newMomentInput} value={startTimeInput} onChangeText={setStartTimeInput} />
                  </View>
                  <View style={styles.newMomentTimeCol}>
                    <View style={styles.newMomentEndHeader}>
                      <Text style={styles.newMomentLabel}>End (optional)</Text>
                      <TouchableOpacity style={styles.newMomentNowPill} onPress={setEndToNow}>
                        <Text style={styles.newMomentNowText}>Now</Text>
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      ref={endDateFieldRef}
                      style={[styles.newMomentInput, styles.newMomentPickerField]}
                      onPress={openEndDatePicker}
                      accessibilityRole="button"
                      accessibilityLabel="Open end date picker"
                    >
                      <Text style={endDateInput ? styles.newMomentPickerValue : styles.newMomentPickerPlaceholder}>
                        {endDateInput || 'mm/dd/yyyy'}
                      </Text>
                      <Text style={styles.newMomentPickerIcon}>📅</Text>
                    </TouchableOpacity>
                    {endDatePickerOpen && (
                      <View style={styles.endPickerInline}>
                        <View style={styles.endPickerHeader}>
                          <Text style={styles.endPickerTitle} numberOfLines={1} allowFontScaling={false}>
                            {format(endPickerMonth, 'MMMM yyyy')}
                          </Text>
                          <View style={styles.endPickerHeaderActions}>
                            <TouchableOpacity onPress={() => setEndPickerMonth((m) => subMonths(m, 1))} style={styles.endPickerNavBtn}>
                              <Text style={styles.endPickerNavText} allowFontScaling={false}>↑</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setEndPickerMonth((m) => addMonths(m, 1))} style={styles.endPickerNavBtn}>
                              <Text style={styles.endPickerNavText} allowFontScaling={false}>↓</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                        <View style={styles.endPickerWeekRow}>
                          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                            <Text key={day} style={styles.endPickerWeekLabel} allowFontScaling={false}>{day}</Text>
                          ))}
                        </View>
                        <View style={styles.endPickerWeeks}>
                          {endCalendarWeeks.map((week, idx) => (
                            <View key={`w-inline-${idx}`} style={styles.endPickerWeek}>
                              {week.map((day) => {
                                const selected = (() => {
                                  if (!endDateInput) return false;
                                  const parts = endDateInput.split('/');
                                  if (parts.length !== 3) return false;
                                  const parsed = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
                                  return isSameDay(day, parsed);
                                })();
                                const inCurrentMonth = isSameMonth(day, endPickerMonth);
                                return (
                                  <TouchableOpacity
                                    key={`inline-${day.toISOString()}`}
                                    style={[styles.endPickerDayCell, selected && styles.endPickerDayCellSelected]}
                                    onPress={() => {
                                      setEndDateInput(format(day, 'MM/dd/yyyy'));
                                      setEndDatePickerOpen(false);
                                    }}
                                  >
                                    <Text
                                      style={[styles.endPickerDayText, !inCurrentMonth && styles.endPickerDayTextMuted, selected && styles.endPickerDayTextSelected]}
                                      allowFontScaling={false}
                                    >
                                      {format(day, 'd')}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                        <View style={styles.endPickerFooter}>
                          <TouchableOpacity onPress={() => setEndDateInput('')}>
                            <Text style={styles.endPickerFooterLink} allowFontScaling={false}>Clear</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => {
                            const now = new Date();
                            setEndDateInput(format(now, 'MM/dd/yyyy'));
                            setEndPickerMonth(now);
                          }}>
                            <Text style={styles.endPickerFooterLink} allowFontScaling={false}>Today</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    <TouchableOpacity
                      ref={endTimeFieldRef}
                      style={[styles.newMomentInput, styles.newMomentPickerField]}
                      onPress={openEndTimePicker}
                      accessibilityRole="button"
                      accessibilityLabel="Open end time picker"
                    >
                      <Text style={endTimeInput ? styles.newMomentPickerValue : styles.newMomentPickerPlaceholder}>
                        {endTimeInput || '--:-- --'}
                      </Text>
                      <Text style={styles.newMomentPickerIcon}>🕒</Text>
                    </TouchableOpacity>
                    {endTimePickerOpen && (
                      <View style={styles.endTimeInline}>
                        <View style={styles.endTimeColumns}>
                          <ScrollView style={styles.endTimeCol} showsVerticalScrollIndicator={false}>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                              <TouchableOpacity
                                key={`h-inline-${hour}`}
                                style={[styles.endTimeOption, endPickerHour === hour && styles.endTimeOptionActive]}
                                onPress={() => applyEndTime(hour, endPickerMinute, endPickerPeriod)}
                              >
                                <Text style={[styles.endTimeOptionText, endPickerHour === hour && styles.endTimeOptionTextActive]}>
                                  {hour.toString().padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <ScrollView style={styles.endTimeCol} showsVerticalScrollIndicator={false}>
                            {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                              <TouchableOpacity
                                key={`m-inline-${minute}`}
                                style={[styles.endTimeOption, endPickerMinute === minute && styles.endTimeOptionActive]}
                                onPress={() => applyEndTime(endPickerHour, minute, endPickerPeriod)}
                              >
                                <Text style={[styles.endTimeOptionText, endPickerMinute === minute && styles.endTimeOptionTextActive]}>
                                  {minute.toString().padStart(2, '0')}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                          <View style={styles.endPeriodCol}>
                            {(['AM', 'PM'] as const).map((period) => (
                              <TouchableOpacity
                                key={`p-inline-${period}`}
                                style={[styles.endTimeOption, endPickerPeriod === period && styles.endTimeOptionActive]}
                                onPress={() => applyEndTime(endPickerHour, endPickerMinute, period)}
                              >
                                <Text style={[styles.endTimeOptionText, endPickerPeriod === period && styles.endTimeOptionTextActive]}>
                                  {period}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.newMomentCategoryRow}>
                  <TouchableOpacity
                    style={[styles.newMomentCategoryBtn, category === 'personal' && styles.newMomentCategoryBtnActive]}
                    onPress={() => setCategory('personal')}
                  >
                    <Text style={[styles.newMomentCategoryText, category === 'personal' && styles.newMomentCategoryTextActive]}>Personal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.newMomentCategoryBtn, category === 'business' && styles.newMomentCategoryBtnActive]}
                    onPress={() => setCategory('business')}
                  >
                    <Text style={[styles.newMomentCategoryText, category === 'business' && styles.newMomentCategoryTextActive]}>Business</Text>
                  </TouchableOpacity>
                  <View style={styles.newMomentMemorableRow}>
                    <View style={styles.newMomentMemorableSwitch}>
                      <Switch value={memorable} onValueChange={setMemorable} />
                    </View>
                    <Text style={styles.newMomentMemorableText}>Memorable</Text>
                  </View>
                </View>

                <Text style={styles.newMomentLabel}>Photo</Text>
                <View style={styles.newMomentPhotoRow}>
                  <TouchableOpacity style={styles.newMomentPhotoBtn} onPress={() => handlePickPhoto(true)}>
                    <Text style={styles.newMomentPhotoText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.newMomentPhotoBtn} onPress={() => handlePickPhoto(false)}>
                    <Text style={styles.newMomentPhotoText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
                {photo && <Text style={styles.newMomentPhotoChosen}>Photo selected</Text>}

                <View style={styles.newMomentKeepSize}>
                  <View>
                    <Text style={styles.newMomentKeepTitle}>Keep original size</Text>
                    <Text style={styles.newMomentKeepSub}>Higher quality</Text>
                  </View>
                  <Switch value={keepOriginalSize} onValueChange={setKeepOriginalSize} />
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <Modal visible={false && endDatePickerOpen} transparent animationType="fade" onRequestClose={() => setEndDatePickerOpen(false)}>
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => {
            if (Date.now() - pickerOpenedAtRef.current < 150) return;
            setEndDatePickerOpen(false);
          }}
        >
          <View />
        </Pressable>
        <View style={[styles.endPickerPopover, { top: datePickerTop, left: datePickerLeft, width: datePickerWidth }]}>
          <View style={styles.endPickerHeader}>
            <Text style={styles.endPickerTitle}>{format(endPickerMonth, 'MMMM yyyy')}</Text>
            <View style={styles.endPickerHeaderActions}>
              <TouchableOpacity
                onPress={() => setEndPickerMonth((m) => subMonths(m, 1))}
                style={styles.endPickerNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Previous month"
              >
                <Text style={styles.endPickerNavText}>↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEndPickerMonth((m) => addMonths(m, 1))}
                style={styles.endPickerNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Next month"
              >
                <Text style={styles.endPickerNavText}>↓</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.endPickerWeekRow}>
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
              <Text key={day} style={styles.endPickerWeekLabel}>{day}</Text>
            ))}
          </View>
          <View style={styles.endPickerWeeks}>
            {endCalendarWeeks.map((week, idx) => (
              <View key={`w-${idx}`} style={styles.endPickerWeek}>
                {week.map((day) => {
                  const selected = (() => {
                    if (!endDateInput) return false;
                    const parts = endDateInput.split('/');
                    if (parts.length !== 3) return false;
                    const parsed = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
                    return isSameDay(day, parsed);
                  })();
                  const inCurrentMonth = isSameMonth(day, endPickerMonth);
                  return (
                    <TouchableOpacity
                      key={day.toISOString()}
                      style={[styles.endPickerDayCell, selected && styles.endPickerDayCellSelected]}
                      onPress={() => {
                        setEndDateInput(format(day, 'MM/dd/yyyy'));
                        setEndDatePickerOpen(false);
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Choose ${format(day, 'MMMM d, yyyy')}`}
                    >
                      <Text style={[styles.endPickerDayText, !inCurrentMonth && styles.endPickerDayTextMuted, selected && styles.endPickerDayTextSelected]}>
                        {format(day, 'd')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
          <View style={styles.endPickerFooter}>
            <TouchableOpacity onPress={() => setEndDateInput('')} accessibilityRole="button" accessibilityLabel="Clear end date">
              <Text style={styles.endPickerFooterLink}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const now = new Date();
                setEndDateInput(format(now, 'MM/dd/yyyy'));
                setEndPickerMonth(now);
              }}
              accessibilityRole="button"
              accessibilityLabel="Set end date to today"
            >
              <Text style={styles.endPickerFooterLink}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={false && endTimePickerOpen} transparent animationType="fade" onRequestClose={() => setEndTimePickerOpen(false)}>
        <Pressable
          style={styles.pickerBackdrop}
          onPress={() => {
            if (Date.now() - pickerOpenedAtRef.current < 150) return;
            setEndTimePickerOpen(false);
          }}
        >
          <View />
        </Pressable>
        <View style={[styles.endPickerPopover, { top: timePickerTop, left: timePickerLeft, width: timePickerWidth }]}>
          <View style={styles.endTimeColumns}>
            <ScrollView style={styles.endTimeCol} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                <TouchableOpacity
                  key={`h-${hour}`}
                  style={[styles.endTimeOption, endPickerHour === hour && styles.endTimeOptionActive]}
                  onPress={() => applyEndTime(hour, endPickerMinute, endPickerPeriod)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select hour ${hour}`}
                >
                  <Text style={[styles.endTimeOptionText, endPickerHour === hour && styles.endTimeOptionTextActive]}>
                    {hour.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <ScrollView style={styles.endTimeCol} showsVerticalScrollIndicator={false}>
              {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                <TouchableOpacity
                  key={`m-${minute}`}
                  style={[styles.endTimeOption, endPickerMinute === minute && styles.endTimeOptionActive]}
                  onPress={() => applyEndTime(endPickerHour, minute, endPickerPeriod)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select minute ${minute.toString().padStart(2, '0')}`}
                >
                  <Text style={[styles.endTimeOptionText, endPickerMinute === minute && styles.endTimeOptionTextActive]}>
                    {minute.toString().padStart(2, '0')}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.endPeriodCol}>
              {(['AM', 'PM'] as const).map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[styles.endTimeOption, endPickerPeriod === period && styles.endTimeOptionActive]}
                  onPress={() => applyEndTime(endPickerHour, endPickerMinute, period)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${period}`}
                >
                  <Text style={[styles.endTimeOptionText, endPickerPeriod === period && styles.endTimeOptionTextActive]}>
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Calendar popover */}
      <Modal visible={calendarOpen} transparent animationType="fade" onRequestClose={() => setCalendarOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setCalendarOpen(false)}>
          <View />
        </Pressable>
        <View style={styles.calendarPopover}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={handleCalendarPrev} style={styles.calendarNavBtn}>
              <Text style={styles.calendarNavText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calendarTitle}>{format(currentMonth, 'MMMM yyyy')}</Text>
            <TouchableOpacity onPress={handleCalendarNext} style={styles.calendarNavBtn}>
              <Text style={styles.calendarNavText}>›</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.weekHeaderRow}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <Text key={day} style={styles.weekHeaderText}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {Array.from({ length: getDay(startOfMonth(currentMonth)) }).map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}

            {eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) }).map((day) => {
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
              return (
                <TouchableOpacity
                  key={day.toISOString()}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    !isSelected && isToday && styles.dayCellToday,
                  ]}
                  onPress={() => handleSelectDate(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextSelected,
                    ]}
                  >
                    {format(day, 'd')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>

      {/* Feedback sheet */}
      <Modal visible={feedbackOpen} transparent animationType="slide" onRequestClose={() => setFeedbackOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setFeedbackOpen(false)}>
          <View />
        </Pressable>
        <View style={[styles.feedbackSheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.feedbackSheetHeader}>
            <Text style={styles.feedbackSheetTitle}>Share your feedback</Text>
            <TouchableOpacity onPress={() => setFeedbackOpen(false)} style={styles.feedbackClose}>
              <Text style={styles.feedbackCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.ratingLabel}>Rating:</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                  <Text style={[styles.star, star <= feedbackRating && styles.starActive]}>★</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            value={feedbackText}
            onChangeText={setFeedbackText}
            placeholder="Tell us what you think..."
            placeholderTextColor="#d1fae5"
            multiline
            style={styles.feedbackInput}
          />

          <TouchableOpacity
            style={[styles.feedbackSubmit, (feedbackRating === 0 || feedbackSubmitting) && styles.feedbackSubmitDisabled]}
            disabled={feedbackRating === 0 || feedbackSubmitting}
            onPress={handleSubmitFeedback}
          >
            {feedbackSubmitting ? (
              <ActivityIndicator color="#15803d" />
            ) : (
              <Text style={styles.feedbackSubmitText}>Send Feedback</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
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
    overflow: 'visible',
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
  momentConnector: {
    position: 'absolute',
    width: 2,
    borderRadius: 2,
  },
  momentCurveSvg: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  momentCard: {
    position: 'absolute',
    minHeight: 56,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#f3f4f6',
    borderLeftWidth: 3,
    borderLeftColor: '#4a7dff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  momentCardMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  momentTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  momentTitle: {
    fontSize: 15,
    color: '#1f2430',
    fontWeight: '700',
  },
  momentMeta: {
    marginTop: 3,
    fontSize: 11,
    color: '#6b7280',
  },
  momentThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  momentBadge: {
    position: 'absolute',
    top: -10,
    right: -8,
    minWidth: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: '#9ca3af',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  momentBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
  },
  calendarPopover: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    width: 260,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  calendarNavBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarNavText: {
    fontSize: 20,
    color: '#111',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  weekHeaderText: {
    width: 32,
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  dayCellToday: {
    backgroundColor: '#f3f4f6',
  },
  dayCellSelected: {
    backgroundColor: '#111',
  },
  dayText: {
    fontSize: 12,
    color: '#111',
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#fff',
  },
  feedbackSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    backgroundColor: '#16a34a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  feedbackSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feedbackSheetTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  feedbackClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  feedbackCloseText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  ratingLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.4)',
  },
  starActive: {
    color: '#fde047',
  },
  feedbackInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    minHeight: 80,
    marginBottom: 12,
  },
  feedbackSubmit: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  feedbackSubmitDisabled: {
    opacity: 0.6,
  },
  feedbackSubmitText: {
    color: '#15803d',
    fontWeight: '700',
    fontSize: 13,
  },
  newMomentOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 21, 30, 0.72)',
  },
  newMomentOverlayCard: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  newMomentKeyboard: {
    width: '100%',
    maxWidth: 760,
    maxHeight: '95%',
  },
  newMomentCard: {
    backgroundColor: '#f4f5f7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d6dbe3',
    overflow: 'hidden',
    maxHeight: '100%',
  },
  newMomentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#dfe3ea',
  },
  newMomentTitle: {
    fontSize: 20,
    color: '#303846',
    fontWeight: '500',
  },
  newMomentClose: {
    fontSize: 28,
    color: '#5f6674',
    paddingHorizontal: 8,
  },
  newMomentScroll: {
    maxHeight: 720,
  },
  newMomentBody: {
    padding: 18,
    gap: 14,
  },
  newMomentLabel: {
    fontSize: 15,
    color: '#313a49',
    fontWeight: '500',
  },
  newMomentInput: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    backgroundColor: '#f4f5f7',
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
  },
  newMomentPickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newMomentPickerPlaceholder: {
    fontSize: 16,
    color: '#7e8a9d',
  },
  newMomentPickerValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  newMomentPickerIcon: {
    fontSize: 16,
    color: '#1f2937',
  },
  newMomentTextArea: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  newMomentCreateBtn: {
    backgroundColor: '#9da2aa',
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  newMomentCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  newMomentPeopleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  newMomentPeopleInput: {
    flex: 1,
  },
  newMomentPeopleAdded: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: -4,
  },
  newMomentAddBtn: {
    width: 56,
    minHeight: 54,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#f4f5f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newMomentAddText: {
    fontSize: 22,
    color: '#283141',
    lineHeight: 22,
  },
  newMomentTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  newMomentTimeCol: {
    flex: 1,
    gap: 8,
  },
  newMomentEndHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newMomentNowPill: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 3,
    backgroundColor: '#f4f5f7',
  },
  newMomentNowText: {
    fontSize: 12,
    color: '#4b5563',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  endPickerPopover: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: '#d5d9e0',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  endPickerInline: {
    width: '100%',
    minWidth: 280,
    maxWidth: 360,
    alignSelf: 'flex-end',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d5d9e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 10,
  },
  endPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  endPickerHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  endPickerTitle: {
    flexShrink: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    color: '#111827',
  },
  endPickerNavBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endPickerNavText: {
    fontSize: 18,
    lineHeight: 18,
    color: '#9ca3af',
  },
  endPickerWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  endPickerWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 16,
    color: '#111827',
  },
  endPickerWeeks: {
    gap: 0,
  },
  endPickerWeek: {
    flexDirection: 'row',
    width: '100%',
  },
  endPickerDayCell: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endPickerDayCellSelected: {
    backgroundColor: '#1d70e7',
    borderRadius: 4,
  },
  endPickerDayText: {
    fontSize: 15,
    lineHeight: 18,
    color: '#111827',
    fontWeight: '400',
    textAlign: 'center',
  },
  endPickerDayTextMuted: {
    color: '#b5bbc6',
  },
  endPickerDayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  endPickerFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  endPickerFooterLink: {
    color: '#1d70e7',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
  },
  endTimeColumns: {
    flexDirection: 'row',
    gap: 8,
  },
  endTimeInline: {
    width: '100%',
    minWidth: 280,
    maxWidth: 360,
    alignSelf: 'flex-end',
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#d5d9e0',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 10,
  },
  endTimeCol: {
    flex: 1,
    maxHeight: 300,
  },
  endPeriodCol: {
    width: 72,
    justifyContent: 'flex-start',
    gap: 8,
  },
  endTimeOption: {
    minHeight: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  endTimeOptionActive: {
    backgroundColor: '#1d70e7',
  },
  endTimeOptionText: {
    fontSize: 22,
    lineHeight: 24,
    color: '#111827',
    fontWeight: '500',
  },
  endTimeOptionTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  newMomentCategoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  newMomentCategoryBtn: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    backgroundColor: '#eceef2',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  newMomentCategoryBtnActive: {
    borderColor: '#f19b3a',
    backgroundColor: '#fff6ec',
  },
  newMomentCategoryText: {
    fontSize: 17,
    color: '#3b4353',
  },
  newMomentCategoryTextActive: {
    color: '#cc5f10',
    fontWeight: '600',
  },
  newMomentMemorableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 120,
    flexGrow: 1,
  },
  newMomentMemorableSwitch: {
    transform: [{ scale: 0.95 }],
  },
  newMomentMemorableText: {
    fontSize: 16,
    color: '#323b4a',
    flexShrink: 1,
  },
  newMomentPhotoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  newMomentPhotoBtn: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    backgroundColor: '#f4f5f7',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  newMomentPhotoText: {
    fontSize: 16,
    color: '#313a49',
  },
  newMomentPhotoChosen: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: -4,
  },
  newMomentKeepSize: {
    borderWidth: 1,
    borderColor: '#d9dee7',
    borderRadius: 12,
    minHeight: 74,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newMomentKeepTitle: {
    fontSize: 16,
    color: '#323b4a',
    fontWeight: '500',
  },
  newMomentKeepSub: {
    fontSize: 12,
    color: '#7a8598',
    marginTop: 2,
  },
});
