import { useState } from 'react';
import { Slot, usePathname, useRouter } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getIconName, type MaterialIconName } from '../../constants/Icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';

const tabs: { name: string; path: string; title: string; icon: MaterialIconName }[] = [
  { name: 'index', path: '/(tabs)', title: '홈', icon: 'home' },
  { name: 'transactions', path: '/(tabs)/transactions', title: '내역', icon: 'receipt-long' },
  { name: 'add', path: '', title: '', icon: 'add' }, // Center add button placeholder
  { name: 'savings', path: '/(tabs)/savings', title: '저축', icon: 'savings' },
  { name: 'settings', path: '/(tabs)/settings', title: '설정', icon: 'settings' },
];

// Mock categories for testing
const MOCK_CATEGORIES = {
  EXPENSE: [
    { id: '1', name: '식비', icon: 'restaurant', color: '#ff6b6b' },
    { id: '2', name: '교통', icon: 'car', color: '#60a5fa' },
    { id: '3', name: '생활용품', icon: 'cart', color: '#a78bfa' },
    { id: '4', name: '의료/건강', icon: 'hospital', color: '#34d399' },
    { id: '5', name: '문화/여가', icon: 'movie', color: '#fbbf24' },
    { id: '6', name: '기타', icon: 'box', color: '#9ca3af' },
  ],
  INCOME: [
    { id: '7', name: '급여', icon: 'money', color: '#4ade80' },
    { id: '8', name: '부수입', icon: 'star', color: '#fbbf24' },
    { id: '9', name: '용돈', icon: 'gift', color: '#f472b6' },
    { id: '10', name: '기타', icon: 'box', color: '#9ca3af' },
  ],
};

