import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { groupsApi, type GroupSummary } from '../../lib/api';
import { GROUP_ICON_MAP } from '../groups';

interface GroupDropdownProps {
  userId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export default function GroupDropdown({ userId, selectedId, onSelect }: GroupDropdownProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fetchGroups = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    const result = await groupsApi.getAll(userId);
    if (result.success && result.data) {
      setGroups(result.data);
    }
    setIsLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const selectedGroup = groups.find((g) => g.id === selectedId) || null;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    triggerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    placeholder: {
      fontSize: 15,
      color: colors.textMuted,
    },
    selectedText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clearButton: {
      padding: 4,
    },
    list: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: 200,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemSelected: {
      backgroundColor: 'rgba(99, 102, 241, 0.1)',
    },
    itemText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    itemTextSelected: {
      color: '#818CF8',
      fontWeight: '500',
    },
    emptyHint: {
      paddingVertical: 14,
      paddingHorizontal: 16,
      fontSize: 14,
      color: colors.textMuted,
    },
  });

  if (!isLoading && groups.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyHint}>그룹을 먼저 만들어주세요</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setIsOpen((v) => !v)}
        disabled={isLoading}
      >
        <View style={styles.triggerLeft}>
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={styles.placeholder}>로딩 중...</Text>
            </>
          ) : selectedGroup ? (
            <>
              <MaterialIcons
                name={GROUP_ICON_MAP[selectedGroup.icon || 'folder'] || 'folder'}
                size={18}
                color={selectedGroup.color || '#6366F1'}
              />
              <Text style={styles.selectedText}>{selectedGroup.name}</Text>
            </>
          ) : (
            <Text style={styles.placeholder}>그룹 선택 (선택사항)</Text>
          )}
        </View>
        <View style={styles.actions}>
          {selectedGroup && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={(e) => {
                e.stopPropagation();
                onSelect(null);
                setIsOpen(false);
              }}
            >
              <MaterialIcons name="close" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <MaterialIcons
            name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {isOpen && !isLoading && (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {groups.map((group, index) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.item,
                selectedId === group.id && styles.itemSelected,
                index === groups.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => {
                onSelect(group.id);
                setIsOpen(false);
              }}
            >
              <MaterialIcons
                name={GROUP_ICON_MAP[group.icon || 'folder'] || 'folder'}
                size={20}
                color={group.color || '#6366F1'}
              />
              <Text
                style={[
                  styles.itemText,
                  selectedId === group.id && styles.itemTextSelected,
                ]}
              >
                {group.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
