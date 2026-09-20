import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import auth from '@react-native-firebase/auth';
import {
  useUserStore,
  saveOptionalProfileFields,
  submitProfileText,
  removeProfilePhoto,
  reorderProfilePhotos,
  claimUsername,
  MODERATION_REJECTED_MESSAGE,
  MAX_PHOTOS_REACHED_MESSAGE,
} from 'entities/user';
import type { Gender, LookingFor, OptionalProfileFields } from 'entities/user';
import { usePhotoUpload, getHereSinceOptions } from 'features/edit-profile';
import { unregisterThisDevice } from 'features/push-notifications';
import {
  INTEREST_TAGS,
  MAX_INTERESTS_PER_PROFILE,
} from 'shared/lib/constants/interests';
import { Button } from 'shared/ui/Button';
import { TextField } from 'shared/ui/TextField';
import { SelectField } from 'shared/ui/SelectField';
import { handleFirebaseError } from 'shared/api/handleFirebaseError';
import type { MainStackParamList } from 'shared/lib/navigation/types';

type Navigation = NativeStackNavigationProp<MainStackParamList>;

const MAX_PHOTOS = 6;
const MIN_AGE = 18;
const GENDERS: Gender[] = ['male', 'female', 'other'];
const LOOKING_FOR_OPTIONS: LookingFor[] = ['male', 'female', 'all'];

