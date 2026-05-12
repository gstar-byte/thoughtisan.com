import React from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { User as UserIcon, X } from 'lucide-react-native';
import type { UserProfile } from '../types';
import { PAYWALL_ACTIVE } from '../featureFlags';

function CrownJewel({ size = 22 }: { size?: number }) {
  return (
    <Text
      style={{
        fontSize: size,
        lineHeight: size * 1.15,
        textShadowColor: '#FFD700',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 5,
        includeFontPadding: false,
      }}
    >
      👑
    </Text>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpgrade: () => void;
  onDowngrade: () => void;
};

type ProFeatureRow = {
  label: string;
  sub: string;
  /** Free: toggling on opens paywall; switch stays off until user is Pro. */
  openPaywallOnToggle?: boolean;
};

const PRO_FEATURE_ROWS: ProFeatureRow[] = [
  {
    label: 'Video in notes',
    sub: 'Attach video clips to capsules alongside photos (Pro).',
    openPaywallOnToggle: true,
  },
  {
    label: 'Desktop home screen widget',
    sub: 'Pin capture and glanceable notes on your launcher (Pro).',
    openPaywallOnToggle: true,
  },
  {
    label: 'Persistent notification',
    sub: 'Shade shortcut / ongoing tile to capture without opening the app.',
  },
  {
    label: 'Edge swipe capture',
    sub: 'Swipe from the screen edge to start a quick note.',
  },
  {
    label: 'Volume-key quick capture',
    sub: 'Wake capture from hardware keys when the OS allows it.',
  },
];

export function SettingsModalMobile({
  visible,
  onClose,
  user,
  onUpgrade,
  onDowngrade,
}: Props) {
  if (!visible) return null;

  const isPro = !!user?.isPremium;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <View style={styles.headLeft}>
              <CrownJewel size={24} />
              <Text style={styles.title}>Settings</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.body}>
            {!PAYWALL_ACTIVE ? (
              <View style={styles.proBanner}>
                <Text style={styles.proBannerCrown}>👑</Text>
                <Text style={styles.proBannerTxt}>
                  All features available. Paywall is off until billing is connected.
                </Text>
              </View>
            ) : !user?.isPremium ? (
              <TouchableOpacity style={styles.upgradeHero} onPress={onUpgrade} activeOpacity={0.9}>
                <CrownJewel size={22} />
                <Text style={styles.upgradeHeroTxt}>Upgrade to Pro</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.proBanner}>
                <Text style={styles.proBannerCrown}>👑</Text>
                <Text style={styles.proBannerTxt}>You have Idea Capsule Pro</Text>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.accountRow}>
                {user?.photoURL ? (
                  <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPh}>
                    <UserIcon size={24} color="#007AFF" />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>
                    {user?.displayName || (user ? 'User' : 'Guest')}
                  </Text>
                  <Text style={styles.email} numberOfLines={1}>
                    {user?.email || 'Not signed in'}
                  </Text>
                </View>
              </View>

              <View style={styles.tierRow}>
                <View>
                  <Text style={styles.tierLbl}>ACCOUNT</Text>
                  {!PAYWALL_ACTIVE ? (
                    <Text style={styles.tierFree}>Full access</Text>
                  ) : user?.isPremium ? (
                    <View style={styles.tierPro}>
                      <Text style={styles.tierCrown}>👑</Text>
                      <Text style={styles.tierProTxt}>Idea Capsule Pro</Text>
                    </View>
                  ) : (
                    <Text style={styles.tierFree}>Free</Text>
                  )}
                </View>
                {PAYWALL_ACTIVE && user?.isPremium ? (
                  <TouchableOpacity style={styles.downBtn} onPress={onDowngrade}>
                    <Text style={styles.downBtnTxt}>Downgrade</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            <Text style={styles.sectionLbl}>PRO FEATURES</Text>
            <View style={styles.proCard}>
              {PRO_FEATURE_ROWS.map((row, i) => (
                <View
                  key={row.label}
                  style={[
                    styles.proRow,
                    i === PRO_FEATURE_ROWS.length - 1 && { borderBottomWidth: 0 },
                  ]}
                >
                  <View style={{ flex: 1, minWidth: 0, paddingRight: 8 }}>
                    <Text style={styles.rowTitle}>{row.label}</Text>
                    <Text style={styles.rowSub}>{row.sub}</Text>
                  </View>
                  <View style={styles.switchHit}>
                    <Switch
                      value={isPro}
                      onValueChange={(next) => {
                        if (next && !isPro) {
                          onUpgrade();
                        }
                      }}
                      disabled={isPro}
                      trackColor={{ false: '#E5E5EA', true: '#34C759' }}
                      thumbColor="#FFF"
                      ios_backgroundColor="#E5E5EA"
                    />
                  </View>
                </View>
              ))}
              {!isPro ? (
                <Text style={styles.proHint}>
                  Turn a switch on to open checkout — subscribe to unlock everything.
                </Text>
              ) : null}
            </View>

            <TouchableOpacity style={styles.done} onPress={onClose}>
              <Text style={styles.doneTxt}>Done</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '88%',
    backgroundColor: '#F2F2F7',
    borderRadius: 28,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: '#1D1D1F' },
  closeBtn: { padding: 8, backgroundColor: '#F2F2F7', borderRadius: 999 },
  body: { padding: 16, paddingBottom: 28 },
  upgradeHero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  upgradeHeroTxt: { color: '#FFF', fontWeight: '900', fontSize: 17 },
  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(175,82,222,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 12,
  },
  proBannerCrown: { fontSize: 18 },
  proBannerTxt: { color: '#1D1D1F', fontWeight: '800', fontSize: 14, flex: 1 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E5E5EA' },
  avatarPh: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,122,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 17, fontWeight: '800', color: '#1D1D1F' },
  email: { fontSize: 13, color: '#8E8E93', marginTop: 2 },
  tierRow: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tierLbl: { fontSize: 11, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.5 },
  tierFree: { fontSize: 15, fontWeight: '800', color: '#1D1D1F', marginTop: 4 },
  tierPro: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  tierCrown: { fontSize: 16 },
  tierProTxt: { fontSize: 15, fontWeight: '800', color: '#AF52DE' },
  downBtn: {
    borderWidth: 1,
    borderColor: '#FF3B30',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  downBtnTxt: { color: '#FF3B30', fontWeight: '800', fontSize: 13 },
  sectionLbl: {
    fontSize: 11,
    fontWeight: '900',
    color: '#8E8E93',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 4,
  },
  proCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
  },
  proRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  rowTitle: { fontSize: 14, fontWeight: '800', color: '#1D1D1F' },
  rowSub: { fontSize: 12, fontWeight: '600', color: '#8E8E93', marginTop: 4, lineHeight: 16 },
  proHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  switchHit: {
    position: 'relative',
    alignSelf: 'flex-end',
    minWidth: 52,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  done: { alignItems: 'center', padding: 12, marginTop: 8 },
  doneTxt: { color: '#007AFF', fontWeight: '800', fontSize: 16 },
});
