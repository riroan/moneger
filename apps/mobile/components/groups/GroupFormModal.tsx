import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import type { MaterialIconName } from '../../constants/Icons';

export const GROUP_ICON_MAP: Record<string, MaterialIconName> = {
  folder: 'folder',
  travel: 'flight',
  home: 'home',
  celebration: 'celebration',
  work: 'work',
  school: 'school',
  shopping: 'shopping-bag',
  health: 'favorite',
};

const GROUP_ICON_LABELS: Record<string, string> = {
  folder: '기본',
  travel: '여행',
  home: '집',
  celebration: '행사',
  work: '업무',
  school: '학교',
  shopping: '쇼핑',
  health: '건강',
};

const GROUP_COLOR_OPTIONS = [
  '#6366F1',
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
];

export interface GroupForEdit {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface GroupFormModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  group?: GroupForEdit | null;
  onClose: () => void;
  onSubmit: (data: { name: string; description?: string; icon: string; color: string }) => void;
  onDelete?: () => void;
  isSubmitting: boolean;
}

export function GroupFormModal({
  visible,
  mode,
  group,
  onClose,
  onSubmit,
  onDelete,
  isSubmitting,
}: GroupFormModalProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('folder');
  const [selectedColor, setSelectedColor] = useState('#6366F1');

  useEffect(() => {
    if (visible && mode === 'edit' && group) {
      setName(group.name);
      setDescription(group.description || '');
      setSelectedIcon(group.icon || 'folder');
      setSelectedColor(group.color || '#6366F1');
    } else if (visible && mode === 'add') {
      setName('');
      setDescription('');
      setSelectedIcon('folder');
      setSelectedColor('#6366F1');
    }
  }, [visible, mode, group]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      icon: selectedIcon,
      color: selectedColor,
    });
  };

  const confirmDelete = () => {
    if (!group) return;
    Alert.alert(
      '그룹 삭제',
      `'${group.name}' 그룹을 삭제하시겠습니까?\n\n그룹을 삭제해도 거래 내역은 유지됩니다.`,
      [
        { text: '취소', style: 'cancel' },
        { text: '삭제', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    backdrop: { ...StyleSheet.absoluteFillObject },
    content: {
      backgroundColor: colors.bgCard,
      borderRadius: 20,
      width: '90%',
      maxWidth: 400,
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { fontSize: 18, fontWeight: '600', color: colors.textPrimary },
    closeButton: { padding: 4 },
    body: { padding: 20 },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
      marginTop: 16,
    },
    labelFirst: { marginTop: 0 },
    textInput: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 15,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
    iconButton: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconButtonSelected: {
      backgroundColor: colors.accentBlue + '33',
      borderColor: colors.accentBlue,
    },
    iconLabel: {
      fontSize: 9,
      color: colors.textMuted,
      marginTop: 2,
    },
    iconLabelSelected: { color: colors.accentBlue },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      justifyContent: 'center',
    },
    colorButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: 'transparent',
    },
    colorButtonSelected: {
      borderColor: colors.textPrimary,
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
      padding: 20,
      paddingTop: 0,
    },
    deleteButton: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: 'rgba(239, 68, 68, 0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    cancelButtonText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
    saveButton: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.accentBlue,
      alignItems: 'center',
    },
    saveButtonDisabled: { opacity: 0.5 },
    saveButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === 'add' ? '새 그룹 만들기' : '그룹 수정'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={[styles.label, styles.labelFirst]}>그룹 이름 *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="예: 제주도 여행"
              placeholderTextColor={colors.textMuted}
              maxLength={30}
            />

            <Text style={styles.label}>설명 (선택)</Text>
            <TextInput
              style={styles.textInput}
              value={description}
              onChangeText={setDescription}
              placeholder="예: 2026년 4월 3박4일"
              placeholderTextColor={colors.textMuted}
              maxLength={50}
            />

            <Text style={styles.label}>아이콘</Text>
            <View style={styles.iconGrid}>
              {Object.keys(GROUP_ICON_MAP).map((iconKey) => {
                const isSelected = selectedIcon === iconKey;
                return (
                  <TouchableOpacity
                    key={iconKey}
                    style={[styles.iconButton, isSelected && styles.iconButtonSelected]}
                    onPress={() => setSelectedIcon(iconKey)}
                  >
                    <MaterialIcons
                      name={GROUP_ICON_MAP[iconKey]}
                      size={20}
                      color={isSelected ? colors.accentBlue : colors.textSecondary}
                    />
                    <Text
                      style={[styles.iconLabel, isSelected && styles.iconLabelSelected]}
                    >
                      {GROUP_ICON_LABELS[iconKey]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>색상</Text>
            <View style={styles.colorGrid}>
              {GROUP_COLOR_OPTIONS.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorButton,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorButtonSelected,
                  ]}
                  onPress={() => setSelectedColor(color)}
                />
              ))}
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.buttons}>
            {mode === 'edit' && onDelete && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={confirmDelete}
                disabled={isSubmitting}
              >
                <MaterialIcons name="delete-outline" size={22} color={colors.accentCoral} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                (isSubmitting || !name.trim()) && styles.saveButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || !name.trim()}
            >
              <Text style={styles.saveButtonText}>
                {isSubmitting ? '저장 중...' : mode === 'add' ? '추가' : '저장'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
