import React, { useEffect } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton, useTheme } from 'react-native-paper';

// Pantallas de autenticación
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Pantallas de productos
import ProductListScreen from '../screens/products/ProductListScreen';
import ProductDetailScreen from '../screens/products/ProductDetailScreen';
import ProductFormScreen from '../screens/products/ProductFormScreen';

// Pantallas de ventas
import SaleScreen from '../screens/sales/SaleScreen';
import SaleHistoryScreen from '../screens/sales/SaleHistoryScreen';

// Pantallas de reportes
import ReportScreen from '../screens/reports/ReportScreen';

// Estado global
import { useAuthStore } from '../store/authStore';

// Tipos para la navegación
type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type ProductsStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: number };
  ProductForm: { productId?: number };
};

type SalesStackParamList = {
  Sale: undefined;
  SaleHistory: undefined;
};

type ReportsStackParamList = {
  Report: undefined;
};

type MainTabParamList = {
  ProductsStack: undefined;
  SalesStack: undefined;
  ReportsStack: undefined;
};

type RootStackParamList = {
  AuthStack: undefined;
  MainTab: undefined;
};

// Creación de navegadores
const AuthStack = createStackNavigator<AuthStackParamList>();
const ProductsStack = createStackNavigator<ProductsStackParamList>();
const SalesStack = createStackNavigator<SalesStackParamList>();
const ReportsStack = createStackNavigator<ReportsStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

// Navegador de autenticación
const AuthNavigator = () => {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
};

// Navegador de productos
const ProductsNavigator = () => {
  const theme = useTheme();

  return (
    <ProductsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
      }}
    >
      <ProductsStack.Screen 
        name="ProductList" 
        component={ProductListScreen} 
        options={({ navigation }) => ({
          title: 'Productos',
          headerRight: () => (
            <IconButton
              icon="plus"
              color="#fff"
              size={24}
              onPress={() => navigation.navigate('ProductForm')}
            />
          ),
        })}
      />
      <ProductsStack.Screen 
        name="ProductDetail" 
        component={ProductDetailScreen}
        options={{ title: 'Detalle del producto' }}
      />
      <ProductsStack.Screen 
        name="ProductForm" 
        component={ProductFormScreen}
        options={({ route }) => ({
          title: route.params?.productId ? 'Editar producto' : 'Nuevo producto',
        })}
      />
    </ProductsStack.Navigator>
  );
};

// Navegador de ventas
const SalesNavigator = () => {
  const theme = useTheme();

  return (
    <SalesStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
      }}
    >
      <SalesStack.Screen 
        name="Sale" 
        component={SaleScreen} 
        options={({ navigation }) => ({
          title: 'Nueva venta',
          headerRight: () => (
            <IconButton
              icon="history"
              color="#fff"
              size={24}
              onPress={() => navigation.navigate('SaleHistory')}
            />
          ),
        })}
      />
      <SalesStack.Screen 
        name="SaleHistory" 
        component={SaleHistoryScreen}
        options={{ title: 'Historial de ventas' }}
      />
    </SalesStack.Navigator>
  );
};

// Navegador de reportes
const ReportsNavigator = () => {
  const theme = useTheme();

  return (
    <ReportsStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.primary,
        },
        headerTintColor: '#fff',
      }}
    >
      <ReportsStack.Screen 
        name="Report" 
        component={ReportScreen} 
        options={{ title: 'Reportes' }}
      />
    </ReportsStack.Navigator>
  );
};

// Navegador de pestañas principal
const MainNavigator = () => {
  return (
    <MainTab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: string = 'home';

          if (route.name === 'ProductsStack') {
            iconName = focused ? 'package-variant-closed' : 'package-variant';
          } else if (route.name === 'SalesStack') {
            iconName = focused ? 'point-of-sale' : 'cash-register';
          } else if (route.name === 'ReportsStack') {
            iconName = focused ? 'chart-bar' : 'chart-line';
          }

          return <MaterialCommunityIcons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1E88E5',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <MainTab.Screen 
        name="SalesStack" 
        component={SalesNavigator} 
        options={{ title: 'Ventas' }}
      />
      <MainTab.Screen 
        name="ProductsStack" 
        component={ProductsNavigator} 
        options={{ title: 'Productos' }}
      />
      <MainTab.Screen 
        name="ReportsStack" 
        component={ReportsNavigator} 
        options={{ title: 'Reportes' }}
      />
    </MainTab.Navigator>
  );
};

// Navegador raíz
const AppNavigator = () => {
  const { isAuthenticated, verifyToken } = useAuthStore();

  // Verificar autenticación al iniciar
  useEffect(() => {
    verifyToken();
  }, []);

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="MainTab" component={MainNavigator} />
        ) : (
          <RootStack.Screen name="AuthStack" component={AuthNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;