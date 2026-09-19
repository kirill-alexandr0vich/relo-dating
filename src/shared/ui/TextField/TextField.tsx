import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';

interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function TextField({
  label,
  error,
  style,
  ...inputProps
}: TextFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, Boolean(error) && styles.inputError, style]}
        placeholderTextColor="#9A9A9A"
        {...inputProps}
      />
      {Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 12,
  },
  input: {
    borderColor: '#D0D0D0',
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputError: {
    borderColor: '#D32F2F',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
});
