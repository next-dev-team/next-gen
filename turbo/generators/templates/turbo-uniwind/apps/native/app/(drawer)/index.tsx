import { Text, View, TouchableOpacity } from "react-native";
import { Container } from "@/components/container";
import { Card, Chip, useThemeColor } from "heroui-native";

export default function Home() {
	return (
		<Container className="p-6">
			<View className="py-4 mb-6">
				<Text className="text-4xl font-bold text-foreground mb-2">
					BETTER T STACK
				</Text>
			</View>
		</Container>
	);
}
