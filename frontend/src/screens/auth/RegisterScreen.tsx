import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image
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

type RegisterScreenNavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen = () => {
  const navigation = useNavigation<RegisterScreenNavigationProp>();
  const { register, isLoading, error } = useAuthStore();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  
  // Estados para errores de validación
  const [nameError, setNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordConfirmError, setPasswordConfirmError] = useState('');

  // Funciones de validación
  const validateName = () => {
    if (!name.trim()) {
      setNameError('El nombre es obligatorio');
      return false;
    }
    setNameError('');
    return true;
  };

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

  const validatePasswordConfirm = () => {
    if (password !== passwordConfirm) {
      setPasswordConfirmError('Las contraseñas no coinciden');
      return false;
    }
    setPasswordConfirmError('');
    return true;
  };

  const handleRegister = async () => {
    const isNameValid = validateName();
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    const isPasswordConfirmValid = validatePasswordConfirm();

    if (isNameValid && isEmailValid && isPasswordValid && isPasswordConfirmValid) {
      await register(name, email, password, businessName);
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
        <View style={styles.headerContainer}>
          <Headline style={styles.title}>Crear cuenta</Headline>
          <Text style={styles.subtitle}>Regístrate para comenzar a usar VentaFácil</Text>
        </View>

        <View style={styles.formContainer}>
          <TextInput
            label="Nombre completo"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
            onBlur={validateName}
            error={!!nameError}
            disabled={isLoading}
          />
          {!!nameError && <HelperText type="error">{nameError}</HelperText>}

          <TextInput
            label="Correo electrónico"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            onBlur={validateEmail}
            error={!!emailError}
            disabled={isLoading}
          />
          {!!emailError && <HelperText type="error">{emailError}</HelperText>}

          <TextInput
            label="Nombre del negocio (opcional)"
            value={businessName}
            onChangeText={setBusinessName}
            mode="outlined"
            style={styles.input}
            disabled={isLoading}
          />

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

          <TextInput
            label="Confirmar contraseña"
            value={passwordConfirm}
            onChangeText={setPasswordConfirm}
            secureTextEntry={!isPasswordVisible}
            mode="outlined"
            style={styles.input}
            onBlur={validatePasswordConfirm}
            error={!!passwordConfirmError}
            disabled={isLoading}
          />
          {!!passwordConfirmError && <HelperText type="error">{passwordConfirmError}</HelperText>}
          
          {error && <HelperText type="error">{error}</HelperText>}

          <Button 
            mode="contained" 
            onPress={handleRegister} 
            style={styles.registerButton}
            disabled={isLoading}
          >
            {isLoading ? <ActivityIndicator color="#ffffff" /> : 'Registrarse'}
          </Button>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>¿Ya tienes una cuenta?</Text>
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('Login')}
              disabled={isLoading}
            >
              Iniciar sesión
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
  },
  headerContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 12,
  },
  registerButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  loginContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#757575',
  },
});

export default RegisterScreen;