export default function TabsLayout() {
  const { theme } = useThemeStore();
  const colors = Colors[theme];
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [transactionType, setTransactionType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);

  const resetForm = () => {
    setTransactionType('EXPENSE');
    setDescription('');
    setAmount('');
    setSelectedCategory(null);
    setIsCategoryDropdownOpen(false);
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalVisible(true);
  };

  const handleCloseModal = () => {
    setIsModalVisible(false);
    resetForm();
  };

  const handleSubmit = () => {
    // TODO: Implement actual submission
    console.log('Submit:', { transactionType, description, amount, selectedCategory });
    handleCloseModal();
  };

  const formatAmount = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    if (!numericValue) return '';
    // Format with commas
    return Number(numericValue).toLocaleString('ko-KR');
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatAmount(text);
    setAmount(formatted);
  };

  const categories = transactionType === 'EXPENSE' ? MOCK_CATEGORIES.EXPENSE : MOCK_CATEGORIES.INCOME;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.bgPrimary,
    },
    tabBar: {
      flexDirection: 'row',
      backgroundColor: colors.bgCard,
      borderTopColor: colors.border,
      borderTopWidth: 1,
      height: 85,
      paddingTop: 10,
      paddingBottom: 25,
      alignItems: 'center',
    },
    tabItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '500',
      marginTop: 4,
    },
    addButtonContainer: {
      marginTop: -20,
      shadowColor: '#4AC7A0',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 6,
      elevation: 6,
    },
    addButton: {
      width: 56,
      height: 56,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.bgCard,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingBottom: insets.bottom + 20,
      maxHeight: '90%',
    },
    modalHandle: {
      width: 40,
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    closeButton: {
      padding: 4,
    },
    modalBody: {
      paddingHorizontal: 20,
    },
    // Type toggle
    typeToggle: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 20,
    },
    typeButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    typeButtonInner: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.bgSecondary,
    },
    typeButtonGradient: {
      paddingVertical: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    typeButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    typeButtonTextActive: {
      color: '#fff',
    },
    // Form fields
    fieldContainer: {
      marginBottom: 16,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
      marginBottom: 8,
    },
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
    amountInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    currencySymbol: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.textMuted,
      marginRight: 8,
    },
    amountInput: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 18,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    // Category Dropdown
    categoryDropdown: {
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    categoryDropdownTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    categoryDropdownTriggerText: {
      fontSize: 15,
      color: colors.textMuted,
    },
    categoryDropdownSelected: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryDropdownSelectedText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    categoryDropdownList: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      maxHeight: 200,
    },
    categoryDropdownItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    categoryDropdownItemSelected: {
      backgroundColor: 'rgba(52, 211, 153, 0.1)',
    },
    categoryDropdownItemText: {
      fontSize: 15,
      color: colors.textPrimary,
    },
    categoryDropdownItemTextSelected: {
      color: colors.accentMint,
      fontWeight: '500',
    },
    // Action buttons
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 24,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 16,
      borderRadius: 12,
      backgroundColor: colors.bgSecondary,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    submitButton: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    submitButtonGradient: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
    },
    submitButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#fff',
    },
  });

  const isActive = (path: string) => {
    if (path === '/(tabs)') {
      return pathname === '/' || pathname === '/(tabs)';
    }
    return pathname === path || pathname === path.replace('/(tabs)', '');
  };

  const isFormValid = description.trim() && amount && selectedCategory;

  return (
    <View style={styles.container}>
      <Slot />
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => {
          // Center add button
          if (tab.name === 'add') {
            return (
              <TouchableOpacity
                key={tab.name}
                style={styles.tabItem}
                onPress={handleOpenModal}
              >
                <View style={styles.addButtonContainer}>
                  <LinearGradient
                    colors={['#34D399', '#60A5FA']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.addButton}
                  >
                    <MaterialIcons name="add" size={32} color="#fff" />
                  </LinearGradient>
                </View>
              </TouchableOpacity>
            );
          }

          const active = isActive(tab.path);
          const activeColor = '#4AC7A0';
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => router.push(tab.path as any)}
            >
              <MaterialIcons
                name={tab.icon}
                size={24}
                color={active ? activeColor : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? activeColor : colors.textMuted },
                ]}
              >
                {tab.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Add Transaction Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseModal}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHandle} />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>내역 추가</Text>
                  <TouchableOpacity style={styles.closeButton} onPress={handleCloseModal}>
                    <MaterialIcons name="close" size={24} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  {/* Type Toggle */}
                  <View style={styles.typeToggle}>
                    <TouchableOpacity
                      style={styles.typeButton}
                      onPress={() => {
                        setTransactionType('EXPENSE');
                        setSelectedCategory(null);
                      }}
                    >
                      {transactionType === 'EXPENSE' ? (
                        <LinearGradient
                          colors={['#F87171', '#FBBF24']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.typeButtonGradient}
                        >
                          <Text style={[styles.typeButtonText, styles.typeButtonTextActive]}>
                            💳 지출
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.typeButtonInner}>
                          <Text style={styles.typeButtonText}>💳 지출</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.typeButton}
                      onPress={() => {
                        setTransactionType('INCOME');
                        setSelectedCategory(null);
                      }}
                    >
                      {transactionType === 'INCOME' ? (
                        <LinearGradient
                          colors={['#34D399', '#60A5FA']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.typeButtonGradient}
                        >
                          <Text style={[styles.typeButtonText, styles.typeButtonTextActive]}>
                            💼 수입
                          </Text>
                        </LinearGradient>
                      ) : (
                        <View style={styles.typeButtonInner}>
                          <Text style={styles.typeButtonText}>💼 수입</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  </View>

                  {/* Description */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>내용</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="예: 점심 식사, 월급 등"
                      placeholderTextColor={colors.textMuted}
                      value={description}
                      onChangeText={setDescription}
                    />
                  </View>

                  {/* Amount */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>금액</Text>
                    <View style={styles.amountInputContainer}>
                      <Text style={styles.currencySymbol}>₩</Text>
                      <TextInput
                        style={styles.amountInput}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={amount}
                        onChangeText={handleAmountChange}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  {/* Category Dropdown */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>카테고리</Text>
                    <View style={styles.categoryDropdown}>
                      <TouchableOpacity
                        style={styles.categoryDropdownTrigger}
                        onPress={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      >
                        {selectedCategory ? (
                          <View style={styles.categoryDropdownSelected}>
                            <MaterialIcons
                              name={getIconName(categories.find(c => c.id === selectedCategory)?.icon)}
                              size={18}
                              color={categories.find(c => c.id === selectedCategory)?.color || colors.textPrimary}
                            />
                            <Text style={styles.categoryDropdownSelectedText}>
                              {categories.find(c => c.id === selectedCategory)?.name}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.categoryDropdownTriggerText}>
                            카테고리 선택
                          </Text>
                        )}
                        <MaterialIcons
                          name={isCategoryDropdownOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                          size={20}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>
                      {isCategoryDropdownOpen && (
                        <ScrollView style={styles.categoryDropdownList} nestedScrollEnabled>
                          {categories.map((cat, index) => (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.categoryDropdownItem,
                                selectedCategory === cat.id && styles.categoryDropdownItemSelected,
                                index === categories.length - 1 && { borderBottomWidth: 0 },
                              ]}
                              onPress={() => {
                                setSelectedCategory(cat.id);
                                setIsCategoryDropdownOpen(false);
                              }}
                            >
                              <MaterialIcons name={getIconName(cat.icon)} size={20} color={cat.color} />
                              <Text
                                style={[
                                  styles.categoryDropdownItemText,
                                  selectedCategory === cat.id && styles.categoryDropdownItemTextSelected,
                                ]}
                              >
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.cancelButton} onPress={handleCloseModal}>
                      <Text style={styles.cancelButtonText}>취소</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        !isFormValid && styles.submitButtonDisabled,
                      ]}
                      onPress={handleSubmit}
                      disabled={!isFormValid}
                    >
                      <LinearGradient
                        colors={transactionType === 'EXPENSE'
                          ? ['#F87171', '#FBBF24']
                          : ['#34D399', '#60A5FA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.submitButtonGradient}
                      >
                        <Text style={styles.submitButtonText}>추가</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}
