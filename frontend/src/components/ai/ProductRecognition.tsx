import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Card, Text, Title, Paragraph, Button, Chip, Divider, List } from 'react-native-paper';
import { RecognitionResult } from '../../services/productAIService';

interface ProductRecognitionProps {
  result: RecognitionResult;
  onUseResult: (name: string, price: number, category: string) => void;
  onClose: () => void;
}

const ProductRecognition: React.FC<ProductRecognitionProps> = ({ 
  result, 
  onUseResult, 
  onClose 
}) => {
  const formattedConfidence = Math.round(result.confidence * 100);
  const formattedPrice = result.suggestedPrice ? `S/ ${result.suggestedPrice.toFixed(2)}` : 'N/A';
  
  const handleUseResult = () => {
    if (result.name && result.suggestedPrice && result.category) {
      onUseResult(result.name, result.suggestedPrice, result.category);
    }
  };

  const handleUseSimilarProduct = (name: string, price: number) => {
    if (result.category) {
      onUseResult(name, price, result.category);
    }
  };

  // Función para traducir nombres de categorías
  const getCategoryName = (category: string) => {
    const categories: Record<string, string> = {
      'bebidas': 'Bebidas',
      'snacks': 'Snacks',
      'alimentos': 'Alimentos',
      'limpieza': 'Productos de Limpieza',
      'cuidado_personal': 'Cuidado Personal',
      'papeleria': 'Papelería',
      'electronica': 'Electrónica',
      'ropa': 'Ropa',
      'otros': 'Otros'
    };
    
    return categories[category] || category;
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Resultado del Análisis</Title>
          
          <View style={styles.resultContainer}>
            <View style={styles.infoContainer}>
              <Text style={styles.label}>Producto detectado:</Text>
              <Text style={styles.value}>{result.name}</Text>
              
              <Chip
                style={[styles.confidenceChip, { 
                  backgroundColor: 
                    formattedConfidence > 85 ? '#4CAF50' : 
                    formattedConfidence > 70 ? '#FFC107' : '#F44336'
                }]}
                textStyle={styles.confidenceText}
              >
                {`${formattedConfidence}% de confianza`}
              </Chip>
              
              <Text style={styles.label}>Categoría sugerida:</Text>
              <Text style={styles.value}>
                {result.category ? getCategoryName(result.category) : 'Sin categoría'}
              </Text>
              
              <Text style={styles.label}>Precio sugerido:</Text>
              <Text style={styles.price}>{formattedPrice}</Text>
            </View>
          </View>
        </Card.Content>
        
        <Card.Actions style={styles.actions}>
          <Button mode="contained" onPress={handleUseResult}>
            Usar estos datos
          </Button>
        </Card.Actions>
      </Card>
      
      {result.similarProducts && result.similarProducts.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Productos similares encontrados</Title>
            <Paragraph style={styles.description}>
              Estos productos ya existen en tu inventario y son similares al que estás intentando agregar:
            </Paragraph>
            
            {result.similarProducts.map((product, index) => (
              <React.Fragment key={`${product.id}_${index}`}>
                {index > 0 && <Divider style={styles.divider} />}
                <List.Item
                  title={product.name}
                  description={`S/ ${product.price.toFixed(2)} • Similitud: ${Math.round(product.similarity * 100)}%`}
                  left={() => (
                    <List.Icon 
                      icon="package-variant" 
                      color={product.similarity > 0.8 ? '#F44336' : '#1E88E5'} 
                    />
                  )}
                  right={() => (
                    <Button 
                      mode="outlined" 
                      compact 
                      onPress={() => handleUseSimilarProduct(product.name, product.price)}
                    >
                      Usar
                    </Button>
                  )}
                  style={styles.listItem}
                  titleStyle={product.similarity > 0.8 ? styles.duplicateTitle : {}}
                />
              </React.Fragment>
            ))}
            
            {result.similarProducts.some(p => p.similarity > 0.8) && (
              <Text style={styles.warningText}>
                ⚠️ Los productos destacados en rojo podrían ser duplicados.
              </Text>
            )}
          </Card.Content>
        </Card>
      )}
      
      <Button 
        mode="text" 
        onPress={onClose}
        style={styles.closeButton}
      >
        Cerrar
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
  },
  value: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginTop: 4,
  },
  confidenceChip: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  confidenceText: {
    color: 'white',
    fontWeight: 'bold',
  },
  actions: {
    justifyContent: 'flex-end',
    padding: 16,
  },
  description: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 8,
  },
  listItem: {
    padding: 0,
  },
  duplicateTitle: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  warningText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 16,
    fontStyle: 'italic',
  },
  closeButton: {
    marginTop: 8,
    marginBottom: 24,
  },
});

export default ProductRecognition;