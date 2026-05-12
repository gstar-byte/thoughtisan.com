import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Zap, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import type { UserProfile } from '../types';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onSuccess: () => void | Promise<void>;
  /** Optional deployed web URL for PayPal checkout */
  marketingWebUrl?: string;
};

export function PremiumModalMobile({
  visible,
  onClose,
  user,
  onSuccess,
  marketingWebUrl = 'https://ai.studio',
}: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!visible) return null;

  const testUnlock = async () => {
    setErr(null);
    setBusy(true);
    try {
      await onSuccess();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <LinearGradient
            colors={['#007AFF', '#AF52DE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.header}
          >
            <TouchableOpacity style={styles.closeHit} onPress={onClose}>
              <X size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.iconWrap}>
              <Zap size={32} color="#FFF" fill="#FFF" />
            </View>
            <Text style={styles.h2}>Upgrade to Pro</Text>
            <Text style={styles.subH}>
              Lifetime access. One payment — unlock everything on mobile and web.
            </Text>
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.priceBox}>
              <Text style={styles.priceLbl}>LIFETIME</Text>
              <View style={styles.priceRow}>
                <Text style={styles.priceMain}>$88.99</Text>
                <Text style={styles.priceStrike}>$129.99</Text>
              </View>
              <Text style={styles.paypalNote}>
                Complete checkout on the web with PayPal (sandbox vs production uses Vite env on web).
              </Text>
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => Linking.openURL(marketingWebUrl).catch(() => undefined)}
              >
                <Text style={styles.linkBtnTxt}>Open web to purchase</Text>
              </TouchableOpacity>
            </View>

            {err ? <Text style={styles.err}>{err}</Text> : null}

            {busy ? (
              <ActivityIndicator style={{ marginVertical: 16 }} size="large" color="#007AFF" />
            ) : (
              <TouchableOpacity style={styles.testVip} onPress={testUnlock}>
                <Text style={styles.testVipCrown}>👑</Text>
                <Text style={styles.testVipTxt}>Test unlock Pro (matches web VIP test)</Text>
              </TouchableOpacity>
            )}

            <Text style={styles.disclaimer}>
              Signed in as: {user?.email ?? '—'}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: '#FFF',
    borderRadius: 28,
    overflow: 'hidden',
  },
  header: { padding: 24, paddingTop: 44 },
  closeHit: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  h2: { color: '#FFF', fontSize: 26, fontWeight: '900' },
  subH: { color: 'rgba(255,255,255,0.88)', fontSize: 14, marginTop: 8, lineHeight: 20 },
  body: { padding: 20, paddingBottom: 28 },
  priceBox: {
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
  },
  priceLbl: {
    color: '#8E8E93',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 6 },
  priceMain: { fontSize: 34, fontWeight: '900', color: '#1D1D1F' },
  priceStrike: {
    fontSize: 18,
    fontWeight: '700',
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  paypalNote: { color: '#8E8E93', fontSize: 12, marginTop: 12, lineHeight: 18 },
  linkBtn: { marginTop: 12 },
  linkBtnTxt: { color: '#007AFF', fontWeight: '800', fontSize: 14 },
  err: {
    color: '#FF3B30',
    fontSize: 13,
    marginBottom: 8,
    backgroundColor: '#FFF2F2',
    padding: 10,
    borderRadius: 12,
  },
  testVip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#AF52DE',
    paddingVertical: 14,
    borderRadius: 999,
    marginTop: 8,
  },
  testVipCrown: { fontSize: 18 },
  testVipTxt: { color: '#FFF', fontWeight: '800', fontSize: 15 },
  disclaimer: {
    textAlign: 'center',
    color: '#8E8E93',
    fontSize: 11,
    marginTop: 16,
    lineHeight: 16,
  },
});
