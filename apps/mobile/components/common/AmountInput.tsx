import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useThemeStore } from '../../stores/themeStore';
import { Colors } from '../../constants/Colors';
import { AMOUNT_LIMITS, formatAmountInput } from '@moneger/shared';

interface AmountInputProps {
  value: string;
  onChange: (value: string, exceeded: boolean) => void;
  maxAmount?: number;
  placeholder?: string;
  label?: string;
  exceeded?: boolean;
  autoFocus?: boolean;
}

export default function AmountInput({
  value,
  onChange,
  maxAmount = AMOUNT_LIMITS.TRANSACTION_MAX,
  placeholder = '0',
  label,
  exceeded = false,
  autoFocus = false,
}: AmountInputProps) {
  const { theme } = useThemeStore();
  const colors = Colors[theme];

  const handleChangeText = (text: string) => {
    const result = formatAmountInput(text, maxAmount);
    onChange(result.value, result.exceeded);
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
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.bgSecondary,
      borderRadius: 12,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: exceeded ? colors.accentCoral : colors.border,
    },
    currencySymbol: {
      fontSize: 16,
      color: colors.textSecondary,
      marginRight: 4,
    },
    input: {
      flex: 1,
      paddingVertical: 14,
      fontSize: 16,
      color: colors.textPrimary,
    },
    exceededText: {
      fontSize: 11,
      color: colors.accentCoral,
      marginTop: 4,
    },
  });

  return (
    <View style={label ? styles.container : undefined}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <Text style={styles.currencySymbol}>₩</Text>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={handleChangeText}
          keyboardType="numeric"
          autoFocus={autoFocus}
        />
      </View>
      {exceeded && (
        <Text style={styles.exceededText}>
          {maxAmount === AMOUNT_LIMITS.TRANSACTION_MAX
            ? '1000억 원을 초과할 수 없습니다.'
            : `최대 ${maxAmount.toLocaleString()}원까지 입력 가능합니다.`}
        </Text>
      )}
    </View>
  );
}
