import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Button, Card, Chip, Title, Paragraph, List } from 'react-native-paper';
import { Camera } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { classifyProduct, RecognitionResult, loadModel } from '../../services/productAIService';

interface ProductClassifierProps {
  onProductClassified: (result: RecognitionResult) => void;
  onClose: () => void;
}

const ProductClassifier: React.FC<ProductClassifierProps> = ({ onProductClassified, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [cameraType, setCameraType] = useState(Camera.Constants.Type.back);
  const [cameraRef, setCameraRef] = useState<Camera | null>(null);

  useEffect(() => {
    (async () => {
      // Solicitar permisos de cámara
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
      
      // Cargar el modelo de IA
      try {
        await loadModel();
        setIsModelLoading(false);
      } catch (error) {
        console.error('Error al cargar el modelo:', error);
        setIsModelLoading(false);
      }
    })();
  }, []);

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync();
        setImageUri(photo.uri);
      } catch (error) {
        console.error('Error al tomar foto:', error);
      }
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error al seleccionar imagen:', error);
    }
  };

  const handleClassify = async () => {
    if (imageUri) {
      setIsClassifying(true);
      try {
        const result = await classifyProduct(imageUri);
        onProductClassified(result);
      } catch (error) {
        console.error('Error al clasificar la imagen:', error);
      } finally {
        setIsClassifying(false);
      }
    }
  };

  const resetImage = () => {
    setImageUri(null);
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.text}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>No hay acceso a la cámara</Text>
        <Button mode="contained" onPress={onClose} style={styles.button}>
          Volver
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isModelLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Cargando modelo de IA...</Text>
        </View>
      ) : imageUri ? (
        <View style={styles.previewContainer}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              onPress={handleClassify}
              style={styles.button}
              loading={isClassifying}
              disabled={isClassifying}
            >
              {isClassifying ? 'Analizando...' : 'Analizar Producto'}
            </Button>
            <Button 
              mode="outlined" 
              onPress={resetImage}
              style={styles.button}
              disabled={isClassifying}
            >
              Tomar otra
            </Button>
          </View>
        </View>
      ) : (
        <View style={styles.cameraContainer}>
          <Camera
            ref={(ref) => setCameraRef(ref)}
            style={styles.camera}
            type={cameraType}
            ratio="1:1"
          >
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.flipButton}
                onPress={() => {
                  setCameraType(
                    cameraType === Camera.Constants.Type.back
                      ? Camera.Constants.Type.front
                      : Camera.Constants.Type.back
                  );
                }}
              >
                <MaterialIcons name="flip-camera-ios" size={28} color="white" />
              </TouchableOpacity>
            </View>
          </Camera>
          <View style={styles.actionButtons}>
            <Button 
              mode="contained" 
              onPress={takePicture}
              style={styles.button}
              icon="camera"
            >
              Tomar Foto
            </Button>
            <Button 
              mode="outlined" 
              onPress={pickImage}
              style={styles.button}
              icon="image"
            >
              Galería
            </Button>
          </View>
        </View>
      )}
      <Button 
        mode="text" 
        onPress={onClose}
        style={styles.closeButton}
      >
        Cancelar
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  camera: {
    flex: 1,
    borderRadius: 16,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  flipButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 25,
    height: 50,
    width: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  preview: {
    flex: 1,
    borderRadius: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  button: {
    flex: 1,
    margin: 4,
  },
  closeButton: {
    marginTop: 8,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    marginBottom: 16,
  },
});

export default ProductClassifier;