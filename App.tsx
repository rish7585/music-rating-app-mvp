import { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Tab = 'Feed' | 'Rate' | 'Rankings' | 'Friends' | 'Profile';

const tabs: Tab[] = ['Feed', 'Rate', 'Rankings', 'Friends', 'Profile'];

const feed = [
  { user: 'Sarvesh', action: 'moved Nights to Life Song', detail: 'Frank Ocean', meta: '🔥 8  💬 3' },
  { user: 'Rishvin', action: 'rated 90210 Elite', detail: 'Travis Scott', meta: '🔥 5  💬 1' },
  { user: 'Akshith', action: 'added Pink + White to Heavy Rotation', detail: 'Frank Ocean', meta: '🔥 4  💬 2' },
];

const rankings = [
  { title: 'Nights', artist: 'Frank Ocean', tier: 'Life Song', score: 1000 },
  { title: '90210', artist: 'Travis Scott', tier: 'Elite', score: 920 },
  { title: 'Pink + White', artist: 'Frank Ocean', tier: 'Elite', score: 895 },
  { title: 'SICKO MODE', artist: 'Travis Scott', tier: 'Heavy Rotation', score: 760 },
];

const friends = [
  { name: 'Sarvesh', compatibility: 88, sound: 'late-night rap and Frank Ocean' },
  { name: 'Akshith', compatibility: 74, sound: 'nostalgic alt-pop' },
  { name: 'Rohan', compatibility: 61, sound: 'gym rotation' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('Feed');

  return (
    <SafeAreaView style={styles.app}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        {tab === 'Feed' && <Feed />}
        {tab === 'Rate' && <Rate />}
        {tab === 'Rankings' && <Rankings />}
        {tab === 'Friends' && <Friends />}
        {tab === 'Profile' && <Profile />}
      </ScrollView>
      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <TouchableOpacity key={item} onPress={() => setTab(item)} style={styles.tabButton}>
            <Text style={[styles.tabText, tab === item && styles.activeTab]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

function Feed() {
  return (
    <View style={styles.screen}>
      <Header title="Friend activity" subtitle="Airbuds-style updates from your people." />
      {feed.map((item) => (
        <Card key={item.action}>
          <Text style={styles.muted}>{item.user}</Text>
          <Text style={styles.cardTitle}>{item.action}</Text>
          <Text style={styles.muted}>{item.detail}</Text>
          <Text style={styles.meta}>{item.meta}</Text>
        </Card>
      ))}
    </View>
  );
}

function Rate() {
  return (
    <View style={styles.screen}>
      <Header title="Rate a song" subtitle="Beli-style ratings, but for music." />
      {['Life Song', 'Elite', 'Heavy Rotation', 'Liked', 'Not For Me'].map((tier) => (
        <TouchableOpacity key={tier} style={styles.tierButton}>
          <Text style={styles.cardTitle}>{tier}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.primaryButton}>
        <Text style={styles.primaryText}>Save rating</Text>
      </TouchableOpacity>
    </View>
  );
}

function Rankings() {
  return (
    <View style={styles.screen}>
      <Header title="Your rankings" subtitle="A ranked taste graph for songs, albums, and artists." />
      {rankings.map((track, index) => (
        <Card key={track.title}>
          <Text style={styles.rank}>#{index + 1}</Text>
          <Text style={styles.cardTitle}>{track.title}</Text>
          <Text style={styles.muted}>{track.artist} • {track.tier} • {track.score}</Text>
        </Card>
      ))}
    </View>
  );
}

function Friends() {
  return (
    <View style={styles.screen}>
      <Header title="Friends" subtitle="Follow music taste, not just listening history." />
      {friends.map((friend) => (
        <Card key={friend.name}>
          <Text style={styles.cardTitle}>{friend.name}</Text>
          <Text style={styles.muted}>{friend.sound}</Text>
          <Text style={styles.compatibility}>{friend.compatibility}% compatible</Text>
        </Card>
      ))}
    </View>
  );
}

function Profile() {
  return (
    <View style={styles.screen}>
      <Header title="Rishvin" subtitle="@rish7585" />
      <Card>
        <Text style={styles.cardTitle}>Taste identity</Text>
        <Text style={styles.muted}>Rap-heavy, late-night Frank Ocean, gym rotation, nostalgia bias.</Text>
      </Card>
      <Card>
        <Text style={styles.cardTitle}>Life Songs</Text>
        <Text style={styles.muted}>1. Nights — Frank Ocean</Text>
        <Text style={styles.muted}>2. 90210 — Travis Scott</Text>
        <Text style={styles.muted}>3. Pink + White — Frank Ocean</Text>
      </Card>
    </View>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

const styles = StyleSheet.create({
  app: { flex: 1, backgroundColor: '#0F0F14' },
  content: { padding: 18, paddingBottom: 110 },
  screen: { gap: 14 },
  title: { color: '#F7F7FB', fontSize: 30, fontWeight: '900' },
  subtitle: { color: '#9A9AA8', fontSize: 15, marginTop: 6 },
  card: { backgroundColor: '#222231', borderColor: '#2D2D3A', borderWidth: 1, borderRadius: 22, padding: 16, gap: 6 },
  cardTitle: { color: '#F7F7FB', fontSize: 17, fontWeight: '800' },
  muted: { color: '#9A9AA8', fontSize: 14, lineHeight: 20 },
  meta: { color: '#A78BFA', marginTop: 8, fontWeight: '700' },
  rank: { color: '#A78BFA', fontSize: 20, fontWeight: '900' },
  compatibility: { color: '#34D399', marginTop: 8, fontWeight: '900' },
  tierButton: { backgroundColor: '#181821', borderColor: '#2D2D3A', borderWidth: 1, borderRadius: 16, padding: 16 },
  primaryButton: { backgroundColor: '#A78BFA', borderRadius: 18, padding: 16, alignItems: 'center' },
  primaryText: { color: '#111118', fontWeight: '900' },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#181821', borderTopColor: '#2D2D3A', borderTopWidth: 1, paddingBottom: 20, paddingTop: 10 },
  tabButton: { flex: 1, alignItems: 'center' },
  tabText: { color: '#9A9AA8', fontSize: 12, fontWeight: '700' },
  activeTab: { color: '#A78BFA' },
});
