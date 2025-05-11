import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Headline, 
  HelperText,
  ActivityIndicator
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAuthStore } from '../../store/authStore';

type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

type LoginScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen = () => {
  const navigation = useNavigation<LoginScreenNavigationProp>();
  const { login, isLoading, error } = useAuthStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Validación básica
  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('El correo electrónico es obligatorio');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Ingresa un correo electrónico válido');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('La contraseña es obligatoria');
      return false;
    } else if (password.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleLogin = async () => {
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (isEmailValid && isPasswordValid) {
      await login(email, password);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={20}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../../assets/icon.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Headline style={styles.appName}>VentaFácil</Headline>
          <Text style={styles.tagline}>Tu negocio, más simple</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
            onBlur={validateEmail}
            error={!!emailError}
            disabled={isLoading}
          />
          {!!emailError && <HelperText type="error">{emailError}</HelperText>}

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!isPasswordVisible}
            mode="outlined"
            style={styles.input}
            onBlur={validatePassword}
            error={!!passwordError}
            disabled={isLoading}
            right={
              <TextInput.Icon 
                icon={isPasswordVisible ? 'eye-off' : 'eye'} 
                onPress={() => setIsPasswordVisible(!isPasswordVisible)}
              />
            }
          />
          {!!passwordError && <HelperText type="error">{passwordError}</HelperText>}
          
          {error && <HelperText type="error">{error}</HelperText>}

          <Button 
            mode="contained" 
            onPress={handleLogin}
            style={styles.loginButton}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#ffffff" /> : 'Iniciar sesión'}
          </Button>

          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>¿No tienes una cuenta?</Text>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Register')}
              disabled={isLoading}
            >
              Registrarse
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 16,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  tagline: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 12,
  },
  loginButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  registerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#757575',
  },
});

export default LoginScreen;