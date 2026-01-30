import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { getIconName } from '../../constants/Icons';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
}

interface CategoryDropdownProps {
  categories: Category[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  label?: string;
  placeholder?: string;
}

export default function CategoryDropdown({
  categories,
  selectedId,
  onSelect,
  isOpen,
  onToggle,
  isLoading = false,
  label,
  placeholder = '카테고리 선택',
}: CategoryDropdownProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const selectedCategory = categories.find((c) => c.id === selectedId);

  const handleSelect = (id: string) => {
    onSelect(id);
    onToggle();
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
    dropdown: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    trigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
    },
    triggerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    placeholder: {
      fontSize: 15,
      color: colors.textMuted,
    },
    selectedText: {
      fontSize: 15,
      color: colors.textPrimary,
      marginLeft: 10,
    },
    loadingText: {
      fontSize: 15,
      color: colors.textMuted,
      marginLeft: 8,
    },
    list: {
      maxHeight: 200,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    itemSelected: {
      backgroundColor: colors.bgCard,
    },
    itemLast: {
      borderBottomWidth: 0,
    },
    itemText: {
      fontSize: 14,
      color: colors.textPrimary,
      marginLeft: 12,
      flex: 1,
    },
    itemTextSelected: {
      fontWeight: '600',
    },
  });

  return (
    <View style={label ? styles.container : undefined}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.dropdown}>
        <TouchableOpacity
          style={styles.trigger}
          onPress={onToggle}
          disabled={isLoading}
        >
          <View style={styles.triggerContent}>
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color={colors.textMuted} />
                <Text style={styles.loadingText}>로딩 중...</Text>
              </>
            ) : selectedCategory ? (
              <>
                <MaterialIcons
                  name={getIconName(selectedCategory.icon)}
                  size={18}
                  color={selectedCategory.color}
                />
                <Text style={styles.selectedText}>{selectedCategory.name}</Text>
              </>
            ) : (
              <Text style={styles.placeholder}>{placeholder}</Text>
            )}
          </View>
          <MaterialIcons
            name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={colors.textMuted}
          />
        </TouchableOpacity>

        {isOpen && !isLoading && (
          <ScrollView style={styles.list} nestedScrollEnabled>
            {categories.map((cat, index) => (
              <TouchableOpacity
                key={cat.id}
                style={[
                  styles.item,
                  selectedId === cat.id && styles.itemSelected,
                  index === categories.length - 1 && styles.itemLast,
                ]}
                onPress={() => handleSelect(cat.id)}
              >
                <MaterialIcons name={getIconName(cat.icon)} size={20} color={cat.color} />
                <Text
                  style={[
                    styles.itemText,
                    selectedId === cat.id && styles.itemTextSelected,
                  ]}
                >
                  {cat.name}
                </Text>
                {selectedId === cat.id && (
                  <MaterialIcons name="check" size={18} color={colors.accentMint} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
