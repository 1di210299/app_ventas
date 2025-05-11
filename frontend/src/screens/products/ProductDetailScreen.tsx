import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  IconButton, 
  Dialog, 
  Portal, 
  TextInput,
  HelperText,
  Divider,
  Text,
  Chip
} from 'react-native-paper';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useProductStore } from '../../store/productStore';

// Definimos los tipos para la navegación y route
type ProductsStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: number };
  ProductForm: { productId?: number };
};

type ProductDetailScreenRouteProp = RouteProp<ProductsStackParamList, 'ProductDetail'>;
type ProductDetailScreenNavigationProp = StackNavigationProp<ProductsStackParamList>;

const ProductDetailScreen = () => {
  const navigation = useNavigation<ProductDetailScreenNavigationProp>();
  const route = useRoute<ProductDetailScreenRouteProp>();
  const { productId } = route.params;
  
  const { products, deleteProduct, updateStock } = useProductStore();
  const product = products.find(p => p.id === productId);
  
  const [isStockDialogVisible, setIsStockDialogVisible] = useState(false);
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockError, setStockError] = useState('');
  const [isDeleteDialogVisible, setIsDeleteDialogVisible] = useState(false);

  // Si no se encuentra el producto
  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Producto no encontrado</Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Volver
        </Button>
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    return 'S/ ' + amount.toFixed(2);
  };

  const handleEditProduct = () => {
    navigation.navigate('ProductForm', { productId });
  };

  const showDeleteDialog = () => {
    setIsDeleteDialogVisible(true);
  };

  const hideDeleteDialog = () => {
    setIsDeleteDialogVisible(false);
  };

  const confirmDelete = async () => {
    const result = await deleteProduct(productId);
    hideDeleteDialog();
    if (result) {
      navigation.goBack();
    }
  };

  const showStockDialog = () => {
    setStockQuantity('');
    setStockError('');
    setIsStockDialogVisible(true);
  };

  const hideStockDialog = () => {
    setIsStockDialogVisible(false);
  };

  const validateStockQuantity = () => {
    if (!stockQuantity.trim()) {
      setStockError('Ingrese una cantidad');
      return false;
    }
    
    const quantity = parseInt(stockQuantity);
    if (isNaN(quantity)) {
      setStockError('Ingrese un número válido');
      return false;
    }
    
    // Si la cantidad es negativa, verificar que no exceda el stock actual
    if (quantity < 0 && Math.abs(quantity) > product.stock) {
      setStockError(`No puede retirar más de ${product.stock} unidades`);
      return false;
    }
    
    setStockError('');
    return true;
  };

  const handleStockUpdate = async () => {
    if (validateStockQuantity()) {
      const quantity = parseInt(stockQuantity);
      const result = await updateStock(productId, quantity);
      
      if (result) {
        hideStockDialog();
        Alert.alert('Stock actualizado', `Stock actualizado correctamente. Nuevo stock: ${product.stock + quantity}`);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerContainer}>
            <View style={styles.productTitleContainer}>
              <Title style={styles.productTitle}>{product.name}</Title>
              {product.barcode && (
                <Paragraph style={styles.barcode}>Código: {product.barcode}</Paragraph>
              )}
            </View>
            
            <IconButton
              icon="pencil"
              size={24}
              onPress={handleEditProduct}
            />
          </View>

          {product.image ? (
            <Image source={{ uri: product.image }} style={styles.productImage} />
          ) : (
            <View style={[styles.productImage, styles.imagePlaceholder]}>
              <IconButton icon="image-outline" size={50} />
              <Text>Sin imagen</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.priceContainer}>
            <View>
              <Text style={styles.priceLabel}>Precio de venta:</Text>
              <Title style={styles.price}>{formatCurrency(product.price)}</Title>
            </View>
            
            {product.cost !== undefined && product.cost > 0 && (
              <View>
                <Text style={styles.priceLabel}>Costo:</Text>
                <Title style={styles.cost}>{formatCurrency(product.cost)}</Title>
              </View>
            )}
          </View>

          <View style={styles.stockInfoContainer}>
            {product.stock <= 0 ? (
              <Chip icon="alert-circle" style={styles.outOfStock}>Sin Stock</Chip>
            ) : product.stock < 5 ? (
              <Chip icon="alert" style={styles.lowStock}>Stock Bajo: {product.stock}</Chip>
            ) : (
              <Chip icon="check-circle" style={styles.inStock}>En Stock: {product.stock}</Chip>
            )}
            <Button 
              mode="outlined"
              onPress={showStockDialog}
              style={styles.stockButton}
            >
              Ajustar Stock
            </Button>
          </View>

          <Divider style={styles.divider} />

          {product.description && (
            <View style={styles.descriptionContainer}>
              <Title style={styles.sectionTitle}>Descripción</Title>
              <Paragraph style={styles.description}>{product.description}</Paragraph>
            </View>
          )}

        </Card.Content>
        
        <Card.Actions style={styles.actionButtons}>
          <Button 
            mode="outlined" 
            onPress={showDeleteDialog}
            style={styles.deleteButton}
            icon="delete"
          >
            Eliminar
          </Button>
          <Button 
            mode="contained" 
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            Volver
          </Button>
        </Card.Actions>
      </Card>

      {/* Dialog para ajustar stock */}
      <Portal>
        <Dialog visible={isStockDialogVisible} onDismiss={hideStockDialog}>
          <Dialog.Title>Ajustar Stock</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Ingrese la cantidad a agregar o retirar del inventario.
              Use números negativos para retirar unidades.
            </Paragraph>
            <TextInput
              label="Cantidad"
              keyboardType="number-pad"
              mode="outlined"
              value={stockQuantity}
              onChangeText={setStockQuantity}
              error={!!stockError}
              style={styles.dialogInput}
            />
            {!!stockError && <HelperText type="error">{stockError}</HelperText>}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideStockDialog}>Cancelar</Button>
            <Button onPress={handleStockUpdate}>Guardar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Dialog para confirmar eliminación */}
      <Portal>
        <Dialog visible={isDeleteDialogVisible} onDismiss={hideDeleteDialog}>
          <Dialog.Title>Eliminar Producto</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              ¿Está seguro que desea eliminar "{product.name}"?
              Esta acción no se puede deshacer.
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDeleteDialog}>Cancelar</Button>
            <Button onPress={confirmDelete} textColor="#F44336">Eliminar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 8,
    elevation: 2,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  productTitleContainer: {
    flex: 1,
    paddingRight: 16,
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  barcode: {
    marginTop: 4,
    color: '#757575',
  },
  productImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 14,
    color: '#757575',
  },
  price: {
    fontSize: 24,
    color: '#1E88E5',
    fontWeight: 'bold',
  },
  cost: {
    fontSize: 20,
    color: '#424242',
  },
  stockInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  inStock: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  lowStock: {
    backgroundColor: '#FFC107',
  },
  outOfStock: {
    backgroundColor: '#F44336',
    color: 'white',
  },
  stockButton: {
    borderColor: '#1E88E5',
    borderWidth: 1,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  actionButtons: {
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  deleteButton: {
    borderColor: '#F44336',
    flex: 1,
    marginRight: 8,
  },
  backButton: {
    backgroundColor: '#1E88E5',
    flex: 1,
    marginLeft: 8,
  },
  dialogInput: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    marginBottom: 16,
  },
});

export default ProductDetailScreen;