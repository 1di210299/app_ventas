import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Image,
  Alert,
  TouchableOpacity 
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Headline, 
  HelperText, 
  ActivityIndicator,
  IconButton
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useProductStore } from '../../store/productStore';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';

// Definimos los tipos para la navegación y route
type ProductsStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: number };
  ProductForm: { productId?: number };
};

type ProductFormScreenNavigationProp = StackNavigationProp<ProductsStackParamList, 'ProductForm'>;
type ProductFormScreenRouteProp = RouteProp<ProductsStackParamList, 'ProductForm'>;

const ProductFormScreen = () => {
  const navigation = useNavigation<ProductFormScreenNavigationProp>();
  const route = useRoute<ProductFormScreenRouteProp>();
  const { productId } = route.params || {};
  const isEditing = !!productId;

  const { products, isLoading, error, addProduct, updateProduct } = useProductStore();

  // Estados del formulario
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [barcode, setBarcode] = useState('');
  
  // Estados para la validación
  const [nameError, setNameError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [stockError, setStockError] = useState('');
  
  // Estados para la cámara y el escáner
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  // Si estamos editando, cargar datos del producto
  useEffect(() => {
    if (isEditing && productId) {
      const productToEdit = products.find(p => p.id === productId);
      if (productToEdit) {
        setName(productToEdit.name);
        setDescription(productToEdit.description || '');
        setPrice(productToEdit.price.toString());
        setCost(productToEdit.cost?.toString() || '');
        setStock(productToEdit.stock.toString());
        setImage(productToEdit.image || null);
        setBarcode(productToEdit.barcode || '');
      }
    }
  }, [isEditing, productId, products]);

  // Solicitar permisos de la cámara
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasCameraPermission(status === 'granted');
    })();
  }, []);

  // Funciones de validación
  const validateName = () => {
    if (!name.trim()) {
      setNameError('El nombre del producto es obligatorio');
      return false;
    }
    setNameError('');
    return true;
  };

  const validatePrice = () => {
    if (!price.trim()) {
      setPriceError('El precio es obligatorio');
      return false;
    }
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      setPriceError('El precio debe ser un número mayor que cero');
      return false;
    }
    setPriceError('');
    return true;
  };

  const validateStock = () => {
    if (!stock.trim()) {
      setStockError('El stock es obligatorio');
      return false;
    }
    const stockValue = parseInt(stock);
    if (isNaN(stockValue) || stockValue < 0) {
      setStockError('El stock debe ser un número entero mayor o igual a cero');
      return false;
    }
    setStockError('');
    return true;
  };

  // Manejador para seleccionar imagen
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  // Manejador para tomar una foto
  const takePicture = async () => {
    if (!hasCameraPermission) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para esta función');
      return;
    }
    setIsCameraOpen(true);
  };

  const handleCameraCapture = (photo: any) => {
    setImage(photo.uri);
    setIsCameraOpen(false);
  };

  // Manejador para escanear código de barras
  const scanBarcode = () => {
    if (!hasCameraPermission) {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la cámara para esta función');
      return;
    }
    setIsScannerOpen(true);
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setBarcode(data);
    setIsScannerOpen(false);
  };

  // Guardar el producto
  const handleSave = async () => {
    const isNameValid = validateName();
    const isPriceValid = validatePrice();
    const isStockValid = validateStock();

    if (isNameValid && isPriceValid && isStockValid) {
      const productData = {
        name,
        description,
        price: parseFloat(price),
        cost: cost ? parseFloat(cost) : undefined,
        stock: parseInt(stock),
        image,
        barcode
      };

      let result;
      if (isEditing && productId) {
        result = await updateProduct(productId, productData);
      } else {
        result = await addProduct(productData);
      }

      if (result) {
        navigation.goBack();
      }
    }
  };

  if (isCameraOpen) {
    return (
      <Camera
        style={styles.fullScreen}
        type={Camera.Constants.Type.back}
        onBarCodeScanned={undefined}
      >
        <View style={styles.cameraControls}>
          <IconButton
            icon="close"
            size={30}
            color="white"
            onPress={() => setIsCameraOpen(false)}
            style={styles.cameraButton}
          />
          <IconButton
            icon="camera"
            size={50}
            color="white"
            onPress={async () => {
              if (this.camera) {
                const photo = await this.camera.takePictureAsync({
                  quality: 0.5,
                  base64: true
                });
                handleCameraCapture(photo);
              }
            }}
            style={styles.cameraButton}
          />
        </View>
      </Camera>
    );
  }

  if (isScannerOpen) {
    return (
      <BarCodeScanner
        onBarCodeScanned={handleBarCodeScanned}
        style={styles.fullScreen}
      >
        <View style={styles.cameraControls}>
          <IconButton
            icon="close"
            size={30}
            color="white"
            onPress={() => setIsScannerOpen(false)}
            style={styles.cameraButton}
          />
        </View>
      </BarCodeScanner>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Headline style={styles.title}>
          {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
        </Headline>

        <TextInput
          label="Nombre del producto *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
          onBlur={validateName}
          error={!!nameError}
        />
        {!!nameError && <HelperText type="error">{nameError}</HelperText>}

        <TextInput
          label="Descripción"
          value={description}
          onChangeText={setDescription}
          mode="outlined"
          style={styles.input}
          multiline
          numberOfLines={3}
        />

        <TextInput
          label="Precio *"
          value={price}
          onChangeText={setPrice}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          onBlur={validatePrice}
          error={!!priceError}
          left={<TextInput.Affix text="S/" />}
        />
        {!!priceError && <HelperText type="error">{priceError}</HelperText>}

        <TextInput
          label="Costo"
          value={cost}
          onChangeText={setCost}
          mode="outlined"
          style={styles.input}
          keyboardType="decimal-pad"
          left={<TextInput.Affix text="S/" />}
        />

        <TextInput
          label="Stock *"
          value={stock}
          onChangeText={setStock}
          mode="outlined"
          style={styles.input}
          keyboardType="number-pad"
          onBlur={validateStock}
          error={!!stockError}
        />
        {!!stockError && <HelperText type="error">{stockError}</HelperText>}

        <View style={styles.barcodeContainer}>
          <TextInput
            label="Código de barras"
            value={barcode}
            onChangeText={setBarcode}
            mode="outlined"
            style={[styles.input, { flex: 1, marginRight: 8 }]}
          />
          <IconButton
            icon="barcode-scan"
            size={30}
            onPress={scanBarcode}
            style={styles.scanButton}
          />
        </View>

        <View style={styles.imageSection}>
          <Headline style={styles.imageTitle}>Imagen del producto</Headline>
          <View style={styles.imageContainer}>
            {image ? (
              <Image source={{ uri: image }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, styles.imagePlaceholder]}>
                <IconButton icon="image-outline" size={50} />
              </View>
            )}

            <View style={styles.imageButtons}>
              <Button
                mode="outlined"
                onPress={pickImage}
                style={styles.imageButton}
              >
                Elegir imagen
              </Button>
              <Button
                mode="outlined"
                onPress={takePicture}
                style={styles.imageButton}
              >
                Tomar foto
              </Button>
              {image && (
                <Button
                  mode="outlined"
                  onPress={() => setImage(null)}
                  style={styles.imageButton}
                  buttonColor="#F44336"
                >
                  Eliminar
                </Button>
              )}
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.button, styles.cancelButton]}
          >
            Cancelar
          </Button>
          <Button
            mode="contained"
            onPress={handleSave}
            style={[styles.button, styles.saveButton]}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size={20} />
            ) : (
              'Guardar'
            )}
          </Button>
        </View>

        {error && <HelperText type="error">{error}</HelperText>}
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
    padding: 16,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1E88E5',
  },
  input: {
    marginBottom: 12,
  },
  barcodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  scanButton: {
    backgroundColor: '#e0e0e0',
  },
  imageSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  imageTitle: {
    fontSize: 16,
    marginBottom: 8,
  },
  imageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  productImage: {
    width: 100,
    height: 100,
    borderRadius: 4,
  },
  imagePlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  imageButtons: {
    flex: 1,
    marginLeft: 16,
  },
  imageButton: {
    marginBottom: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    marginHorizontal: 4,
  },
  cancelButton: {
    borderColor: '#757575',
  },
  saveButton: {
    backgroundColor: '#1E88E5',
  },
  fullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  cameraControls: {
    flex: 1,
    backgroundColor: 'transparent',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: 20,
  },
  cameraButton: {
    marginBottom: 30,
  },
});

export default ProductFormScreen;