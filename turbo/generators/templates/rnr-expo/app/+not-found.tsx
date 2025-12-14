import { Link, Stack } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';

const NOT_FOUND_SCREEN_OPTIONS = {
  title: 'Oops!'
};

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={NOT_FOUND_SCREEN_OPTIONS} />
      <View>
        <Text>This screen doesn't exist.</Text>

        <Link href="/">
          <Text>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
