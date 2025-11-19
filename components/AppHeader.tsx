// iOS-style bottom tab bar navigation
import { Colors } from '@/constants/colors';
import { Ionicons } from '@expo/vector-icons';
import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  const isActive = (paths: string[]) => paths.some(path => pathname === path || pathname.startsWith(path + '/'));

  // Check if we're on the home page (exact match or just /(tabs))
  const isHomePage = pathname === '/' || pathname === '/(tabs)' || pathname === '/(tabs)/index';
  
  // Check if we're on the progress page
  const isProgressPage = pathname === '/(tabs)/progress' || pathname.includes('/progress');

  return (
    <View style={styles.tabBar}>
      {/* Home Tab */}
      <Pressable 
        onPress={() => router.push('/(tabs)' as any)}
        style={styles.tabButton}
      >
        <Ionicons 
          name={isHomePage ? 'home' : 'home-outline'} 
          size={24} 
          color={isHomePage ? Colors.red : Colors.lightGray} 
        />
        <Text style={[styles.tabText, isHomePage && styles.tabTextActive]}>
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

      {/* Progress Tab */}
      <Pressable 
        onPress={() => router.push('/(tabs)/progress' as any)}
        style={styles.tabButton}
      >
        <Ionicons 
          name={isProgressPage ? 'stats-chart' : 'stats-chart-outline'} 
          size={24} 
          color={isProgressPage ? Colors.red : Colors.lightGray} 
        />
        <Text style={[styles.tabText, isProgressPage && styles.tabTextActive]}>
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
    backgroundColor: '#000000',
    borderTopWidth: 0.5,
    borderTopColor: '#333333',
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