export function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<Navigation>();
  // This tab only mounts once RootNavigator has confirmed status === 'ready', so record is always a complete User by then.
  const record = useUserStore(state => state.record)!;
  const { isUploading, pickAndUploadPhoto } = usePhotoUpload();

  const [name, setName] = useState(record.name ?? '');
  const [bio, setBio] = useState(record.bio ?? '');
  const [username, setUsername] = useState(record.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [age, setAge] = useState(record.age?.toString() ?? '');
  const [ageError, setAgeError] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | undefined>(record.gender);
  const [lookingFor, setLookingFor] = useState<LookingFor | undefined>(
    record.lookingFor,
  );
  const [hereSince, setHereSince] = useState<string | null>(
    record.hereSince ?? null,
  );
  const [interests, setInterests] = useState<string[]>(record.interests ?? []);
  const [isSaving, setIsSaving] = useState(false);

  const hereSinceOptions = getHereSinceOptions(i18n.language);

  function toggleInterest(tag: string) {
    setInterests(previous => {
      if (previous.includes(tag)) {
        return previous.filter(item => item !== tag);
      }
      if (previous.length >= MAX_INTERESTS_PER_PROFILE) {
        return previous;
      }
      return [...previous, tag];
    });
  }

  function showError(translationKey: string) {
    Alert.alert(t('profile.title'), t(translationKey));
  }

  function handleFieldError(error: unknown, field: 'name' | 'bio' | 'photo') {
    const message = (error as { message?: string }).message;
    if (message === MODERATION_REJECTED_MESSAGE) {
      showError(`errors.moderation_rejected_${field}`);
      return;
    }
    if (message === MAX_PHOTOS_REACHED_MESSAGE) {
      showError('profile.maxPhotosReached');
      return;
    }
    const handled = handleFirebaseError(error);
    showError(`errors.${handled.translationKey}`);
  }

  async function handleAddPhoto() {
    if (isUploading || record.avatarUrls.length >= MAX_PHOTOS) {
      return;
    }
    try {
      await pickAndUploadPhoto(record.uid);
    } catch (error) {
      handleFieldError(error, 'photo');
    }
  }

  async function handleRemovePhoto(url: string) {
    try {
      await removeProfilePhoto(url);
    } catch (error) {
      handleFieldError(error, 'photo');
    }
  }

  async function handleSetMainPhoto(url: string) {
    const reordered = [
      url,
      ...record.avatarUrls.filter(existing => existing !== url),
    ];
    try {
      await reorderProfilePhotos(reordered);
    } catch (error) {
      handleFieldError(error, 'photo');
    }
  }

  async function handleSignOut() {
    // 10 — drop this device's push token first, or the account keeps
    // sending notifications to a phone it is no longer signed in on.
    await unregisterThisDevice(record.uid);
    await auth().signOut();
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }
    setUsernameError(null);
    setAgeError(null);

    // 9 — self-declared age below 18 is blocked at save time, separately
    // from the mandatory 18+ checkbox at sign-up (which doesn't depend
    // on this optional field being filled in at all).
    const trimmedAge = age.trim();
    if (trimmedAge && Number(trimmedAge) < MIN_AGE) {
      setAgeError(t('profile.ageTooYoung'));
      return;
    }

    setIsSaving(true);
    try {
      const trimmedUsername = username.trim();
      if (trimmedUsername && trimmedUsername !== (record.username ?? '')) {
        const result = await claimUsername(
          record.uid,
          trimmedUsername,
          record.username,
        );
        if (result === 'taken') {
          setUsernameError(t('profile.usernameTaken'));
          return;
        }
      }

      const trimmedName = name.trim();
      if (trimmedName && trimmedName !== record.name) {
        try {
          await submitProfileText('name', trimmedName);
        } catch (error) {
          handleFieldError(error, 'name');
          return;
        }
      }

      const trimmedBio = bio.trim();
      if (trimmedBio !== (record.bio ?? '')) {
        try {
          await submitProfileText('bio', trimmedBio);
        } catch (error) {
          handleFieldError(error, 'bio');
          return;
        }
      }

      const optionalFields: OptionalProfileFields = { interests };
      if (age.trim()) {
        optionalFields.age = Number(age.trim());
      }
      if (gender) {
        optionalFields.gender = gender;
      }
      if (lookingFor) {
        optionalFields.lookingFor = lookingFor;
      }
      if (hereSince) {
        optionalFields.hereSince = hereSince;
      }
      await saveOptionalProfileFields(record.uid, optionalFields);

      showError('profile.saved');
    } catch (error) {
      const handled = handleFirebaseError(error);
      showError(`errors.${handled.translationKey}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('profile.title')}</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.photosTitle')}</Text>
        <Text style={styles.sectionHint}>{t('profile.mainPhotoHint')}</Text>
        <View style={styles.photoGrid}>
          {record.avatarUrls.map((url, index) => (
            <View key={url} style={styles.photoSlot}>
              <Pressable
                onPress={() => handleSetMainPhoto(url)}
                disabled={index === 0}
              >
                <FastImage source={{ uri: url }} style={styles.photo} />
              </Pressable>
              {index === 0 && (
                <View style={styles.mainBadge}>
                  <Text style={styles.mainBadgeText}>
                    {t('profile.mainPhoto')}
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.removeButton}
                onPress={() => handleRemovePhoto(url)}
              >
                <Text style={styles.removeButtonText}>✕</Text>
              </Pressable>
            </View>
          ))}
          {record.avatarUrls.length < MAX_PHOTOS && (
            <Pressable
              style={[styles.photoSlot, styles.addPhotoSlot]}
              onPress={handleAddPhoto}
            >
              <Text style={styles.addPhotoText}>{isUploading ? '…' : '+'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <TextField
          label={t('profile.nameLabel')}
          value={name}
          onChangeText={setName}
          maxLength={30}
        />
      </View>

      <View style={styles.section}>
        <TextField
          label={t('profile.usernameLabel')}
          placeholder={t('profile.usernamePlaceholder')}
          value={username}
          onChangeText={text => {
            setUsername(text);
            setUsernameError(null);
          }}
          autoCapitalize="none"
          maxLength={20}
          error={usernameError ?? undefined}
        />
      </View>

      <View style={styles.section}>
        <TextField
          label={t('profile.bioLabel')}
          placeholder={t('profile.bioPlaceholder')}
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
          style={styles.bioInput}
        />
      </View>

      <View style={styles.section}>
        <TextField
          label={t('profile.ageLabel')}
          value={age}
          onChangeText={text => {
            setAge(text);
            setAgeError(null);
          }}
          keyboardType="number-pad"
          maxLength={3}
          error={ageError ?? undefined}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.genderLabel')}</Text>
        <View style={styles.optionsRow}>
          {GENDERS.map(option => (
            <Pressable
              key={option}
              onPress={() => setGender(option)}
              style={[
                styles.option,
                gender === option && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  gender === option && styles.optionTextSelected,
                ]}
              >
                {t(`profile.gender.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('profile.lookingForLabel')}</Text>
        <View style={styles.optionsRow}>
          {LOOKING_FOR_OPTIONS.map(option => (
            <Pressable
              key={option}
              onPress={() => setLookingFor(option)}
              style={[
                styles.option,
                lookingFor === option && styles.optionSelected,
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  lookingFor === option && styles.optionTextSelected,
                ]}
              >
                {t(`profile.lookingFor.${option}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <SelectField
          label={t('profile.hereSinceLabel')}
          placeholder={t('profile.hereSincePlaceholder')}
          searchPlaceholder={t('profile.hereSinceSearchPlaceholder')}
          options={hereSinceOptions}
          value={hereSince}
          onSelect={setHereSince}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {t('profile.interestsLabel')} ({interests.length}/
          {MAX_INTERESTS_PER_PROFILE})
        </Text>
        <View style={styles.tagsWrap}>
          {INTEREST_TAGS.map(tag => {
            const selected = interests.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => toggleInterest(tag)}
                style={[styles.tagChip, selected && styles.tagChipActive]}
              >
                <Text
                  style={[
                    styles.tagChipText,
                    selected && styles.tagChipTextActive,
                  ]}
                >
                  {t(`interests.${tag}`)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Button
        label={t('profile.save')}
        onPress={handleSave}
        disabled={isSaving || !name.trim()}
      />

      <Text style={styles.signOutLink} onPress={handleSignOut}>
        {t('profile.signOut')}
      </Text>

      {/* 12 — deletion has to be as easy to find as signing out (App Store 5.1.1v). */}
      <Text
        style={styles.deleteAccountLink}
        onPress={() => navigation.navigate('DeleteAccount')}
      >
        {t('deleteAccount.title')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  addPhotoSlot: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
  },
  addPhotoText: {
    color: '#9A9A9A',
    fontSize: 28,
  },
  bioInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  mainBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    bottom: 4,
    left: 4,
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  option: {
    borderColor: '#D0D0D0',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionSelected: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  optionText: {
    fontSize: 14,
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photo: {
    borderRadius: 12,
    height: '100%',
    width: '100%',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  photoSlot: {
    borderRadius: 12,
    height: 96,
    overflow: 'hidden',
    width: 96,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 11,
    height: 22,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    top: 4,
    width: 22,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionHint: {
    color: '#9A9A9A',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  deleteAccountLink: {
    color: '#FF3B30',
    marginTop: 16,
    textAlign: 'center',
  },
  signOutLink: {
    color: '#9A9A9A',
    marginTop: 24,
    textAlign: 'center',
  },
  tagChip: {
    borderColor: '#D0D0D0',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
    marginRight: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagChipActive: {
    backgroundColor: '#FF5A5F',
    borderColor: '#FF5A5F',
  },
  tagChipText: {
    fontSize: 13,
  },
  tagChipTextActive: {
    color: '#FFFFFF',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
});
