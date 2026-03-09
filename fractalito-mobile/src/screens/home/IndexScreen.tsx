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
  Clipboard,
  Share,
  Linking,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Video, ResizeMode } from 'expo-av';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../hooks/useAuth';
import { useNotifications, type Notification } from '../../hooks/useNotifications';
import { useMomentsStore, DEFAULT_TIMELINE_ID, OURLIFE_TIMELINE_ID, BABYLIFE_TIMELINE_ID } from '../../stores/useMomentsStore';
import type { Category } from '../../types/moment';
import { useConnections } from '../../hooks/useConnections';
import { useGroups, type GroupMember } from '../../hooks/useGroups';
import { useBabies, useShareMomentToBaby } from '../../hooks/useBabies';
import * as ImagePicker from 'expo-image-picker';
import { devLog } from '../../utils/logger';
import { FEEDBACK_URL, WEB_BASE_URL } from '../../config/appConfig';
import { supabase } from '../../integrations/supabase/client';
import { nanoid } from 'nanoid';
import { COLOR_PALETTE, DEFAULT_GROUP_COLOR } from '../../utils/colorPalette';
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
import { timeToX, getTickInterval, getTimeUnit, ZOOM_LEVELS, getZoomLevelIndex, MIN_MS_PER_PIXEL, MAX_MS_PER_PIXEL, clampZoom, getDefaultMomentWidth } from '../../utils/timeUtils';
import { formatTickLabel } from '../../utils/formatUtils';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function IndexScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, profile, isAuthenticated } = useAuth();
  const {
    connections,
    searchResults,
    searching: searchingConnections,
    searchUsers,
    addConnection,
    removeConnection,
    clearSearchResults,
  } = useConnections(user?.id || null);
  const { groups, createGroup, addMemberToGroup, getGroupMembers, deleteGroup, updateGroupColor } = useGroups(user?.id || null);
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications(user?.id || null);
  const { babies, createBaby } = useBabies(user?.id || null);
  const { shareMomentToBaby } = useShareMomentToBaby(user?.id || null);
  const addMoment = useMomentsStore((state) => state.addMoment);
  const addGroupMoment = useMomentsStore((state) => state.addGroupMoment);
  const updateMoment = useMomentsStore((state) => state.updateMoment);
  const updateGroupMoment = useMomentsStore((state) => state.updateGroupMoment);
  const deleteMoment = useMomentsStore((state) => state.deleteMoment);
  const deleteGroupMoment = useMomentsStore((state) => state.deleteGroupMoment);
  const updateMomentY = useMomentsStore((state) => state.updateMomentY);
  const updateGroupMomentY = useMomentsStore((state) => state.updateGroupMomentY);
  const updateBabyMomentY = useMomentsStore((state) => state.updateBabyMomentY);
  const loadBabyMoments = useMomentsStore((state) => state.loadBabyMoments);
  const loadGroupMoments = useMomentsStore((state) => state.loadGroupMoments);
  const setAuthenticated = useMomentsStore((state) => state.setAuthenticated);
  const moments = useMomentsStore((state) => state.moments);
  const groupMoments = useMomentsStore((state) => state.groupMoments);
  const babyMoments = useMomentsStore((state) => state.babyMoments);
  const userTimelineId = useMomentsStore((state) => state.userTimelineId);
  const activeTimelineId = useMomentsStore((state) => state.canvasState.activeTimelineId);
  const setActiveTimeline = useMomentsStore((state) => state.setActiveTimeline);
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [centerTime, setCenterTime] = useState<number>(Date.now());
  const [msPerPixel, setMsPerPixel] = useState<number>(ZOOM_LEVELS[3].msPerPixel);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [timelineWrapperHeight, setTimelineWrapperHeight] = useState(0);
  const [createMomentY, setCreateMomentY] = useState<number | null>(null);
  const [momentOrder, setMomentOrder] = useState<string[]>([]);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [myCircleOpen, setMyCircleOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [mediaViewerOpen, setMediaViewerOpen] = useState(false);
  const [mediaViewerPhotos, setMediaViewerPhotos] = useState<string[]>([]);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [addBabyOpen, setAddBabyOpen] = useState(false);
  const [myCircleSearch, setMyCircleSearch] = useState('');
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [creatingBaby, setCreatingBaby] = useState(false);
  const [newMomentOpen, setNewMomentOpen] = useState(false);
  const [editingMomentId, setEditingMomentId] = useState<string | null>(null);
  const [savingMoment, setSavingMoment] = useState(false);
  const [descriptionInput, setDescriptionInput] = useState('');
  const [peopleInput, setPeopleInput] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [selectedShareGroupIds, setSelectedShareGroupIds] = useState<string[]>([]);
  const [selectedShareBabyIds, setSelectedShareBabyIds] = useState<string[]>([]);
  const [locationInput, setLocationInput] = useState('');
  const [category, setCategory] = useState<Category>('personal');
  const [startDateInput, setStartDateInput] = useState(format(new Date(), 'MM/dd/yyyy'));
  const [startTimeInput, setStartTimeInput] = useState(format(new Date(), 'hh:mm a'));
  const [endDateInput, setEndDateInput] = useState('');
  const [endTimeInput, setEndTimeInput] = useState('');
  const [memorable, setMemorable] = useState(false);
  const [keepOriginalSize, setKeepOriginalSize] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videoThumbs, setVideoThumbs] = useState<Record<string, string>>({});
  const [endDatePickerOpen, setEndDatePickerOpen] = useState(false);
  const [endTimePickerOpen, setEndTimePickerOpen] = useState(false);
  const [endPickerMonth, setEndPickerMonth] = useState<Date>(() => new Date());
  const [endPickerHour, setEndPickerHour] = useState<number>(10);
  const [endPickerMinute, setEndPickerMinute] = useState<number>(0);
  const [endPickerPeriod, setEndPickerPeriod] = useState<'AM' | 'PM'>('AM');
  const [babyNameInput, setBabyNameInput] = useState('');
  const [babyUsernameInput, setBabyUsernameInput] = useState('');
  const [babyDateOfBirthInput, setBabyDateOfBirthInput] = useState('');
  const [babyTimeOfBirthInput, setBabyTimeOfBirthInput] = useState('');
  const [babyPlaceOfBirthInput, setBabyPlaceOfBirthInput] = useState('');
  const [babyDatePickerOpen, setBabyDatePickerOpen] = useState(false);
  const [babyTimePickerOpen, setBabyTimePickerOpen] = useState(false);
  const [babyPickerMonth, setBabyPickerMonth] = useState<Date>(() => new Date());
  const [babyPickerHour, setBabyPickerHour] = useState<number>(10);
  const [babyPickerMinute, setBabyPickerMinute] = useState<number>(0);
  const [babyPickerPeriod, setBabyPickerPeriod] = useState<'AM' | 'PM'>('AM');
  const [selectedOurLifeGroupId, setSelectedOurLifeGroupId] = useState<string | null>(null);
  const [selectedBabyId, setSelectedBabyId] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [loadingGroupMembers, setLoadingGroupMembers] = useState(false);
  const [colorPickerGroupId, setColorPickerGroupId] = useState<string | null>(null);
  const [inviteCodes, setInviteCodes] = useState<Record<string, { id: string; code: string; createdAt: string } | null>>({});
  const [loadingInviteGroupId, setLoadingInviteGroupId] = useState<string | null>(null);
  const [generatingInviteGroupId, setGeneratingInviteGroupId] = useState<string | null>(null);
  const [deletingInviteGroupId, setDeletingInviteGroupId] = useState<string | null>(null);
  const [copiedInviteGroupId, setCopiedInviteGroupId] = useState<string | null>(null);
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
  const suppressDragRef = useRef(false);
  const pickerOpenedAtRef = useRef<number>(0);
  const isMyLife = activeTimelineId === DEFAULT_TIMELINE_ID;
  const isOurLife = activeTimelineId === OURLIFE_TIMELINE_ID;
  const isBabyLife = activeTimelineId === BABYLIFE_TIMELINE_ID;
  const groupNameById = useMemo(() => new Map(groups.map((g) => [g.id, g.name])), [groups]);
  const myLifeMoments = useMemo(() => {
    if (!isMyLife) return moments;
    const seenIds = new Set(moments.map((m) => m.id));
    const seenKeys = new Set<string>();
    const merged = [...moments];
    moments.forEach((m) => {
      seenKeys.add(`id:${m.id}`);
    });
    groupMoments.forEach((m) => {
      if (m.originalMomentId && seenIds.has(m.originalMomentId)) return;
      const key = m.originalMomentId
        ? `orig:${m.originalMomentId}`
        : `shared:${m.sharedBy ?? 'unknown'}:${m.timestamp}:${m.endTime ?? ''}:${m.description}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      merged.push(m);
    });
    return merged;
  }, [isMyLife, moments, groupMoments]);
  type OurLifeMoment = (typeof groupMoments)[number] & {
    sharedGroupIds?: string[];
    sharedGroupMomentIds?: string[];
  };
  const mergedOurLifeMoments = useMemo<OurLifeMoment[]>(() => {
    const grouped = new Map<string, { moment: OurLifeMoment; groupIds: string[]; momentIds: string[] }>();
    groupMoments.forEach((m) => {
      const key = m.originalMomentId
        ? `orig:${m.originalMomentId}`
        : `shared:${m.sharedBy ?? 'unknown'}:${m.timestamp}:${m.endTime ?? ''}:${m.description}:${m.people}:${m.location}:${m.category}`;
      const existing = grouped.get(key);
      if (existing) {
        if (m.groupId && !existing.groupIds.includes(m.groupId)) existing.groupIds.push(m.groupId);
        if (!existing.momentIds.includes(m.id)) existing.momentIds.push(m.id);
        return;
      }
      grouped.set(key, {
        moment: m,
        groupIds: m.groupId ? [m.groupId] : [],
        momentIds: [m.id],
      });
    });
    return Array.from(grouped.values()).map(({ moment, groupIds, momentIds }) => ({
      ...moment,
      sharedGroupIds: groupIds,
      sharedGroupMomentIds: momentIds,
    }));
  }, [groupMoments]);
  const filteredGroupMoments = useMemo(
    () =>
      selectedOurLifeGroupId
        ? mergedOurLifeMoments.filter((m) => (m.sharedGroupIds ?? []).includes(selectedOurLifeGroupId))
        : mergedOurLifeMoments,
    [mergedOurLifeMoments, selectedOurLifeGroupId]
  );
  const filteredBabyMoments = useMemo(
    () =>
      selectedBabyId
        ? babyMoments.filter((m) => m.groupId === selectedBabyId)
        : babyMoments,
    [babyMoments, selectedBabyId]
  );
  const activeMoments = useMemo(
    () => (isOurLife ? filteredGroupMoments : (isBabyLife ? filteredBabyMoments : myLifeMoments)),
    [isOurLife, isBabyLife, filteredGroupMoments, filteredBabyMoments, myLifeMoments]
  );
  const editingMoment = editingMomentId ? activeMoments.find((m) => m.id === editingMomentId) ?? null : null;
  const isEditingMoment = !!editingMomentId;

  useEffect(() => {
    setAuthenticated(isAuthenticated, user?.id || null);
  }, [isAuthenticated, setAuthenticated, user?.id]);

  useEffect(() => {
    setMomentOrder((prev) => {
      const seen = new Set(prev);
      const next = prev.filter((id) => activeMoments.some((m) => m.id === id));
      activeMoments.forEach((moment) => {
        if (!seen.has(moment.id)) next.push(moment.id);
      });
      return next;
    });
  }, [activeMoments]);

  useEffect(() => {
    if (!myCircleOpen) return;
    const q = myCircleSearch.trim();
    if (!q) return;
    const timer = setTimeout(() => {
      searchUsers(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [myCircleOpen, myCircleSearch, searchUsers]);

  useEffect(() => {
    if (!babies.length) {
      setSelectedBabyId(null);
      return;
    }
    setSelectedBabyId((prev) => (prev && babies.some((b) => b.id === prev) ? prev : babies[0].id));
  }, [babies]);

  const bringMomentToFront = (momentId: string) => {
    setMomentOrder((prev) => {
      const next = prev.filter((id) => id !== momentId);
      next.push(momentId);
      return next;
    });
  };

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
    const hourlyZoom = ZOOM_LEVELS.find((z) => z.unit === 'hour')?.msPerPixel ?? 36_000;
    setMsPerPixel(hourlyZoom);
    setCenterTime(Date.now());
    setScrollOffset(0);
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
      const response = await fetch(FEEDBACK_URL, {
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
    setPhotos([]);
    setSelectedShareGroupIds([]);
    setSelectedShareBabyIds([]);
    setCreateMomentY(null);
  };

  const loadFormFromMoment = (moment: (typeof activeMoments)[number]) => {
    const startDate = new Date(moment.timestamp);
    setDescriptionInput(moment.description || '');
    setPeopleInput('');
    setPeople(
      (moment.people || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
    );
    setLocationInput(moment.location || '');
    setCategory(moment.category);
    setMemorable(!!moment.memorable);
    setStartDateInput(format(startDate, 'MM/dd/yyyy'));
    setStartTimeInput(format(startDate, 'hh:mm a'));
    if (moment.endTime) {
      const endDate = new Date(moment.endTime);
      setEndDateInput(format(endDate, 'MM/dd/yyyy'));
      setEndTimeInput(format(endDate, 'hh:mm a'));
    } else {
      setEndDateInput('');
      setEndTimeInput('');
    }
    setEndDatePickerOpen(false);
    setEndTimePickerOpen(false);
    if (moment.photos && moment.photos.length > 0) {
      setPhotos(moment.photos);
    } else if (moment.photo) {
      setPhotos([moment.photo]);
    } else {
      setPhotos([]);
    }
  };

  const openEditMoment = (moment: (typeof activeMoments)[number]) => {
    if (!isMyLife) {
      Alert.alert('Read Only', 'Editing is only available in MyLife.');
      return;
    }
    setEditingMomentId(moment.id);
    loadFormFromMoment(moment);
    setNewMomentOpen(true);
  };

  const endCalendarStart = startOfWeek(startOfMonth(endPickerMonth), { weekStartsOn: 1 });
  const endCalendarDays = Array.from({ length: 42 }, (_, i) => addDays(endCalendarStart, i));
  const endCalendarWeeks = Array.from({ length: 6 }, (_, weekIdx) =>
    endCalendarDays.slice(weekIdx * 7, weekIdx * 7 + 7)
  );
  const babyCalendarStart = startOfWeek(startOfMonth(babyPickerMonth), { weekStartsOn: 1 });
  const babyCalendarDays = Array.from({ length: 42 }, (_, i) => addDays(babyCalendarStart, i));
  const babyCalendarWeeks = Array.from({ length: 6 }, (_, weekIdx) =>
    babyCalendarDays.slice(weekIdx * 7, weekIdx * 7 + 7)
  );

  const applyEndTime = (hour: number, minute: number, period: 'AM' | 'PM') => {
    const nextValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
    setEndPickerHour(hour);
    setEndPickerMinute(minute);
    setEndPickerPeriod(period);
    if (!endDateInput.trim()) {
      setEndDateInput(startDateInput);
    }
    setEndTimeInput(nextValue);
  };

  const applyBabyTime = (hour: number, minute: number, period: 'AM' | 'PM') => {
    const nextValue = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${period}`;
    setBabyPickerHour(hour);
    setBabyPickerMinute(minute);
    setBabyPickerPeriod(period);
    setBabyTimeOfBirthInput(nextValue);
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

  const parseDateOnly = (dateInput: string): Date | null => {
    const dateMatch = dateInput.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (!dateMatch) return null;
    const month = Number(dateMatch[1]);
    const day = Number(dateMatch[2]);
    const year = Number(dateMatch[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    if (d.getMonth() !== month - 1 || d.getDate() !== day || d.getFullYear() !== year) return null;
    return d;
  };

  const minEndDate = parseDateOnly(startDateInput);
  const isEndDateBeforeStart = (day: Date) => {
    if (!minEndDate) return false;
    return startOfDay(day).getTime() < startOfDay(minEndDate).getTime();
  };

  const parseTimeForSql = (timeInput: string): string | undefined => {
    const trimmed = timeInput.trim();
    if (!trimmed) return undefined;
    const timeMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) return undefined;
    const rawHour = Number(timeMatch[1]);
    const minute = Number(timeMatch[2]);
    if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) return undefined;
    let hour = rawHour % 12;
    if (timeMatch[3].toUpperCase() === 'PM') hour += 12;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
  };

  const isMomentFormEligible = useMemo(() => {
    if (isEditingMoment) {
      if (!isMyLife) return false;
      if (!descriptionInput.trim()) return false;
      const startTs = parseDateTime(startDateInput, startTimeInput);
      if (!startTs) return false;
      const hasEndDate = !!endDateInput.trim();
      const hasEndTime = !!endTimeInput.trim();
      if (hasEndDate !== hasEndTime) return false;
      if (hasEndDate && hasEndTime) {
        const parsedEnd = parseDateTime(endDateInput, endTimeInput);
        if (!parsedEnd || parsedEnd < startTs) return false;
      }
      return true;
    }

    if (!isMyLife && !isOurLife && !isBabyLife) return false;
    if (!descriptionInput.trim()) return false;
    const startTs = parseDateTime(startDateInput, startTimeInput);
    if (!startTs) return false;

    const hasEndDate = !!endDateInput.trim();
    const hasEndTime = !!endTimeInput.trim();
    if (hasEndDate !== hasEndTime) return false;
    if (hasEndDate && hasEndTime) {
      const parsedEnd = parseDateTime(endDateInput, endTimeInput);
      if (!parsedEnd || parsedEnd < startTs) return false;
    }

    if (isBabyLife && !selectedBabyId) return false;
    if (isOurLife && groups.length > 0 && selectedShareGroupIds.length === 0) return false;
    return true;
  }, [
    isEditingMoment,
    isMyLife,
    isOurLife,
    isBabyLife,
    descriptionInput,
    startDateInput,
    startTimeInput,
    endDateInput,
    endTimeInput,
    selectedBabyId,
    groups.length,
    selectedShareGroupIds.length,
  ]);

  const resetAddBabyForm = () => {
    const now = new Date();
    setBabyNameInput('');
    setBabyUsernameInput('');
    setBabyDateOfBirthInput('');
    setBabyTimeOfBirthInput('');
    setBabyPlaceOfBirthInput('');
    setBabyDatePickerOpen(false);
    setBabyTimePickerOpen(false);
    setBabyPickerMonth(now);
    setBabyPickerHour(Number(format(now, 'hh')));
    setBabyPickerMinute(now.getMinutes());
    setBabyPickerPeriod(format(now, 'a').toUpperCase() as 'AM' | 'PM');
  };

  const handleOpenAddBaby = () => {
    resetAddBabyForm();
    setMyCircleOpen(false);
    setTimeout(() => setAddBabyOpen(true), 0);
  };

  const handleCreateBaby = async () => {
    const name = babyNameInput.trim();
    const username = babyUsernameInput.trim().toLowerCase();
    if (!name) {
      Alert.alert('Missing Name', "Please enter the baby's name.");
      return;
    }
    if (!username) {
      Alert.alert('Missing Username', "Please enter the baby's username.");
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      Alert.alert('Invalid Username', 'Username can only contain letters, numbers, and underscores.');
      return;
    }
    const dateOfBirth = parseDateOnly(babyDateOfBirthInput);
    if (!dateOfBirth) {
      Alert.alert('Invalid Date of Birth', 'Use date format MM/DD/YYYY.');
      return;
    }
    const parsedTime = parseTimeForSql(babyTimeOfBirthInput);
    if (babyTimeOfBirthInput.trim() && !parsedTime) {
      Alert.alert('Invalid Time of Birth', 'Use time format hh:mm AM/PM.');
      return;
    }

    setCreatingBaby(true);
    try {
      const created = await createBaby({
        name,
        username,
        dateOfBirth,
        timeOfBirth: parsedTime,
        placeOfBirth: babyPlaceOfBirthInput.trim() || undefined,
      });
      if (created) {
        setAddBabyOpen(false);
        resetAddBabyForm();
      }
    } finally {
      setCreatingBaby(false);
    }
  };

  const saveMoment = async (): Promise<number | null> => {
    if (!isMyLife && !isOurLife && !isBabyLife) {
      Alert.alert('Read Only', 'Creating moments is only available in MyLife, OurLife, and BabyLife.');
      return null;
    }
    const desc = descriptionInput.trim();
    if (!desc) {
      Alert.alert('Missing Description', 'Please add a description before creating a moment.');
      return null;
    }

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
      if (!parsedEnd || parsedEnd < startTs) {
        Alert.alert('Invalid End', 'End cannot be before Start.');
        return null;
      }
      endTs = parsedEnd;
    }

    setSavingMoment(true);
    try {
      const initialY = typeof createMomentY === 'number' ? createMomentY : 70;
      const initialWidth = getDefaultMomentWidth(msPerPixel);
      const primaryPhoto = photos.length > 0 ? photos[0] : null;
      const payload = {
        timestamp: startTs,
        endTime: endTs,
        y: initialY,
        description: desc,
        people: people.join(', '),
        location: locationInput.trim(),
        category,
        memorable,
        photo: primaryPhoto || undefined,
        photos: photos.length > 0 ? photos : undefined,
        width: initialWidth,
      };

      if (isBabyLife) {
        if (!selectedBabyId) {
          Alert.alert('Select Baby', 'Select one baby in BabyLife before creating a moment.');
          return null;
        }
        const ok = await shareMomentToBaby(selectedBabyId, payload);
        if (!ok) {
          Alert.alert('Error', 'Failed to create baby moment');
          return null;
        }
        await loadBabyMoments();
      } else if (isOurLife) {
        if (groups.length === 0) {
          await addMoment(payload);
        } else {
          if (selectedShareGroupIds.length === 0) {
            Alert.alert('Select Group', 'Choose at least one group in Share to groups.');
            return null;
          }
          await Promise.all(selectedShareGroupIds.map((groupId) => addGroupMoment(groupId, payload)));
          if (selectedShareGroupIds.length === 1) {
            setSelectedOurLifeGroupId(selectedShareGroupIds[0]);
          } else {
            setSelectedOurLifeGroupId(null);
          }
        }
      } else {
        await addMoment(payload);
        if (selectedShareGroupIds.length > 0) {
          await Promise.all(selectedShareGroupIds.map((groupId) => addGroupMoment(groupId, payload)));
        }
        if (selectedShareBabyIds.length > 0) {
          await Promise.all(selectedShareBabyIds.map((babyId) => shareMomentToBaby(babyId, payload)));
          await loadBabyMoments();
        }
      }
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
      setEditingMomentId(null);
      resetNewMomentForm();
      setNewMomentOpen(false);
    }
  };

  const handleSaveEditedMoment = async () => {
    if (!isMyLife) {
      Alert.alert('Read Only', 'Editing is only available in MyLife.');
      return;
    }
    if (!editingMomentId || !editingMoment) return;
    const desc = descriptionInput.trim();
    if (!desc) {
      Alert.alert('Missing Description', 'Please add a description before saving this moment.');
      return;
    }

    const startTs = parseDateTime(startDateInput, startTimeInput);
    if (!startTs) {
      Alert.alert('Invalid Start', 'Use date MM/DD/YYYY and time hh:mm AM/PM.');
      return;
    }

    let endTs: number | undefined;
    const hasEndDate = !!endDateInput.trim();
    const hasEndTime = !!endTimeInput.trim();
    if (hasEndDate !== hasEndTime) {
      Alert.alert('Invalid End', 'Please choose both End Date and End Time.');
      return;
    }
    if (hasEndDate && hasEndTime) {
      const parsedEnd = parseDateTime(endDateInput, endTimeInput);
      if (!parsedEnd || parsedEnd < startTs) {
        Alert.alert('Invalid End', 'End cannot be before Start.');
        return;
      }
      endTs = parsedEnd;
    }

    setSavingMoment(true);
    try {
      const updater = editingMoment.groupId ? updateGroupMoment : updateMoment;
      const primaryPhoto = photos.length > 0 ? photos[0] : null;
      await updater(editingMomentId, {
        timestamp: startTs,
        endTime: endTs,
        description: desc,
        people: people.join(', '),
        location: locationInput.trim(),
        category,
        memorable,
        photo: primaryPhoto || undefined,
        photos: photos.length > 0 ? photos : undefined,
      });
      setCenterTime(startTs);
      setEditingMomentId(null);
      resetNewMomentForm();
      setNewMomentOpen(false);
    } finally {
      setSavingMoment(false);
    }
  };

  const handleAutosaveAndClose = async () => {
    if (isEditingMoment) {
      setEditingMomentId(null);
      resetNewMomentForm();
      setNewMomentOpen(false);
      return;
    }
    if (descriptionInput.trim()) {
      const ok = await saveMoment();
      if (!ok) return;
    }
    resetNewMomentForm();
    setNewMomentOpen(false);
  };

  const handleDiscardMoment = () => {
    setEditingMomentId(null);
    resetNewMomentForm();
    setNewMomentOpen(false);
  };

  const handleDeleteEditedMoment = () => {
    if (!isMyLife) {
      Alert.alert('Read Only', 'Deleting is only available in MyLife.');
      return;
    }
    if (!editingMomentId) return;
    Alert.alert('Delete Moment', 'Are you sure you want to delete this moment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const deleter = editingMoment?.groupId ? deleteGroupMoment : deleteMoment;
          await deleter(editingMomentId);
          setEditingMomentId(null);
          resetNewMomentForm();
          setNewMomentOpen(false);
        },
      },
    ]);
  };

  const handleAddPerson = () => {
    const next = peopleInput.trim();
    if (!next) return;
    if (!people.includes(next)) setPeople((prev) => [...prev, next]);
    setPeopleInput('');
  };

  const handleAddToCircle = async (targetUser: { userId: string; username: string }) => {
    if (addingUserId) return;
    setAddingUserId(targetUser.userId);
    try {
      const { error: addErr } = await addConnection(targetUser.userId);
      if (addErr) {
        Alert.alert('Could not add to circle', addErr);
        return;
      }
      Alert.alert('Done', `${targetUser.username} was added to your circle.`);
      setMyCircleSearch('');
      clearSearchResults();
    } finally {
      setAddingUserId(null);
    }
  };

  const handleCreateGroupFromSearch = async () => {
    Alert.alert('Create Group', 'Use the "+ New Group" button to create a group.');
  };

  const handleCloseMyCircle = () => {
    setMyCircleOpen(false);
    setMyCircleSearch('');
    clearSearchResults();
    setCreatingGroup(false);
    setNewGroupName('');
    setSelectedGroupMemberIds([]);
    setExpandedGroupId(null);
    setGroupMembers([]);
    setColorPickerGroupId(null);
  };

  const toggleShareGroup = (groupId: string) => {
    setSelectedShareGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const toggleShareBaby = (babyId: string) => {
    setSelectedShareBabyIds((prev) =>
      prev.includes(babyId) ? prev.filter((id) => id !== babyId) : [...prev, babyId]
    );
  };

  const handleNotificationRead = async (notification: Notification) => {
    await markAsRead(notification.id);
    if (notification.type !== 'moment_shared') return;
    const data = (notification.data || {}) as Record<string, unknown>;
    const momentId = typeof data.moment_id === 'string' ? data.moment_id : undefined;
    const groupId = typeof data.group_id === 'string' ? data.group_id : undefined;
    if (!momentId || !groupId) return;

    await loadGroupMoments();
    setSelectedOurLifeGroupId(groupId);
    setActiveTimeline(OURLIFE_TIMELINE_ID);
    const latest = useMomentsStore.getState().groupMoments;
    const target = latest.find((m) => m.id === momentId);
    if (target) {
      setCenterTime(target.timestamp);
    }
    setNotificationsOpen(false);
  };

  useEffect(() => {
    const loadThumbs = async () => {
      const urisToLoad = new Set<string>();
      visibleMoments.forEach((moment) => {
        const mediaItems = moment.photos?.length
          ? moment.photos
          : moment.photo
            ? [moment.photo]
            : [];
        if (mediaItems.length === 0) return;
        const first = mediaItems[0];
        if (first && isVideoUri(first) && !videoThumbs[first]) {
          urisToLoad.add(first);
        }
      });

      for (const uri of urisToLoad) {
        await ensureVideoThumb(uri);
      }
    };

    loadThumbs();
  }, [visibleMoments]);

  const openMediaViewer = (photos: string[], startIndex: number) => {
    if (!photos.length) return;
    setMediaViewerPhotos(photos);
    setMediaViewerIndex(Math.max(0, Math.min(startIndex, photos.length - 1)));
    setMediaViewerOpen(true);
  };

  const handleCreateGroupFromName = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    try {
      const group = await createGroup(name, selectedGroupMemberIds);
      if (!group) {
        Alert.alert('Error', 'Failed to create group');
        return;
      }
      setNewGroupName('');
      setCreatingGroup(false);
      setSelectedGroupMemberIds([]);
      await handleExpandGroup(group.id);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group');
    }
  };

  const handleExpandGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    setExpandedGroupId(groupId);
    setLoadingGroupMembers(true);
    try {
      const members = await getGroupMembers(groupId);
      setGroupMembers(members);
    } finally {
      setLoadingGroupMembers(false);
    }
    await loadGroupInviteCode(groupId);
  };

  const loadGroupInviteCode = async (groupId: string) => {
    if (!user?.id) return;
    setLoadingInviteGroupId(groupId);
    try {
      const { data, error } = await supabase
        .from('group_invite_codes')
        .select('id, code, created_at')
        .eq('group_id', groupId)
        .eq('inviter_user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setInviteCodes((prev) => ({
        ...prev,
        [groupId]: data
          ? { id: data.id, code: data.code, createdAt: data.created_at }
          : null,
      }));
    } catch (error) {
      console.error('Error loading group invite code:', error);
    } finally {
      setLoadingInviteGroupId(null);
    }
  };

  const generateGroupInviteCode = async (groupId: string) => {
    if (!user?.id) return;
    setGeneratingInviteGroupId(groupId);
    try {
      const code = nanoid(10);
      const { data, error } = await supabase
        .from('group_invite_codes')
        .insert({
          code,
          group_id: groupId,
          inviter_user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      setInviteCodes((prev) => ({
        ...prev,
        [groupId]: { id: data.id, code: data.code, createdAt: data.created_at },
      }));
      Alert.alert('Invite link generated');
    } catch (error) {
      console.error('Error generating group invite code:', error);
      Alert.alert('Error', 'Failed to generate invite link');
    } finally {
      setGeneratingInviteGroupId(null);
    }
  };

  const deleteGroupInviteCode = async (groupId: string) => {
    const invite = inviteCodes[groupId];
    if (!invite) return;
    setDeletingInviteGroupId(groupId);
    try {
      const { error } = await supabase
        .from('group_invite_codes')
        .delete()
        .eq('id', invite.id);
      if (error) throw error;
      setInviteCodes((prev) => ({ ...prev, [groupId]: null }));
      Alert.alert('Invite link deleted');
    } catch (error) {
      console.error('Error deleting group invite code:', error);
      Alert.alert('Error', 'Failed to delete invite link');
    } finally {
      setDeletingInviteGroupId(null);
    }
  };

  const copyGroupInviteLink = async (groupId: string) => {
    const invite = inviteCodes[groupId];
    if (!invite) return;
    const inviteLink = `${WEB_BASE_URL}/auth?group_invite=${invite.code}`;
    Clipboard.setString(inviteLink);
    setCopiedInviteGroupId(groupId);
    Alert.alert('Copied', 'Invite link copied');
    setTimeout(() => {
      setCopiedInviteGroupId((current) => (current === groupId ? null : current));
    }, 2000);
  };

  const shareGroupInviteLink = async (groupId: string) => {
    const invite = inviteCodes[groupId];
    if (!invite) return;
    const inviteLink = `${WEB_BASE_URL}/auth?group_invite=${invite.code}`;
    try {
      await Share.share({
        message: inviteLink,
      });
    } catch (error) {
      console.error('Error sharing invite link:', error);
      Alert.alert('Error', 'Failed to share invite link');
    }
  };

  const ensureVideoThumb = async (uri: string) => {
    if (videoThumbs[uri]) return;
    try {
      const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, { time: 1000 });
      setVideoThumbs((prev) => (prev[uri] ? prev : { ...prev, [uri]: thumbUri }));
    } catch {
      // ignore thumbnail failures
    }
  };

  const handlePickPhoto = async (fromCamera: boolean) => {
    try {
      const showPermissionAlert = (title: string, message: string) => {
        Alert.alert(title, message, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings().catch((err) => {
                console.error('Error opening settings:', err);
              });
            },
          },
        ]);
      };

      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          showPermissionAlert(
            'Camera permission needed',
            'Please allow camera access in Settings to capture photos or videos.'
          );
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          showPermissionAlert(
            'Gallery permission needed',
            'Please allow photo library access in Settings to choose media.'
          );
          return;
        }
      }

      const mediaTypes =
        (ImagePicker as any).MediaType?.Images && (ImagePicker as any).MediaType?.Videos
          ? [(ImagePicker as any).MediaType.Images, (ImagePicker as any).MediaType.Videos]
          : ImagePicker.MediaTypeOptions.All;

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({ mediaTypes, quality: keepOriginalSize ? 1 : 0.7 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes,
            quality: keepOriginalSize ? 1 : 0.7,
            allowsMultipleSelection: true,
            selectionLimit: 10,
          });

      if (!result.canceled && result.assets?.length) {
        const newUris = result.assets.map((asset) => asset.uri).filter(Boolean);
        if (newUris.length > 0) {
          setPhotos((prev) => [...prev, ...newUris]);
          result.assets.forEach((asset) => {
            const uri = asset.uri;
            if (uri && isVideoUri(uri)) {
              ensureVideoThumb(uri);
            }
          });
        }
      }
    } catch (error) {
      console.error('Error selecting media:', error);
      Alert.alert(
        fromCamera ? 'Camera unavailable' : 'Unable to open gallery',
        fromCamera
          ? 'Could not open camera. If you are on a simulator, test on a real device.'
          : 'Could not open your media library.'
      );
    }
  };

  const handleClearPhotos = () => {
    setPhotos([]);
  };

  const isVideoUri = (uri?: string | null) => {
    if (!uri) return false;
    const normalized = uri.split('?')[0].toLowerCase();
    return ['.mp4', '.mov', '.m4v', '.webm', '.avi', '.mkv'].some((ext) => normalized.endsWith(ext));
  };

  const handleOpenNewMoment = () => {
    if (!isMyLife && !isOurLife && !isBabyLife) {
      Alert.alert('Read Only', 'Creating moments is only available in MyLife, OurLife, and BabyLife.');
      return;
    }
    if (isBabyLife && !selectedBabyId) {
      Alert.alert('No Baby Selected', 'Add or select a baby first in BabyLife.');
      return;
    }
    const now = new Date();
    const baseCreateY = viewportHeight / 2 - 60;
    const adjustedCreateY = baseCreateY - timelineTopOffset;
    setEditingMomentId(null);
    setStartDateInput(format(now, 'MM/dd/yyyy'));
    setStartTimeInput(format(now, 'hh:mm a'));
    setEndDatePickerOpen(false);
    setEndTimePickerOpen(false);
    setEndPickerMonth(now);
    setSelectedShareGroupIds(isOurLife && groups[0] ? [groups[0].id] : []);
    setCreateMomentY(adjustedCreateY);
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
  const futureStartX = Math.max(0, Math.min(viewportWidth, nowX + 2));
  const showFutureHint = futureStartX < viewportWidth - 24;
  const centerDate = new Date(centerTime);
  const dateLabel = format(centerDate, 'EEEE, MMM d, yyyy');
  const timelineY = 60;
  const getBabyAgeLabel = (birthDate: Date, referenceTimeMs: number) => {
    const reference = new Date(referenceTimeMs);
    const diffMs = Math.max(0, reference.getTime() - birthDate.getTime());
    const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    const totalMonths = Math.max(0, Math.floor(totalDays / 30.4375));
    const yearsDecimal = (totalDays / 365.25).toFixed(2);
    const short = totalDays < 90 ? `Day ${totalDays}` : `Month ${totalMonths}`;
    return {
      detail: short,
      short,
      yearsDecimal: `${yearsDecimal}y`,
    };
  };
  const babyGuideRows = babies.map((baby) => ({
    id: baby.id,
    name: baby.name,
    centerAge: getBabyAgeLabel(baby.dateOfBirth, centerTime),
    nowAge: getBabyAgeLabel(baby.dateOfBirth, Date.now()),
  }));
  const visibleMoments = activeMoments.filter((moment) => {
    const inRange =
      moment.timestamp >= startTime - visibleTimeRange * 0.1 &&
      moment.timestamp <= endTime + visibleTimeRange * 0.1;
    const passesZoomRule =
      isWeekLevel || isMonthLevel || isYearLevel ? moment.memorable === true : true;

    if (isMyLife) {
      if (moment.groupId) {
        return inRange && passesZoomRule;
      }
      const inTimeline =
        moment.timelineId === DEFAULT_TIMELINE_ID ||
        (!!userTimelineId && moment.timelineId === userTimelineId);
      return inTimeline && inRange && passesZoomRule;
    }

    return inRange && passesZoomRule;
  });
  const orderIndex = new Map(momentOrder.map((id, idx) => [id, idx]));
  const orderedVisibleMoments = [...visibleMoments].sort((a, b) => {
    const aIdx = orderIndex.get(a.id);
    const bIdx = orderIndex.get(b.id);
    if (aIdx === undefined && bIdx === undefined) return 0;
    if (aIdx === undefined) return -1;
    if (bIdx === undefined) return 1;
    return aIdx - bIdx;
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
  const timelineTopOffset = Math.max(0, (timelineWrapperHeight - 120) / 2);

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

  const endMomentDrag = (moment: (typeof activeMoments)[number], releasePageY?: number) => {
    const momentId = moment.id;
    const start = dragCardStartRef.current;
    const safeMomentY = typeof moment.y === 'number' && Number.isFinite(moment.y) ? moment.y : 70;
    const finalY = dragMomentCurrentYRef.current[momentId] ?? safeMomentY;
    const movedDistance = start
      ? Math.abs((releasePageY ?? start.pageY) - start.pageY)
      : Math.abs(finalY - safeMomentY);

    if (movedDistance < 6) {
      openEditMoment(moment);
    } else {
      if (isMyLife) {
        if (moment.groupId) {
          updateGroupMomentY(momentId, finalY);
        } else {
          updateMomentY(momentId, finalY);
        }
      } else if (isOurLife) {
        updateGroupMomentY(momentId, finalY);
      } else if (isBabyLife) {
        updateBabyMomentY(momentId, finalY);
      }
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
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>fractalito</Text>
          <TouchableOpacity style={styles.notificationsButton} onPress={() => setNotificationsOpen(true)} activeOpacity={0.85}>
            <Image
              source={require('../../../assets/bell.webp')}
              style={styles.notificationsIconImage}
              resizeMode="contain"
            />
            {unreadCount > 0 && (
              <View style={styles.notificationsBadge}>
                <Text style={styles.notificationsBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.myCircleButton} onPress={() => setMyCircleOpen(true)} activeOpacity={0.85}>
            <Text style={styles.myCircleText}>
              <Text style={styles.headerEmoji}>{'\uD83D\uDC65 '}</Text>
              My Circle
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.myProfileButton}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.myProfileText}>
              <Text style={styles.headerEmoji}>{'\uD83D\uDC64 '}</Text>
              My Profile
            </Text>
          </TouchableOpacity>
        </View>
      </View>


      <Modal visible={notificationsOpen} transparent animationType="fade" onRequestClose={() => setNotificationsOpen(false)}>
        <Pressable style={styles.newMomentOverlay} onPress={() => setNotificationsOpen(false)}>
          <View />
        </Pressable>
        <View style={styles.notificationsContainer}>
          <View style={styles.notificationsCard}>
            <View style={styles.notificationsHeader}>
              <Text style={styles.notificationsTitle}>Notifications</Text>
              <View style={styles.notificationsHeaderActions}>
                <TouchableOpacity
                  style={styles.notificationsMarkAll}
                  onPress={() => markAllAsRead()}
                  disabled={notifications.length === 0}
                >
                  <Text style={styles.notificationsMarkAllText}>Mark all read</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setNotificationsOpen(false)}>
                  <Text style={styles.newMomentClose}>x</Text>
                </TouchableOpacity>
              </View>
            </View>

            {notificationsLoading ? (
              <ActivityIndicator size="small" color="#666" />
            ) : notifications.length === 0 ? (
              <Text style={styles.notificationsEmpty}>No notifications yet</Text>
            ) : (
              <ScrollView style={styles.notificationsList} contentContainerStyle={styles.notificationsListContent}>
                {notifications.map((notification) => (
                  <View
                    key={notification.id}
                    style={[
                      styles.notificationItem,
                      !notification.read && styles.notificationItemUnread,
                    ]}
                  >
                    <View style={styles.notificationTextWrap}>
                      <Text style={styles.notificationTitle}>{notification.title}</Text>
                      <Text style={styles.notificationMessage}>{notification.message}</Text>
                    </View>
                    <View style={styles.notificationActions}>
                      {!notification.read && (
                        <TouchableOpacity
                          style={styles.notificationActionButton}
                          onPress={() => handleNotificationRead(notification)}
                        >
                          <Text style={styles.notificationActionText}>Read</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.notificationDeleteButton}
                        onPress={() => deleteNotification(notification.id)}
                      >
                        <Text style={styles.notificationDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={mediaViewerOpen} transparent animationType="fade" onRequestClose={() => setMediaViewerOpen(false)}>
        <View style={styles.mediaViewerBackdrop}>
          <View style={[styles.mediaViewerHeader, { paddingTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => setMediaViewerOpen(false)}>
              <Text style={styles.mediaViewerClose}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: viewportWidth * mediaViewerIndex, y: 0 }}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / viewportWidth);
              setMediaViewerIndex(index);
            }}
            style={styles.mediaViewerScroll}
          >
            {mediaViewerPhotos.map((uri, idx) => (
              <View key={`${uri}-${idx}`} style={{ width: viewportWidth, height: viewportHeight }}>
                {isVideoUri(uri) ? (
                  <Video
                    source={{ uri }}
                    style={styles.mediaViewerVideo}
                    resizeMode={ResizeMode.CONTAIN}
                    useNativeControls
                  />
                ) : (
                  <Image source={{ uri }} style={styles.mediaViewerImage} resizeMode="contain" />
                )}
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={isMyLife ? styles.tabActive : styles.tab}
          onPress={() => setActiveTimeline(DEFAULT_TIMELINE_ID)}
        >
          <Text style={isMyLife ? styles.tabTextActive : styles.tabText}>MyLife</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={isOurLife ? styles.tabActive : styles.tab}
          onPress={() => setActiveTimeline(OURLIFE_TIMELINE_ID)}
        >
          <Text style={isOurLife ? styles.tabTextActive : styles.tabText}>OurLife</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={isBabyLife ? styles.tabActive : styles.tab}
          onPress={() => setActiveTimeline(BABYLIFE_TIMELINE_ID)}
        >
          <Text style={isBabyLife ? styles.tabTextActive : styles.tabText}>BabyLife</Text>
        </TouchableOpacity>
      </View>
      {/* Timeline Canvas */}
      <View style={styles.canvasContainer}>
        <View
          style={[styles.timelineWrapper, { transform: [{ translateY: scrollOffset }] }]}
          onLayout={(e) => setTimelineWrapperHeight(e.nativeEvent.layout.height)}
          onStartShouldSetResponder={() => false}
          onMoveShouldSetResponder={(e) => !draggingMomentIdRef.current && e.nativeEvent.touches.length >= 1}
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

            {showFutureHint && (
              <View pointerEvents="none" style={[styles.futureRangeHint, { left: futureStartX, width: viewportWidth - futureStartX }]}>
                <View style={styles.futureRangeLine} />
                <Text style={styles.futureRangeText}>Future</Text>
              </View>
            )}

            {nowVisible && (
              <View style={[styles.nowMarker, { left: nowX }]}>
                <Text style={styles.nowText}>Now</Text>
                <View style={styles.nowLine} />
              </View>
            )}
            {isBabyLife && babyGuideRows.length > 0 && (
              <View pointerEvents="none" style={styles.babyGuidesLayer}>
                {babyGuideRows.map((row, idx) => (
                  <View key={row.id} style={[styles.babyGuideRow, { top: idx * 54 }]}>
                    <View style={styles.babyGuideLine} />
                    <Text style={styles.babyGuideLeft}>{row.name}</Text>
                    <Text style={styles.babyGuideCenter}>{row.centerAge.yearsDecimal}</Text>
                    <Text style={styles.babyGuideRight}>{row.nowAge.short}</Text>
                  </View>
                ))}
              </View>
            )}

          </View>

          <View pointerEvents="box-none" style={styles.momentsLayer}>
            {orderedVisibleMoments.map((moment) => {
              const zIndex = orderIndex.get(moment.id) ?? 0;
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
              const safeMomentY = typeof moment.y === 'number' && Number.isFinite(moment.y) ? moment.y : 70;
              const cardTop = dragMomentYById[moment.id] ?? safeMomentY;
              const cardTopRender = cardTop + timelineTopOffset;
              const cardHeight = Math.max(56, moment.height ?? 56);
              const cardBottomRender = cardTopRender + cardHeight;
              const timelineYRender = timelineY + timelineTopOffset;
              const isAboveTimeline = cardBottomRender < timelineYRender;
              const curveStrength = Math.abs(timelineYRender - (isAboveTimeline ? cardBottomRender : cardTopRender)) * 0.4;
              const svgYOffset = viewportHeight;
              const curveStartY = (isAboveTimeline ? cardBottomRender : cardTopRender) + svgYOffset;
              const curveTimelineY = timelineYRender + svgYOffset;
              const ourLifeGroups = isOurLife
                ? (moment as any).sharedGroupIds ?? (moment.groupId ? [moment.groupId] : [])
                : [];
              const ourLifeGroupNames = isOurLife
                ? ourLifeGroups
                    .map((id: string) => groupNameById.get(id))
                    .filter((name: string | undefined): name is string => !!name)
                : [];

              return (
                <View key={moment.id}>
                  <Svg
                    pointerEvents="none"
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
                        top: cardTopRender,
                        width: cardWidth,
                        borderLeftColor: accentColor,
                        zIndex,
                      },
                    ]}
                    onStartShouldSetResponder={() => !suppressDragRef.current}
                    onMoveShouldSetResponder={() => !suppressDragRef.current}
                    onResponderTerminationRequest={() => false}
                    onResponderGrant={(e) => {
                      const pageY = e.nativeEvent.pageY ?? e.nativeEvent.touches?.[0]?.pageY;
                      if (typeof pageY === 'number') {
                        bringMomentToFront(moment.id);
                        startMomentDrag(moment.id, cardTop, pageY);
                        devLog('[Moment] touch start', { id: moment.id, y: cardTop, pageY });
                      }
                    }}
                    onResponderMove={(e) => {
                      const pageY = e.nativeEvent.pageY ?? e.nativeEvent.touches?.[0]?.pageY;
                      if (typeof pageY === 'number') {
                        moveMomentDrag(moment.id, pageY);
                        devLog('[Moment] touch move', { id: moment.id, pageY });
                      }
                    }}
                    onResponderRelease={(e) => {
                      const pageY = e.nativeEvent.pageY ?? e.nativeEvent.changedTouches?.[0]?.pageY;
                      devLog('[Moment] touch end', { id: moment.id, pageY });
                      endMomentDrag(moment, typeof pageY === 'number' ? pageY : undefined);
                    }}
                    onResponderTerminate={() => {
                      devLog('[Moment] touch terminate', { id: moment.id });
                      endMomentDrag(moment);
                    }}
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
                      {(() => {
                        const mediaItems = moment.photos?.length
                          ? moment.photos
                          : moment.photo
                            ? [moment.photo]
                            : [];
                        if (mediaItems.length === 0) return null;
                        const imagePhotos = mediaItems.filter((uri) => !isVideoUri(uri));
                        const hasVideo = mediaItems.some((uri) => isVideoUri(uri));
                        const renderThumb = (uri: string) => {
                          if (isVideoUri(uri)) {
                            const thumbUri = videoThumbs[uri];
                            return thumbUri ? (
                              <Image source={{ uri: thumbUri }} style={styles.momentThumb} resizeMode="cover" />
                            ) : (
                              <View style={styles.momentVideoThumb}>
                                <Text style={styles.momentVideoThumbText}>VID</Text>
                              </View>
                            );
                          }
                          return <Image source={{ uri }} style={styles.momentThumb} resizeMode="cover" />;
                        };
                        const frontUri = mediaItems[0];
                        const backUri = mediaItems.length > 1
                          ? (mediaItems[mediaItems.length - 1] === frontUri ? mediaItems[1] : mediaItems[mediaItems.length - 1])
                          : null;
                        const thumb = mediaItems.length > 1 && frontUri && backUri ? (
                          <View style={styles.momentThumbStack}>
                            <View style={styles.momentThumbBack}>{renderThumb(backUri)}</View>
                            {renderThumb(frontUri)}
                          </View>
                        ) : frontUri ? (
                          renderThumb(frontUri)
                        ) : null;
                        if (!thumb) return null;
                        return (
                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => openMediaViewer(mediaItems, 0)}
                            onPressIn={() => {
                              suppressDragRef.current = true;
                            }}
                            onPressOut={() => {
                              suppressDragRef.current = false;
                            }}
                          >
                            {thumb}
                            {hasVideo && (
                              <View style={styles.momentVideoBadge}>
                                <Text style={styles.momentVideoBadgeText}>VID</Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      })()}
                      
                    </View>
                    {moment.memorable && (
                      <View style={styles.momentBadge}>
                        <Text style={styles.momentBadgeText}>M</Text>
                      </View>
                    )}
                    {isOurLife && ourLifeGroupNames.length > 0 && (
                      <View style={styles.momentFooter}>
                        <View style={styles.momentChips}>
                          {ourLifeGroupNames.map((name) => (
                            <View key={`${moment.id}-${name}`} style={styles.momentChip}>
                              <Text style={styles.momentChipText} numberOfLines={1}>
                                {name}
                              </Text>
                            </View>
                          ))}
                        </View>
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

      <Modal visible={myCircleOpen} transparent animationType="fade" onRequestClose={handleCloseMyCircle}>
        <Pressable style={styles.newMomentOverlay} onPress={handleCloseMyCircle}>
          <View />
        </Pressable>
        <View style={styles.newMomentOverlayCard}>
          <View style={styles.myCircleCard}>
            <View style={styles.myCircleHeader}>
              <View>
                <Text style={styles.myCircleTitle}>My Circle</Text>
                <Text style={styles.myCircleSubtitle}>Manage your connections and groups</Text>
              </View>
              <TouchableOpacity onPress={handleCloseMyCircle}>
                <Text style={styles.newMomentClose}>x</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.myCircleScroll} contentContainerStyle={styles.myCircleScrollContent}>

            <View style={styles.myCircleSearchWrap}>
              <Text style={styles.myCircleSearchIcon}>⌕</Text>
              <TextInput
                style={styles.myCircleSearchInput}
                placeholder="Search by username..."
                placeholderTextColor="#7a8598"
                value={myCircleSearch}
                onChangeText={setMyCircleSearch}
              />
            </View>

            {myCircleSearch.trim().length > 0 && (
              <View style={styles.myCircleSearchResults}>
                {searchingConnections ? (
                  <Text style={styles.myCircleSearchState}>Searching...</Text>
                ) : searchResults.length === 0 ? (
                  <Text style={styles.myCircleSearchState}>No user found with that username.</Text>
                ) : (
                  searchResults.map((result) => (
                    <View key={result.userId} style={styles.myCircleSearchResultRow}>
                      <View style={styles.myCircleSearchResultLeft}>
                        <View style={styles.myCircleSearchAvatar}>
                          <Text style={styles.myCircleSearchAvatarText}>
                            {result.username.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.myCircleSearchUsername}>@{result.username}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.myCircleSearchAddBtn}
                        onPress={() => handleAddToCircle(result)}
                        disabled={addingUserId === result.userId}
                      >
                        <Text style={styles.myCircleSearchAddText}>
                          {addingUserId === result.userId ? '...' : 'Add'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            )}

            <Text style={styles.myCircleSectionLabel}>In your circle ({connections.length})</Text>
            {connections.length === 0 ? (
              <Text style={styles.myCircleEmptyText}>
                No connections yet. Search for users to add them to your circle.
              </Text>
            ) : (
              connections.slice(0, 3).map((connection) => (
                <View key={connection.id} style={styles.myCircleRow}>
                  <Text style={styles.myCircleRowDot}>●</Text>
                  <Text style={styles.myCircleRowText}>{connection.username}</Text>
                  <TouchableOpacity
                    style={styles.myCircleRemoveButton}
                    onPress={() => {
                      Alert.alert(
                        'Remove From Circle',
                        `Remove @${connection.username} from your circle?`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Remove',
                            style: 'destructive',
                            onPress: async () => {
                              const { error } = await removeConnection(connection.id);
                              if (error) {
                                Alert.alert('Error', error);
                              }
                            },
                          },
                        ]
                      );
                    }}
                  >
                    <Text style={styles.myCircleRemoveText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.myCircleDivider} />

            <View style={styles.myCircleSectionHeader}>
              <Text style={styles.myCircleSectionLabel}>Groups ({groups.length})</Text>
              {!creatingGroup && (
                <TouchableOpacity style={styles.myCircleActionButton} onPress={() => setCreatingGroup(true)}>
                  <Text style={styles.myCircleActionButtonText}>+ New Group</Text>
                </TouchableOpacity>
              )}
            </View>
            {creatingGroup && (
              <View style={styles.myCircleCreateGroupCard}>
                <TextInput
                  style={styles.myCircleCreateInput}
                  placeholder="Group name..."
                  placeholderTextColor="#7a8598"
                  value={newGroupName}
                  onChangeText={setNewGroupName}
                />
                {connections.length > 0 && (
                  <View style={styles.myCircleCreateMembers}>
                    <Text style={styles.myCircleCreateMembersLabel}>Add members from your circle:</Text>
                    <View style={styles.myCircleCreateMembersList}>
                      {connections.map((connection) => {
                        const isSelected = selectedGroupMemberIds.includes(connection.connectedUserId);
                        return (
                          <TouchableOpacity
                            key={connection.id}
                            style={[
                              styles.myCircleCreateMemberChip,
                              isSelected && styles.myCircleCreateMemberChipActive,
                            ]}
                            onPress={() => {
                              setSelectedGroupMemberIds((prev) =>
                                prev.includes(connection.connectedUserId)
                                  ? prev.filter((id) => id !== connection.connectedUserId)
                                  : [...prev, connection.connectedUserId]
                              );
                            }}
                          >
                            <Text
                              style={[
                                styles.myCircleCreateMemberChipText,
                                isSelected && styles.myCircleCreateMemberChipTextActive,
                              ]}
                            >
                              @{connection.username}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}
                <View style={styles.myCircleCreateActions}>
                  <TouchableOpacity
                    style={[styles.myCircleCreateButton, !newGroupName.trim() && styles.myCircleCreateButtonDisabled]}
                    onPress={handleCreateGroupFromName}
                    disabled={!newGroupName.trim()}
                  >
                    <Text style={styles.myCircleCreateButtonText}>Create Group</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.myCircleCreateCancelButton}
                    onPress={() => {
                      setCreatingGroup(false);
                      setNewGroupName('');
                    }}
                  >
                    <Text style={styles.myCircleCreateCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {groups.length === 0 ? (
              <Text style={styles.myCircleEmptyText}>
                No groups yet. Create one to start sharing moments!
              </Text>
            ) : (
              groups.map((group) => {
                const isExpanded = expandedGroupId === group.id;
                const invite = inviteCodes[group.id] || null;
                return (
                  <View key={group.id} style={styles.myCircleGroupCard}>
                    <TouchableOpacity
                      style={styles.myCircleGroupHeader}
                      onPress={() => handleExpandGroup(group.id)}
                      activeOpacity={0.85}
                    >
                      <View style={styles.myCircleGroupLeft}>
                        <View
                          style={[
                            styles.myCircleGroupDot,
                            { backgroundColor: group.color || DEFAULT_GROUP_COLOR },
                          ]}
                        />
                        <Text style={styles.myCircleGroupChevron}>{isExpanded ? 'v' : '>'}</Text>
                        <Text style={styles.myCircleGroupName}>{group.name}</Text>
                        <Text style={styles.myCircleGroupMeta}>
                          {group.memberCount || 0} member{(group.memberCount || 0) === 1 ? '' : 's'}
                        </Text>
                      </View>
                      <View style={styles.myCircleGroupActions}>
                        <TouchableOpacity
                          style={styles.myCircleGroupActionButton}
                          onPress={() =>
                            setColorPickerGroupId((current) => (current === group.id ? null : group.id))
                          }
                        >
                          <Text style={styles.myCircleGroupActionText}>🎨</Text>
                        </TouchableOpacity>
                        {group.createdBy === user?.id && (
                          <TouchableOpacity
                            style={styles.myCircleGroupActionButton}
                            onPress={() => {
                              Alert.alert(
                                'Delete Group',
                                'Are you sure you want to delete this group? This is a temporary action.',
                                [
                                  { text: 'Cancel', style: 'cancel' },
                                  {
                                    text: 'Delete',
                                    style: 'destructive',
                                    onPress: async () => {
                                      await deleteGroup(group.id);
                                      if (expandedGroupId === group.id) {
                                        setExpandedGroupId(null);
                                      }
                                    },
                                  },
                                ]
                              );
                            }}
                          >
                            <Text style={styles.myCircleGroupActionText}>🗑</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </TouchableOpacity>
                    {colorPickerGroupId === group.id && (
                      <View style={styles.myCircleColorPicker}>
                        {COLOR_PALETTE.map((color) => (
                          <TouchableOpacity
                            key={color}
                            style={[
                              styles.myCircleColorSwatch,
                              { backgroundColor: color },
                              group.color === color && styles.myCircleColorSwatchActive,
                            ]}
                            onPress={() => updateGroupColor(group.id, color)}
                          />
                        ))}
                        {group.color && (
                          <TouchableOpacity
                            style={styles.myCircleColorClear}
                            onPress={() => updateGroupColor(group.id, null)}
                          >
                            <Text style={styles.myCircleColorClearText}>Clear</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                    {isExpanded && (
                      <View style={styles.myCircleGroupExpanded}>
                        {loadingGroupMembers ? (
                          <ActivityIndicator size="small" color="#666" />
                        ) : (
                          <View>
                            {groupMembers.length === 0 ? (
                              <Text style={styles.myCircleEmptyText}>No members yet.</Text>
                            ) : (
                              groupMembers.map((member) => (
                                <View key={member.id} style={styles.myCircleMemberRow}>
                                  <View style={styles.myCircleMemberAvatar}>
                                    <Text style={styles.myCircleMemberAvatarText}>
                                      {(member.username || '?').charAt(0).toUpperCase()}
                                    </Text>
                                  </View>
                                  <Text style={styles.myCircleMemberText}>
                                    @{member.username || 'unknown'}
                                    {member.userId === user?.id ? ' (you)' : ''}
                                  </Text>
                                </View>
                              ))
                            )}
                          </View>
                        )}
                        <View style={styles.myCircleInviteSection}>
                          <Text style={styles.myCircleInviteLabel}>Invite others to join:</Text>
                          {loadingInviteGroupId === group.id ? (
                            <ActivityIndicator size="small" color="#666" />
                          ) : invite ? (
                            <View style={styles.myCircleInviteActions}>
                              <TouchableOpacity
                                style={styles.myCircleInviteButton}
                                onPress={() => copyGroupInviteLink(group.id)}
                              >
                                <Text style={styles.myCircleInviteButtonText}>
                                  {copiedInviteGroupId === group.id ? 'Copied!' : 'Copy Invite Link'}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.myCircleInviteShareButton}
                                onPress={() => shareGroupInviteLink(group.id)}
                              >
                                <Text style={styles.myCircleInviteShareText}>Share</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.myCircleInviteDeleteButton}
                                onPress={() => deleteGroupInviteCode(group.id)}
                                disabled={deletingInviteGroupId === group.id}
                              >
                                <Text style={styles.myCircleInviteDeleteText}>
                                  {deletingInviteGroupId === group.id ? '...' : 'Delete'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.myCircleInviteButton}
                              onPress={() => generateGroupInviteCode(group.id)}
                              disabled={generatingInviteGroupId === group.id}
                            >
                              <Text style={styles.myCircleInviteButtonText}>
                                {generatingInviteGroupId === group.id ? 'Generating...' : 'Generate Invite Link'}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <View style={styles.myCircleDivider} />

            <View style={styles.myCircleSectionHeader}>
              <Text style={styles.myCircleSectionLabel}>Babies</Text>
              <TouchableOpacity style={styles.myCircleActionButton} onPress={handleOpenAddBaby}>
                <Text style={styles.myCircleActionButtonText}>+ Add Baby</Text>
              </TouchableOpacity>
            </View>
            {babies.length === 0 ? (
              <Text style={styles.myCircleEmptyText}>Create a baby timeline to track their early years.</Text>
            ) : (
              <View style={styles.myCircleBabyList}>
                {babies.map((baby) => (
                  <View key={baby.id} style={styles.myCircleBabyCard}>
                    <View style={styles.myCircleBabyAvatar}>
                      <Text style={styles.myCircleBabyAvatarText}>{baby.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={styles.myCircleBabyInfo}>
                      <Text style={styles.myCircleBabyName}>{baby.name}</Text>
                      <Text style={styles.myCircleBabyMeta}>
                        @{baby.username} • {format(baby.dateOfBirth, 'MMM d, yyyy')}
                      </Text>
                    </View>
                    {baby.createdBy === user?.id && (
                      <View style={styles.myCircleBabyBadge}>
                        <Text style={styles.myCircleBabyBadgeText}>You</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={addBabyOpen} transparent animationType="fade" onRequestClose={() => setAddBabyOpen(false)}>
        <Pressable style={styles.newMomentOverlay} onPress={() => setAddBabyOpen(false)}>
          <View />
        </Pressable>
        <View style={styles.newMomentOverlayCard}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.newMomentKeyboard}>
            <View style={styles.newMomentCard}>
              <View style={styles.newMomentHeader}>
                <View>
                  <View style={styles.addBabyTitleRow}>
                    <Text style={styles.addBabyTitleIcon}>👶</Text>
                    <Text style={styles.newMomentTitle}>Add Baby</Text>
                  </View>
                  <Text style={styles.myCircleSubtitle}>Create a dedicated timeline for your baby's first 3 years.</Text>
                </View>
                <TouchableOpacity onPress={() => setAddBabyOpen(false)}>
                  <Text style={styles.newMomentClose}>x</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.newMomentScroll} contentContainerStyle={styles.newMomentBody} showsVerticalScrollIndicator>
                <Text style={styles.newMomentLabel}>Name *</Text>
                <TextInput
                  style={styles.newMomentInput}
                  placeholder="Baby's name"
                  placeholderTextColor="#7e8a9d"
                  value={babyNameInput}
                  onChangeText={setBabyNameInput}
                />

                <Text style={styles.newMomentLabel}>Username *</Text>
                <TextInput
                  style={styles.newMomentInput}
                  placeholder="unique_username"
                  placeholderTextColor="#7e8a9d"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={babyUsernameInput}
                  onChangeText={setBabyUsernameInput}
                />
                <Text style={styles.addBabyHint}>Reserved for this baby's future account</Text>

                <Text style={styles.newMomentLabel}>Date of Birth *</Text>
                <TouchableOpacity
                  style={[styles.newMomentInput, styles.newMomentPickerField]}
                  onPress={() => {
                    setBabyTimePickerOpen(false);
                    setBabyDatePickerOpen((prev) => !prev);
                  }}
                >
                  <Text style={babyDateOfBirthInput ? styles.newMomentPickerValue : styles.newMomentPickerPlaceholder}>
                    {babyDateOfBirthInput || 'mm/dd/yyyy'}
                  </Text>
                  <Text style={styles.newMomentPickerIcon}>📅</Text>
                </TouchableOpacity>
                {babyDatePickerOpen && (
                  <View style={styles.endPickerInline}>
                    <View style={styles.endPickerHeader}>
                      <Text style={styles.endPickerTitle} numberOfLines={1} allowFontScaling={false}>
                        {format(babyPickerMonth, 'MMMM yyyy')}
                      </Text>
                      <View style={styles.endPickerHeaderActions}>
                        <TouchableOpacity onPress={() => setBabyPickerMonth((m) => subMonths(m, 1))} style={styles.endPickerNavBtn}>
                          <Text style={styles.endPickerNavText} allowFontScaling={false}>↑</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setBabyPickerMonth((m) => addMonths(m, 1))} style={styles.endPickerNavBtn}>
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
                      {babyCalendarWeeks.map((week, idx) => (
                        <View key={`baby-w-inline-${idx}`} style={styles.endPickerWeek}>
                          {week.map((day) => {
                            const selected = (() => {
                              if (!babyDateOfBirthInput) return false;
                              const parts = babyDateOfBirthInput.split('/');
                              if (parts.length !== 3) return false;
                              const parsed = new Date(Number(parts[2]), Number(parts[0]) - 1, Number(parts[1]));
                              return isSameDay(day, parsed);
                            })();
                            const inCurrentMonth = isSameMonth(day, babyPickerMonth);
                            return (
                              <TouchableOpacity
                                key={`baby-inline-${day.toISOString()}`}
                                style={[styles.endPickerDayCell, selected && styles.endPickerDayCellSelected]}
                                onPress={() => {
                                  setBabyDateOfBirthInput(format(day, 'MM/dd/yyyy'));
                                  setBabyDatePickerOpen(false);
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
                      <TouchableOpacity onPress={() => setBabyDateOfBirthInput('')}>
                        <Text style={styles.endPickerFooterLink} allowFontScaling={false}>Clear</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        const now = new Date();
                        setBabyDateOfBirthInput(format(now, 'MM/dd/yyyy'));
                        setBabyPickerMonth(now);
                      }}>
                        <Text style={styles.endPickerFooterLink} allowFontScaling={false}>Today</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <Text style={styles.newMomentLabel}>Time of Birth (optional)</Text>
                <TouchableOpacity
                  style={[styles.newMomentInput, styles.newMomentPickerField]}
                  onPress={() => {
                    setBabyDatePickerOpen(false);
                    setBabyTimePickerOpen((prev) => !prev);
                  }}
                >
                  <Text style={babyTimeOfBirthInput ? styles.newMomentPickerValue : styles.newMomentPickerPlaceholder}>
                    {babyTimeOfBirthInput || '--:-- --'}
                  </Text>
                  <Text style={styles.newMomentPickerIcon}>🕒</Text>
                </TouchableOpacity>
                {babyTimePickerOpen && (
                  <View style={styles.endTimeInline}>
                    <View style={styles.endTimeColumns}>
                      <ScrollView style={styles.endTimeCol} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => (
                          <TouchableOpacity
                            key={`baby-h-inline-${hour}`}
                            style={[styles.endTimeOption, babyPickerHour === hour && styles.endTimeOptionActive]}
                            onPress={() => applyBabyTime(hour, babyPickerMinute, babyPickerPeriod)}
                          >
                            <Text style={[styles.endTimeOptionText, babyPickerHour === hour && styles.endTimeOptionTextActive]}>
                              {hour.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <ScrollView style={styles.endTimeCol} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 60 }, (_, i) => i).map((minute) => (
                          <TouchableOpacity
                            key={`baby-m-inline-${minute}`}
                            style={[styles.endTimeOption, babyPickerMinute === minute && styles.endTimeOptionActive]}
                            onPress={() => applyBabyTime(babyPickerHour, minute, babyPickerPeriod)}
                          >
                            <Text style={[styles.endTimeOptionText, babyPickerMinute === minute && styles.endTimeOptionTextActive]}>
                              {minute.toString().padStart(2, '0')}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                      <View style={styles.endPeriodCol}>
                        {(['AM', 'PM'] as const).map((period) => (
                          <TouchableOpacity
                            key={`baby-p-inline-${period}`}
                            style={[styles.endTimeOption, babyPickerPeriod === period && styles.endTimeOptionActive]}
                            onPress={() => applyBabyTime(babyPickerHour, babyPickerMinute, period)}
                          >
                            <Text style={[styles.endTimeOptionText, babyPickerPeriod === period && styles.endTimeOptionTextActive]}>
                              {period}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </View>
                )}

                <Text style={styles.newMomentLabel}>Place of Birth (optional)</Text>
                <TextInput
                  style={styles.newMomentInput}
                  placeholder="City, Hospital..."
                  placeholderTextColor="#7e8a9d"
                  value={babyPlaceOfBirthInput}
                  onChangeText={setBabyPlaceOfBirthInput}
                />

                <TouchableOpacity
                  style={styles.newMomentCreateBtn}
                  onPress={handleCreateBaby}
                  disabled={creatingBaby}
                >
                  <Text style={styles.newMomentCreateText}>
                    {creatingBaby ? 'Creating...' : 'Create Baby Timeline'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* New Moment modal */}
      <Modal visible={newMomentOpen} transparent animationType="fade" onRequestClose={handleDiscardMoment}>
        <Pressable style={styles.newMomentOverlay} onPress={handleDiscardMoment}>
          <View />
        </Pressable>
        <View style={styles.newMomentOverlayCard}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.newMomentKeyboard}>
            <View style={styles.newMomentCard}>
              <View style={styles.newMomentHeader}>
                <Text style={styles.newMomentTitle}>{isEditingMoment ? 'Edit Moment' : 'New Moment'}</Text>
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
                                const disabled = isEndDateBeforeStart(day);
                                return (
                                  <TouchableOpacity
                                    key={`inline-${day.toISOString()}`}
                                    style={[
                                      styles.endPickerDayCell,
                                      selected && styles.endPickerDayCellSelected,
                                      disabled && styles.endPickerDayCellDisabled,
                                    ]}
                                    onPress={() => {
                                      if (disabled) return;
                                      setEndDateInput(format(day, 'MM/dd/yyyy'));
                                      setEndDatePickerOpen(false);
                                    }}
                                    disabled={disabled}
                                  >
                                    <Text
                                      style={[
                                        styles.endPickerDayText,
                                        !inCurrentMonth && styles.endPickerDayTextMuted,
                                        selected && styles.endPickerDayTextSelected,
                                        disabled && styles.endPickerDayTextDisabled,
                                      ]}
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
                            const nextDate = minEndDate && startOfDay(now).getTime() < startOfDay(minEndDate).getTime()
                              ? minEndDate
                              : now;
                            setEndDateInput(format(nextDate, 'MM/dd/yyyy'));
                            setEndPickerMonth(nextDate);
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
                        <View style={styles.endTimeActions}>
                          <TouchableOpacity
                            style={styles.endTimeSaveButton}
                            onPress={() => {
                              applyEndTime(endPickerHour, endPickerMinute, endPickerPeriod);
                              setEndTimePickerOpen(false);
                            }}
                          >
                            <Text style={styles.endTimeSaveText}>Save</Text>
                          </TouchableOpacity>
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

                <Text style={styles.newMomentLabel}>Media</Text>
                <View style={styles.newMomentPhotoRow}>
                  <TouchableOpacity style={styles.newMomentPhotoBtn} onPress={() => handlePickPhoto(true)}>
                    <Text style={styles.newMomentPhotoText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.newMomentPhotoBtn} onPress={() => handlePickPhoto(false)}>
                    <Text style={styles.newMomentPhotoText}>Gallery</Text>
                  </TouchableOpacity>
                </View>
                {photos.length > 0 && (
                  <View style={styles.newMomentPhotoChosenRow}>
                    <Text style={styles.newMomentPhotoChosen}>Media selected: {photos.length}</Text>
                    <TouchableOpacity onPress={handleClearPhotos}>
                      <Text style={styles.newMomentPhotoClear}>Clear</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.newMomentKeepSize}>
                  <View>
                    <Text style={styles.newMomentKeepTitle}>Keep original size</Text>
                    <Text style={styles.newMomentKeepSub}>Higher quality</Text>
                  </View>
                  <Switch value={keepOriginalSize} onValueChange={setKeepOriginalSize} />
                </View>

                {!isEditingMoment && (
                  <View style={styles.shareGroupsSection}>
                <Text style={styles.newMomentLabel}>Share to groups</Text>
                {groups.length === 0 ? (
                  <Text style={styles.shareGroupsEmptyText}>No groups yet. Create one in My Circle.</Text>
                ) : (
                  groups.map((group) => {
                    const selected = selectedShareGroupIds.includes(group.id);
                    return (
                      <TouchableOpacity
                        key={group.id}
                        style={styles.shareGroupRow}
                        onPress={() => toggleShareGroup(group.id)}
                      >
                        <View style={[styles.shareGroupCheckbox, selected && styles.shareGroupCheckboxActive]}>
                          {selected && <Text style={styles.shareGroupCheckmark}>✓</Text>}
                        </View>
                        <Text style={styles.shareGroupName}>{group.name}</Text>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>
            )}
            <View style={styles.shareGroupsSection}>
              <Text style={styles.newMomentLabel}>Share to baby timeline</Text>
              {babies.length === 0 ? (
                <Text style={styles.shareGroupsEmptyText}>No babies yet. Add one in My Circle.</Text>
              ) : (
                babies.map((baby) => {
                  const selected = selectedShareBabyIds.includes(baby.id);
                  return (
                    <TouchableOpacity
                      key={baby.id}
                      style={styles.shareGroupRow}
                      onPress={() => toggleShareBaby(baby.id)}
                    >
                      <View style={[styles.shareGroupCheckbox, selected && styles.shareGroupCheckboxActive]}>
                        {selected && <Text style={styles.shareGroupCheckmark}>✓</Text>}
                      </View>
                      <Text style={styles.shareGroupName}>{baby.name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
                {isEditingMoment && (
                  <TouchableOpacity style={styles.deleteMomentButton} onPress={handleDeleteEditedMoment}>
                    <Text style={styles.deleteMomentText}>Delete Moment</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
              <View style={styles.newMomentFooter}>
                <TouchableOpacity
                  style={[
                    styles.newMomentCreateBtn,
                    isMomentFormEligible && styles.newMomentCreateBtnActive,
                  ]}
                  onPress={isEditingMoment ? handleSaveEditedMoment : handleCreateMoment}
                  disabled={savingMoment}
                >
                  <Text style={styles.newMomentCreateText}>
                    {savingMoment ? (isEditingMoment ? 'Saving...' : 'Creating...') : (isEditingMoment ? 'Save Changes' : 'Create')}
                  </Text>
                </TouchableOpacity>
              </View>
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
	                  const disabled = isEndDateBeforeStart(day);
	                  return (
	                    <TouchableOpacity
	                      key={day.toISOString()}
	                      style={[
	                        styles.endPickerDayCell,
	                        selected && styles.endPickerDayCellSelected,
	                        disabled && styles.endPickerDayCellDisabled,
	                      ]}
	                      onPress={() => {
	                        if (disabled) return;
	                        setEndDateInput(format(day, 'MM/dd/yyyy'));
	                        setEndDatePickerOpen(false);
	                      }}
	                      disabled={disabled}
	                      accessibilityRole="button"
	                      accessibilityLabel={`Choose ${format(day, 'MMMM d, yyyy')}`}
	                    >
	                      <Text
	                        style={[
	                          styles.endPickerDayText,
	                          !inCurrentMonth && styles.endPickerDayTextMuted,
	                          selected && styles.endPickerDayTextSelected,
	                          disabled && styles.endPickerDayTextDisabled,
	                        ]}
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
            <TouchableOpacity onPress={() => setEndDateInput('')} accessibilityRole="button" accessibilityLabel="Clear end date">
              <Text style={styles.endPickerFooterLink}>Clear</Text>
            </TouchableOpacity>
            <TouchableOpacity
	              onPress={() => {
	                const now = new Date();
	                const nextDate = minEndDate && startOfDay(now).getTime() < startOfDay(minEndDate).getTime()
	                  ? minEndDate
	                  : now;
	                setEndDateInput(format(nextDate, 'MM/dd/yyyy'));
	                setEndPickerMonth(nextDate);
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
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#fafafa',
    borderBottomWidth: 0,
    borderBottomColor: 'transparent',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logo: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: '#111111',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationsButton: {
    height: 30,
    width: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationsIcon: {
    fontSize: 16,
  },
  notificationsIconImage: {
    width: 14,
    height: 14,
  },
  notificationsBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationsBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  myCircleButton: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#111111',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCircleText: {
    color: '#111111',
    fontSize: 12,
    fontWeight: '600',
  },
  myProfileButton: {
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myProfileText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  headerEmoji: {
    fontSize: 11,
  },
  tabs: {
    flexDirection: 'row',
    alignSelf: 'center',
    gap: 6,
    padding: 6,
    marginVertical: 12,
    backgroundColor: 'transparent',
    borderRadius: 999,
    borderWidth: 0,
    borderColor: 'transparent',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  tabActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#000000',
  },
  tabText: {
    fontSize: 14,
    color: '#6c778b',
    fontWeight: '600',
  },
  tabTextActive: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '700',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  timelineWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  momentsLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    overflow: 'visible',
    zIndex: 5,
  },
  timeline: {
    height: 120,
    backgroundColor: 'transparent',
    position: 'relative',
    overflow: 'visible',
    zIndex: 1,
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
  futureRangeHint: {
    position: 'absolute',
    top: 38,
    alignItems: 'flex-end',
  },
  futureRangeLine: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#9ca3af',
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  futureRangeText: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
    paddingRight: 4,
  },
  babyGuidesLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 108,
    pointerEvents: 'none',
  },
  babyGuideRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    justifyContent: 'center',
  },
  babyGuideLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#efb7c5',
  },
  babyGuideLeft: {
    position: 'absolute',
    left: '4%',
    top: -7,
    color: '#e5a5ba',
    fontSize: 12,
    fontWeight: '600',
  },
  babyGuideCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 6,
    textAlign: 'center',
    color: '#e5a5ba',
    fontSize: 11,
    fontWeight: '600',
  },
  babyGuideRight: {
    position: 'absolute',
    right: 8,
    top: -7,
    color: '#e5a5ba',
    fontSize: 11,
    fontWeight: '700',
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
  momentThumbStack: {
    width: 38,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  momentThumbBack: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 6,
    opacity: 0.6,
    transform: [{ translateX: -4 }, { translateY: 4 }],
    overflow: 'hidden',
  },
  momentVideoThumb: {
    width: 34,
    height: 34,
    borderRadius: 6,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  momentVideoThumbText: {
    fontSize: 10,
    color: '#ffffff',
    fontWeight: '700',
  },
  momentVideoBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  momentVideoBadgeText: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: '700',
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
  momentFooter: {
    marginTop: 6,
  },
  momentChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  momentChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#d9e0ff',
  },
  momentChipText: {
    fontSize: 11,
    color: '#3b4a8c',
    fontWeight: '600',
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
  },
  newMomentCreateBtnActive: {
    backgroundColor: '#000000',
  },
  newMomentFooter: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e7ee',
    backgroundColor: '#f4f5f7',
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
  endPickerDayCellDisabled: {
    opacity: 0.35,
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
  endPickerDayTextDisabled: {
    color: '#c9ced8',
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
  endTimeActions: {
    marginTop: 10,
    alignItems: 'flex-end',
  },
  endTimeSaveButton: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  endTimeSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  newMomentPhotoChosenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -4,
  },
  newMomentPhotoClear: {
    color: '#2563eb',
    fontSize: 13,
    fontWeight: '600',
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
  addBabyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addBabyTitleIcon: {
    fontSize: 18,
  },
  addBabyHint: {
    fontSize: 13,
    color: '#7a8598',
    marginTop: -6,
  },
  shareGroupsSection: {
    borderTopWidth: 1,
    borderTopColor: '#d8dde5',
    paddingTop: 14,
    gap: 10,
  },
  shareGroupRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  shareGroupCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c2cad8',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareGroupCheckboxActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  shareGroupCheckmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  shareGroupName: {
    fontSize: 16,
    color: '#303846',
  },
  shareGroupsEmptyText: {
    fontSize: 14,
    color: '#6c778b',
  },
  myCircleCard: {
    width: '100%',
    maxWidth: 760,
    backgroundColor: '#f4f5f7',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d6dbe3',
    padding: 18,
    gap: 14,
  },
  myCircleScroll: {
    maxHeight: 520,
  },
  myCircleScrollContent: {
    paddingBottom: 8,
    gap: 16,
  },
  notificationsContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  notificationsCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    maxHeight: 520,
    borderWidth: 1,
    borderColor: '#e2e7ee',
    width: '100%',
    maxWidth: 420,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notificationsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  notificationsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationsMarkAll: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#f7f8fa',
  },
  notificationsMarkAllText: {
    fontSize: 12,
    color: '#303846',
    fontWeight: '600',
  },
  notificationsEmpty: {
    fontSize: 14,
    color: '#6c778b',
    textAlign: 'center',
    paddingVertical: 16,
  },
  notificationsList: {
    marginTop: 4,
  },
  notificationsListContent: {
    gap: 10,
    paddingBottom: 8,
  },
  notificationItem: {
    borderWidth: 1,
    borderColor: '#e2e7ee',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#ffffff',
  },
  notificationItemUnread: {
    backgroundColor: '#f4f7ff',
  },
  notificationTextWrap: {
    gap: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  notificationMessage: {
    fontSize: 12,
    color: '#6c778b',
  },
  notificationActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  notificationActionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#ffffff',
  },
  notificationActionText: {
    fontSize: 12,
    color: '#303846',
    fontWeight: '600',
  },
  notificationDeleteButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f2c4c4',
    backgroundColor: '#fff5f5',
  },
  notificationDeleteText: {
    fontSize: 12,
    color: '#b42318',
    fontWeight: '600',
  },
  mediaViewerBackdrop: {
    flex: 1,
    backgroundColor: '#0b0d12',
  },
  mediaViewerHeader: {
    position: 'absolute',
    top: 0,
    right: 16,
    left: 16,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  mediaViewerClose: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  mediaViewerScroll: {
    flex: 1,
  },
  mediaViewerImage: {
    width: '100%',
    height: '100%',
  },
  mediaViewerVideo: {
    width: '100%',
    height: '100%',
  },
  myCircleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  myCircleTitle: {
    fontSize: 20,
    color: '#2f3746',
    fontWeight: '700',
  },
  myCircleSubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: '#6c778b',
  },
  myCircleSearchWrap: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#f4f5f7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  myCircleSearchIcon: {
    fontSize: 19,
    color: '#6c778b',
    marginRight: 8,
  },
  myCircleSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#303846',
  },
  myCircleSearchResults: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    backgroundColor: '#f4f5f7',
    overflow: 'hidden',
  },
  myCircleSearchState: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#6c778b',
  },
  myCircleSearchResultRow: {
    minHeight: 64,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e2e7ef',
  },
  myCircleSearchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  myCircleSearchAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#e9edf3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCircleSearchAvatarText: {
    fontSize: 20,
    color: '#2f3746',
  },
  myCircleSearchUsername: {
    fontSize: 22,
    color: '#303846',
    fontWeight: '500',
  },
  myCircleSearchAddBtn: {
    minWidth: 64,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  myCircleSearchAddText: {
    fontSize: 15,
    color: '#303846',
    fontWeight: '600',
  },
  myCircleSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myCircleSectionLabel: {
    fontSize: 17,
    color: '#6c778b',
    fontWeight: '500',
  },
  myCircleEmptyText: {
    fontSize: 16,
    color: '#6c778b',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  myCircleDivider: {
    height: 1,
    backgroundColor: '#d8dde5',
    marginVertical: 4,
  },
  myCircleActionButton: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f4f5f7',
  },
  myCircleActionButtonText: {
    fontSize: 16,
    color: '#303846',
    fontWeight: '500',
  },
  myCircleCreateGroupCard: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#f7f8fa',
    gap: 10,
  },
  myCircleCreateInput: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#303846',
    backgroundColor: '#ffffff',
  },
  myCircleCreateMembers: {
    gap: 8,
  },
  myCircleCreateMembersLabel: {
    fontSize: 13,
    color: '#6c778b',
    fontWeight: '500',
  },
  myCircleCreateMembersList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  myCircleCreateMemberChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#f7f8fa',
  },
  myCircleCreateMemberChipActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  myCircleCreateMemberChipText: {
    fontSize: 12,
    color: '#303846',
    fontWeight: '600',
  },
  myCircleCreateMemberChipTextActive: {
    color: '#ffffff',
  },
  myCircleCreateActions: {
    flexDirection: 'row',
    gap: 10,
  },
  myCircleCreateButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  myCircleCreateButtonDisabled: {
    opacity: 0.5,
  },
  myCircleCreateButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  myCircleCreateCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#ffffff',
  },
  myCircleCreateCancelText: {
    fontSize: 15,
    color: '#303846',
    fontWeight: '500',
  },
  myCircleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myCircleRowDot: {
    fontSize: 16,
    color: '#9aa3b2',
  },
  myCircleRowText: {
    fontSize: 17,
    color: '#303846',
  },
  myCircleBabyList: {
    gap: 10,
  },
  myCircleBabyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#dfe5ee',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  myCircleBabyAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2cfe5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCircleBabyAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6a2f63',
  },
  myCircleBabyInfo: {
    flex: 1,
    gap: 2,
  },
  myCircleBabyName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#303846',
  },
  myCircleBabyMeta: {
    fontSize: 13,
    color: '#6c778b',
  },
  myCircleBabyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#eef2ff',
  },
  myCircleBabyBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3b4a8c',
  },
  myCircleRemoveButton: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f2c4c4',
    backgroundColor: '#fff5f5',
  },
  myCircleRemoveText: {
    color: '#b42318',
    fontSize: 12,
    fontWeight: '600',
  },
  myCircleGroupCard: {
    borderWidth: 1,
    borderColor: '#d3d8e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  myCircleGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  myCircleGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myCircleGroupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#9aa3b2',
  },
  myCircleGroupChevron: {
    fontSize: 16,
    color: '#6c778b',
    fontWeight: '600',
  },
  myCircleGroupName: {
    fontSize: 17,
    color: '#303846',
    fontWeight: '500',
  },
  myCircleGroupMeta: {
    fontSize: 16,
    color: '#6c778b',
  },
  myCircleGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  myCircleGroupActionButton: {
    borderWidth: 1,
    borderColor: '#e0e6ef',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  myCircleGroupActionText: {
    color: '#303846',
    fontSize: 14,
    fontWeight: '600',
  },
  myCircleColorPicker: {
    marginTop: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e7ee',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  myCircleColorSwatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  myCircleColorSwatchActive: {
    borderWidth: 2,
    borderColor: '#111827',
  },
  myCircleColorClear: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e6ef',
    borderRadius: 8,
    backgroundColor: '#f7f8fa',
  },
  myCircleColorClearText: {
    fontSize: 12,
    color: '#303846',
    fontWeight: '600',
  },
  myCircleGroupExpanded: {
    borderTopWidth: 1,
    borderTopColor: '#e2e7ee',
    paddingTop: 10,
    gap: 10,
  },
  myCircleMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  myCircleMemberAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#e7ebf2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myCircleMemberAvatarText: {
    color: '#303846',
    fontSize: 12,
    fontWeight: '600',
  },
  myCircleMemberText: {
    fontSize: 15,
    color: '#303846',
  },
  myCircleInviteSection: {
    gap: 8,
  },
  myCircleInviteLabel: {
    fontSize: 14,
    color: '#6c778b',
  },
  myCircleInviteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  myCircleInviteButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  myCircleInviteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  myCircleInviteDeleteButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#ffffff',
  },
  myCircleInviteDeleteText: {
    fontSize: 14,
    color: '#b42318',
    fontWeight: '600',
  },
  myCircleInviteShareButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d3d8e1',
    backgroundColor: '#ffffff',
  },
  myCircleInviteShareText: {
    fontSize: 14,
    color: '#303846',
    fontWeight: '600',
  },
  deleteMomentButton: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 14,
    marginTop: 4,
  },
  deleteMomentText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '500',
  },
});
