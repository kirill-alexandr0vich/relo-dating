import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export interface SelectFieldOption {
  code: string;
  name: string;
}

interface SelectFieldProps {
  label: string;
  placeholder: string;
  options: SelectFieldOption[];
  value: string | null;
  onSelect: (code: string) => void;
  searchPlaceholder: string;
}

export function SelectField({
  label,
  placeholder,
  options,
  value,
  onSelect,
  searchPlaceholder,
}: SelectFieldProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selectedName = options.find(option => option.code === value)?.name;

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return options;
    }
    return options.filter(option =>
      option.name.toLowerCase().includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.trigger} onPress={() => setIsOpen(true)}>
        <Text style={selectedName ? styles.value : styles.placeholder}>
          {selectedName ?? placeholder}
        </Text>
      </Pressable>
      <Modal
        visible={isOpen}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={styles.modal}>
          <TextInput
            style={styles.searchInput}
            placeholder={searchPlaceholder}
            placeholderTextColor="#9A9A9A"
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          <FlatList
            data={filteredOptions}
            keyExtractor={item => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.option}
                onPress={() => {
                  onSelect(item.code);
                  setQuery('');
                  setIsOpen(false);
                }}
              >
                <Text style={styles.optionText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
  },
  option: {
    borderBottomColor: '#EFEFEF',
    borderBottomWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionText: {
    fontSize: 16,
  },
  placeholder: {
    color: '#9A9A9A',
    fontSize: 16,
  },
  searchInput: {
    borderBottomColor: '#D0D0D0',
    borderBottomWidth: 1,
    fontSize: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  trigger: {
    borderColor: '#D0D0D0',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  value: {
    fontSize: 16,
  },
});
