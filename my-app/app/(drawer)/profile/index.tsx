import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { HeartPulse, User, Phone, Save, Trash2, PlusCircle } from 'lucide-react-native';
import { DrawerToggleButton } from '@react-navigation/drawer';
import { authService } from '../../../src/services/authService';

const COLORS = {
  bg: '#EBF0F9',
  textPrimary: '#111638',
  textSecondary: '#69708A',
  purplePrimary: '#6D35E8',
  red: '#F04438',
  shadow: 'rgba(163, 177, 198, 0.55)',
  highlight: '#FFFFFF',
};

const NeumorphicCard = ({ children, style, padding = 16 }: any) => (
  <View style={[styles.neuOuter, style]}>
    <View style={[styles.neuInner, { padding }]}>
      {children}
    </View>
  </View>
);

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // User Info
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [medicalInfo, setMedicalInfo] = useState('');
  
  // Contacts
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const profile = await authService.getUserProfile();
      if (profile) {
        setFullName(profile.fullName || '');
        setPhone(profile.phone || '');
        setMedicalInfo(profile.safetyPreferences?.medicalConditions || '');
        setContacts(profile.trustedContacts || []);
      }
    } catch (e) {
      console.log('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const currentProfile = await authService.getUserProfile();
      await authService.updateUserProfile({
        fullName,
        phone,
        safetyPreferences: {
          ...(currentProfile?.safetyPreferences || {}),
          medicalConditions: medicalInfo
        }
      });
      Alert.alert('Success', 'Profile updated securely.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContact = async (index: number) => {
    Alert.alert('Remove Guardian', 'Are you sure you want to remove this guardian?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Remove', 
        style: 'destructive',
        onPress: async () => {
          try {
            const newContacts = [...contacts];
            newContacts.splice(index, 1);
            setContacts(newContacts);
            await authService.updateUserProfile({ trustedContacts: newContacts });
          } catch (e) {
            Alert.alert('Error', 'Failed to remove contact.');
          }
        }
      }
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={COLORS.purplePrimary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <DrawerToggleButton tintColor={COLORS.textPrimary} />
        <Text style={styles.headerTitle}>My Profile</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
          {saving ? <ActivityIndicator size="small" color={COLORS.purplePrimary} /> : <Text style={styles.saveText}>Save</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Avatar Area */}
        <View style={styles.avatarSection}>
          <NeumorphicCard style={styles.avatarCard} padding={0}>
            <View style={styles.avatarInner}>
              <Text style={styles.avatarInitial}>{fullName ? fullName[0].toUpperCase() : 'U'}</Text>
            </View>
          </NeumorphicCard>
        </View>

        {/* Personal Details */}
        <Text style={styles.sectionTitle}>Personal Details</Text>
        <NeumorphicCard style={{ marginBottom: 24 }}>
          <View style={styles.inputRow}>
            <User size={20} color={COLORS.purplePrimary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Full Name"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.inputRow}>
            <Phone size={20} color={COLORS.purplePrimary} style={styles.inputIcon} />
            <TextInput 
              style={styles.input}
              placeholder="Your Phone Number"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>
        </NeumorphicCard>

        {/* Medical ID */}
        <Text style={styles.sectionTitle}>Medical ID</Text>
        <NeumorphicCard style={{ marginBottom: 24 }}>
          <View style={styles.inputRow}>
            <HeartPulse size={20} color={COLORS.red} style={styles.inputIcon} />
            <TextInput 
              style={[styles.input, { height: 80 }]}
              placeholder="Blood Type, Allergies, Medical Conditions..."
              multiline
              value={medicalInfo}
              onChangeText={setMedicalInfo}
            />
          </View>
        </NeumorphicCard>

        {/* Trusted Guardians */}
        <View style={styles.guardiansHeader}>
          <Text style={styles.sectionTitle}>Trusted Guardians</Text>
          <TouchableOpacity onPress={() => router.push('/(drawer)/add-contact')}>
            <Text style={styles.addText}>+ Add New</Text>
          </TouchableOpacity>
        </View>

        {contacts.length === 0 ? (
          <NeumorphicCard style={{ alignItems: 'center', padding: 24, marginBottom: 40 }}>
            <Text style={{ color: COLORS.textSecondary, marginBottom: 12 }}>No guardians added yet.</Text>
            <TouchableOpacity onPress={() => router.push('/(drawer)/add-contact')} style={styles.addGuardianBtn}>
              <Text style={{ color: '#FFF', fontWeight: '700' }}>Add Guardian</Text>
            </TouchableOpacity>
          </NeumorphicCard>
        ) : (
          <View style={{ marginBottom: 40 }}>
            {contacts.map((contact, index) => (
              <NeumorphicCard key={index} style={{ marginBottom: 16 }}>
                <View style={styles.contactRow}>
                  <View style={styles.contactAvatar}>
                    <Text style={styles.contactInitials}>{contact.name ? contact.name[0].toUpperCase() : 'G'}</Text>
                  </View>
                  <View style={styles.contactInfo}>
                    <Text style={styles.contactName}>{contact.name}</Text>
                    <Text style={styles.contactDetails}>{contact.phone} • {contact.relation}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteContact(index)} style={{ padding: 8 }}>
                    <Trash2 size={20} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              </NeumorphicCard>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: 8, height: 60 
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textPrimary },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  saveText: { fontSize: 16, fontWeight: '700', color: COLORS.purplePrimary },
  scrollContent: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatarCard: { width: 100, height: 100, borderRadius: 50 },
  avatarInner: { width: '100%', height: '100%', borderRadius: 50, backgroundColor: '#E5D5FF', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 40, fontWeight: '800', color: COLORS.purplePrimary },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 12, marginLeft: 8 },
  neuOuter: {
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
  },
  neuInner: {
    borderRadius: 20,
    backgroundColor: COLORS.bg,
    shadowColor: COLORS.highlight,
    shadowOffset: { width: -6, height: -6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  inputIcon: { marginTop: 10, marginRight: 12 },
  input: { flex: 1, fontSize: 16, color: COLORS.textPrimary, paddingVertical: 10 },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginLeft: 32, marginVertical: 8 },
  guardiansHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 8 },
  addText: { color: COLORS.purplePrimary, fontWeight: '700', fontSize: 14 },
  addGuardianBtn: { backgroundColor: COLORS.purplePrimary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center', marginRight: 12, shadowColor: COLORS.shadow, shadowOffset: {width: 2, height: 2}, shadowOpacity: 0.5, shadowRadius: 4, elevation: 2 },
  contactInitials: { fontSize: 16, fontWeight: '800', color: COLORS.purplePrimary },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  contactDetails: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
