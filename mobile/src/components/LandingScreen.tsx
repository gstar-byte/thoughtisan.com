import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Apple, ArrowRight, Play, Sparkles } from 'lucide-react-native';
import { GoogleSignInButton } from './GoogleSignInButton';

type Props = {
  onEmailAuth: () => void;
  onFacebookPress: () => void;
};

/** 与 https://idea-capsule-ten.vercel.app/ 主文案、区块结构对齐（简化为 RN 可滚动版） */
export function LandingScreen({ onEmailAuth, onFacebookPress }: Props) {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const sendDemo = () => {
    Alert.alert('Message sent (demo)!', 'Same demo behavior as the web landing page.');
    setContactName('');
    setContactEmail('');
    setContactMsg('');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0A0A0A', '#12121a', '#0A0A0A']}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.nav}>
            <Text style={styles.brand}>Idea Capsule</Text>
            <View style={styles.navActions}>
              <TouchableOpacity onPress={onEmailAuth}>
                <Text style={styles.navLink}>Log in</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navCta} onPress={onEmailAuth}>
                <Text style={styles.navCtaTxt}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.heroGlow}>
            <LinearGradient
              colors={['rgba(0,122,255,0.35)', 'rgba(175,82,222,0.2)', 'transparent']}
              style={styles.blob}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          </View>

          <View style={styles.badge}>
            <Sparkles size={14} color="#007AFF" />
            <Text style={styles.badgeTxt}>BLAZING FAST INSPIRATION CAPTURE</Text>
          </View>

          <Text style={styles.h1}>
            Capture at the{'\n'}
            <Text style={styles.h1Grad}>speed of light.</Text>
          </Text>
          <Text style={styles.sub}>
            Tasks, notes, to-dos, and pure journal entries. Set repeating reminders
            and countdown days. Ensure you never forget or miss a beat again.
          </Text>

          <TouchableOpacity style={styles.primaryCta} onPress={onEmailAuth}>
            <Text style={styles.primaryCtaTxt}>Get Started for Free</Text>
            <ArrowRight size={20} color="#000" />
          </TouchableOpacity>

          <View style={styles.socialRow}>
            <GoogleSignInButton variant="dark" />
            <TouchableOpacity style={styles.fbBtn} onPress={onFacebookPress}>
              <Text style={styles.fbIcon}>f</Text>
              <Text style={styles.fbTxt}>Facebook</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionDivider}>
            <Text style={styles.comingSoon}>COMING SOON ON MOBILE</Text>
            <View style={styles.storeRow}>
              <TouchableOpacity style={styles.storeCard} activeOpacity={0.85}>
                <Apple size={26} color="#FFF" />
                <View>
                  <Text style={styles.storeSmall}>Download on the</Text>
                  <Text style={styles.storeBig}>App Store</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.storeCard} activeOpacity={0.85}>
                <Play size={24} color="#FFF" fill="#FFF" />
                <View>
                  <Text style={styles.storeSmall}>GET IT ON</Text>
                  <Text style={styles.storeBig}>Google Play</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.sectionTitle}>
            Seamlessly Integrated.{'\n'}
            Flawlessly Beautiful.
          </Text>
          <Text style={styles.sectionSub}>
            Use Idea Capsule as list or grid, on any device.
          </Text>

          <View style={styles.mockBrowser}>
            <View style={styles.mockTraffic}>
              <View style={[styles.dot, { backgroundColor: '#FF5F57' }]} />
              <View style={[styles.dot, { backgroundColor: '#FFBD2E' }]} />
              <View style={[styles.dot, { backgroundColor: '#28CA42' }]} />
            </View>
            <View style={styles.mockCapture}>
              <Text style={styles.mockPlaceholder}>Capture anything...</Text>
            </View>
            <View style={[styles.mockCard, { backgroundColor: '#FFCA28' }]}>
              <View style={styles.mockTodo} />
              <View style={styles.mockLine} />
              <View style={styles.mockTag}>
                <Text style={styles.mockTagTxt}>IDEA</Text>
              </View>
            </View>
            <View style={[styles.mockCard, { backgroundColor: '#AF52DE' }]}>
              <View style={styles.mockTodo} />
              <View style={[styles.mockLine, { width: '66%' }]} />
            </View>
            <View style={[styles.mockCard, { backgroundColor: '#007AFF' }]}>
              <Text style={styles.mockCheck}>✔</Text>
              <View style={[styles.mockLine, { width: '40%', opacity: 0.6 }]} />
            </View>
          </View>

          <Text style={styles.featureSanctuary}>The ultimate productivity sanctuary.</Text>
          <Text style={styles.featureSanctuarySub}>
            Features built deeply into the core experience.
          </Text>

          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.craftTitle}>Let&apos;s craft the future.</Text>
          <Text style={styles.craftBody}>
            Idea Capsule is built with an obsession for speed, minimalism, and visual
            emotion. Have feedback or want to reach out? Drop a line below.
          </Text>

          <View style={styles.hqBox}>
            <Text style={styles.hqLbl}>COMPANY HQ</Text>
            <Text style={styles.hqLine}>1440 Innovation Park Dr.</Text>
            <Text style={styles.hqLine}>San Francisco, CA 94158</Text>
            <Text style={styles.hqLine}>United States</Text>
            <Text style={[styles.hqLbl, { marginTop: 14 }]}>DIRECT CONTACT</Text>
            <Text style={styles.hqMail}>hello@ideacapsule.dev</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Send a Message</Text>
            <TextInput
              style={styles.input}
              placeholder="Your full name"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={contactName}
              onChangeText={setContactName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="rgba(255,255,255,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
              value={contactEmail}
              onChangeText={setContactEmail}
            />
            <TextInput
              style={[styles.input, styles.textarea]}
              placeholder="What's on your mind?"
              placeholderTextColor="rgba(255,255,255,0.35)"
              multiline
              value={contactMsg}
              onChangeText={setContactMsg}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendDemo}>
              <Text style={styles.sendBtnTxt}>Send Transmission</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerBrand}>Idea Capsule</Text>
            <Text style={styles.footerCopy}>
              Designed for speed. Engineered for precision. ©{' '}
              {new Date().getFullYear()} All rights reserved.
            </Text>
            <View style={styles.footerLinks}>
              <Text style={styles.footerLink}>Terms</Text>
              <Text style={styles.footerDot}>·</Text>
              <Text style={styles.footerLink}>Privacy</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const FEATURES = [
  {
    title: 'Countdown & Deadlines',
    desc: 'Set specific dates and see exactly how many days are left. Always stay ahead of schedule.',
  },
  {
    title: 'Repeating Reminders',
    desc: 'Daily, weekly, or monthly—set your routines on autopilot. Habits are formed effortlessly.',
  },
  {
    title: 'To-Dos & Checklists',
    desc: 'Seamlessly transition any thought into a concrete to-do item. Track progress instantly.',
  },
  {
    title: 'Color Aesthetics',
    desc: 'Group by vibrant colors or strict categories. Visual organization that feels purely natural.',
  },
  {
    title: 'Adaptive Views',
    desc: 'Toggle between dynamic lists or dense grids depending on your desired scope of view.',
  },
  {
    title: 'Universal Sync',
    desc: 'Secure real-time cloud sync ensures your data perfectly mirrors across PC, tablet, and mobile.',
  },
];

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0A0A' },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  brand: { color: '#FFF', fontWeight: '800', fontSize: 17 },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navLink: { color: 'rgba(255,255,255,0.7)', fontWeight: '600', fontSize: 14 },
  navCta: {
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  navCtaTxt: { color: '#000', fontWeight: '800', fontSize: 13 },
  heroGlow: { height: 120, marginTop: 8, marginBottom: -40 },
  blob: {
    position: 'absolute',
    top: 0,
    left: '8%',
    width: 300,
    height: 200,
    borderRadius: 100,
    opacity: 0.9,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 24,
  },
  badgeTxt: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  h1: {
    color: '#FFF',
    fontSize: 36,
    fontWeight: '900',
    lineHeight: 42,
    marginTop: 28,
    textAlign: 'center',
  },
  h1Grad: { color: '#93B8FF' },
  sub: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 17,
    lineHeight: 26,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 4,
  },
  primaryCta: {
    marginTop: 28,
    backgroundColor: '#FFF',
    borderRadius: 999,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaTxt: { color: '#000', fontWeight: '900', fontSize: 16 },
  socialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
  },
  fbBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(24,119,242,0.35)',
    backgroundColor: 'rgba(24,119,242,0.12)',
  },
  fbIcon: { color: '#1877F2', fontWeight: '900', fontSize: 16 },
  fbTxt: { color: '#8EB7FF', fontWeight: '800', fontSize: 16 },
  sectionDivider: {
    marginTop: 40,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  comingSoon: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 16,
  },
  storeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#1D1D1F',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    width: 176,
  },
  storeSmall: { color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: '600' },
  storeBig: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 2 },
  sectionTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 44,
    lineHeight: 30,
  },
  sectionSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  mockBrowser: {
    backgroundColor: '#FAFAFC',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  mockTraffic: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  mockCapture: {
    height: 40,
    borderRadius: 999,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  mockPlaceholder: { color: 'rgba(0,0,0,0.28)', fontSize: 13, fontWeight: '600' },
  mockCard: {
    height: 56,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  mockTodo: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.25)',
    marginRight: 12,
  },
  mockLine: { width: '50%', height: 10, borderRadius: 4, backgroundColor: 'rgba(0,0,0,0.2)' },
  mockTag: {
    position: 'absolute',
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  mockTagTxt: { fontSize: 9, fontWeight: '900', color: 'rgba(0,0,0,0.5)' },
  mockCheck: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
    marginRight: 12,
    width: 20,
    textAlign: 'center',
  },
  featureSanctuary: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 30,
  },
  featureSanctuarySub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 17,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  featureGrid: { gap: 12, marginTop: 16 },
  featureCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  featureTitle: { color: '#FFF', fontWeight: '800', fontSize: 17, marginBottom: 8 },
  featureDesc: { color: 'rgba(255,255,255,0.48)', fontSize: 14, lineHeight: 22 },
  craftTitle: {
    color: '#FFF',
    fontSize: 28,
    fontWeight: '900',
    marginTop: 48,
    marginBottom: 12,
  },
  craftBody: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  hqBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  hqLbl: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  hqLine: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '600', marginTop: 4 },
  hqMail: { color: '#007AFF', fontSize: 16, fontWeight: '700', marginTop: 6 },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 32,
  },
  formTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 18 },
  input: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  sendBtn: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  sendBtnTxt: { color: '#000', fontWeight: '900', fontSize: 16 },
  footer: { alignItems: 'center', paddingVertical: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  footerBrand: { color: 'rgba(255,255,255,0.85)', fontWeight: '800', marginBottom: 8 },
  footerCopy: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLinks: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  footerLink: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' },
  footerDot: { color: 'rgba(255,255,255,0.35)' },
});
