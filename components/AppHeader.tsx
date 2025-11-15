// iOS-style bottom tab bar navigation
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (paths: string[]) => paths.some(path => pathname.includes(path));

  return (
    <View style={styles.tabBar}>
      {/* Home Tab */}
      <Pressable 
        onPress={() => router.push('/(tabs)' as any)}
        style={styles.tabButton}
      >
        <Ionicons 
          name={isActive(['/(tabs)']) ? 'home' : 'home-outline'} 
          size={24} 
          color={isActive(['/(tabs)']) ? Colors.red : Colors.lightGray} 
        />
        <Text style={[styles.tabText, isActive(['/(tabs)']) && styles.tabTextActive]}>
          Today
        </Text>
      </Pressable>

      {/* Plan Tab */}
      <Pressable 
        onPress={() => router.push('/plan/overview' as any)}
        style={styles.tabButton}
      >
        <Ionicons 
          name={isActive(['/plan/overview', '/plan/editor']) ? 'calendar' : 'calendar-outline'} 
          size={24} 
          color={isActive(['/plan/overview', '/plan/editor']) ? Colors.red : Colors.lightGray} 
        />
        <Text style={[styles.tabText, isActive(['/plan/overview', '/plan/editor']) && styles.tabTextActive]}>
          Plan
        </Text>
      </Pressable>

      {/* Progress Tab (placeholder for future) */}
      <Pressable 
        onPress={() => {}}
        style={styles.tabButton}
      >
        <Ionicons 
          name="stats-chart-outline" 
          size={24} 
          color={Colors.lightGray} 
        />
        <Text style={styles.tabText}>
          Progress
        </Text>
      </Pressable>

      {/* Settings Tab */}
      <Pressable 
        onPress={() => router.push('/settings' as any)}
        style={styles.tabButton}
      >
        <Ionicons 
          name={isActive(['/settings']) ? 'settings' : 'settings-outline'} 
          size={24} 
          color={isActive(['/settings']) ? Colors.red : Colors.lightGray} 
        />
        <Text style={[styles.tabText, isActive(['/settings']) && styles.tabTextActive]}>
          Settings
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.darkBlue,
    borderTopWidth: 0.5,
    borderTopColor: Colors.lightGray,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    ...Platform.select({
      ios: {
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 10,
    color: Colors.lightGray,
    marginTop: 4,
    fontWeight: '500',
  },
  tabTextActive: {
    color: Colors.red,
  },
});
