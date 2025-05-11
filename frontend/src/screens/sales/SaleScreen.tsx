import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSalesStore, type SaleItem } from '../../store/salesStore';
import { useProductStore, type Product } from '../../store/productStore';
import { Picker } from '@react-native-picker/picker';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const SaleScreen: React.FC = () => {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  // Stores
  const { 
    currentSale,
    addItemToSale,
    updateItemQuantity,
    removeItemFromSale,
    setPaymentMethod,
    setNotes,
    completeSale,
    isLoading
  } = useSalesStore();
  
  const { 
    products,
    fetchProducts,
    isLoading: productsLoading
  } = useProductStore();

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Búsqueda de productos
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
    } else {
      const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filteredProducts);
    }
  }, [searchQuery, products]);

  const handleAddProduct = (product: Product) => {
    addItemToSale(product, 1);
    setSearchQuery('');
    setShowProductSearch(false);
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    updateItemQuantity(productId, newQuantity);
  };

  const handleRemoveItem = (productId: number) => {
    Alert.alert(
      "Eliminar producto",
      "¿Estás seguro de eliminar este producto de la venta?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", onPress: () => removeItemFromSale(productId) }
      ]
    );
  };

  const handleProceedToPayment = () => {
    if (currentSale.items.length === 0) {
      Alert.alert("Error", "No hay productos en la venta");
      return;
    }
    setShowPaymentModal(true);
  };

  const handleCompleteSale = async () => {
    setProcessing(true);
    try {
      const success = await completeSale();
      if (success) {
        setShowPaymentModal(false);
        Alert.alert(
          "Venta completada",
          "La venta se ha registrado correctamente",
          [{ text: "OK", onPress: () => generateReceipt() }]
        );
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo completar la venta");
    } finally {
      setProcessing(false);
    }
  };

  // Generar recibo para imprimir o compartir
  const generateReceipt = async () => {
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Recibo de Venta</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .receipt { max-width: 300px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; }
            .items { margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 5px; }
            .total { font-weight: bold; text-align: right; border-top: 1px solid #000; padding-top: 10px; }
            .footer { text-align: center; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h2>VentaFácil</h2>
              <p>Fecha: ${new Date().toLocaleDateString()}</p>
              <p>Hora: ${new Date().toLocaleTimeString()}</p>
            </div>
            
            <div class="items">
              <h3>Productos:</h3>
              ${currentSale.items.map(item => `
                <div class="item">
                  <span>${item.quantity} x ${item.product_name}</span>
                  <span>$${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              `).join('')}
            </div>
            
            <div class="total">
              <p>Total: $${currentSale.total.toFixed(2)}</p>
              <p>Método de pago: ${currentSale.payment_method}</p>
            </div>
            
            <div class="footer">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Error", "El compartir archivos no está disponible en este dispositivo");
      }
    } catch (error) {
      console.error("Error generando recibo:", error);
      Alert.alert("Error", "No se pudo generar el recibo");
    }
  };

  const renderItem = ({ item }: { item: SaleItem }) => (
    <View style={styles.itemContainer}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.product_name}</Text>
        <Text style={styles.itemPrice}>
          ${item.price.toFixed(2)} × {item.quantity} = ${(item.price * item.quantity).toFixed(2)}
        </Text>
      </View>
      
      <View style={styles.itemActions}>
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
        >
          <MaterialIcons name="remove" size={18} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.quantity}>{item.quantity}</Text>
        
        <TouchableOpacity 
          style={styles.quantityButton}
          onPress={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
        >
          <MaterialIcons name="add" size={18} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.removeButton}
          onPress={() => handleRemoveItem(item.product_id)}
        >
          <MaterialIcons name="delete" size={24} color="#e74c3c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProductItem = ({ item }: { item: Product }) => (
    <TouchableOpacity 
      style={styles.searchResultItem}
      onPress={() => handleAddProduct(item)}
    >
      <Text style={styles.productName}>{item.name}</Text>
      <View style={styles.productDetails}>
        <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
        <Text style={styles.productStock}>Stock: {item.stock}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <TouchableOpacity 
          style={styles.searchButton}
          onPress={() => setShowProductSearch(true)}
        >
          <MaterialIcons name="search" size={24} color="#333" />
          <Text style={styles.searchButtonText}>Buscar productos</Text>
        </TouchableOpacity>
      </View>
      
      {/* Lista de productos en la venta */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Productos en la venta</Text>
        {currentSale.items.length > 0 ? (
          <FlatList 
            data={currentSale.items}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.product_id}`}
          />
        ) : (
          <View style={styles.emptyState}>
            <MaterialIcons name="shopping-cart" size={64} color="#ddd" />
            <Text style={styles.emptyText}>No hay productos en la venta</Text>
            <Text style={styles.emptySubtext}>Busca productos para agregarlos</Text>
          </View>
        )}
      </View>
      
      {/* Panel de totales */}
      <View style={styles.totalPanel}>
        <View style={styles.totalInfo}>
          <Text style={styles.totalItems}>
            {currentSale.items.reduce((sum, item) => sum + item.quantity, 0)} productos
          </Text>
          <Text style={styles.totalAmount}>
            Total: ${currentSale.total.toFixed(2)}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.checkoutButton,
            currentSale.items.length === 0 && styles.disabledButton
          ]}
          onPress={handleProceedToPayment}
          disabled={currentSale.items.length === 0}
        >
          <Text style={styles.checkoutButtonText}>Cobrar</Text>
        </TouchableOpacity>
      </View>
      
      {/* Modal de búsqueda de productos */}
      <Modal
        visible={showProductSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductSearch(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.searchModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Buscar Producto</Text>
              <TouchableOpacity 
                onPress={() => setShowProductSearch(false)}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nombre, código o SKU..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            
            {productsLoading ? (
              <ActivityIndicator size="large" color="#0066cc" />
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderProductItem}
                keyExtractor={(item) => `${item.id}`}
                ListEmptyComponent={
                  searchQuery.trim() !== '' ? (
                    <Text style={styles.noResults}>No se encontraron productos</Text>
                  ) : null
                }
              />
            )}
          </View>
        </View>
      </Modal>
      
      {/* Modal de pago */}
      <Modal
        visible={showPaymentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.paymentModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Finalizar Venta</Text>
              <TouchableOpacity 
                onPress={() => setShowPaymentModal(false)}
              >
                <MaterialIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <ScrollView>
              {/* Resumen de la venta */}
              <View style={styles.paymentSummary}>
                <Text style={styles.summaryTitle}>Resumen de la venta</Text>
                
                {currentSale.items.map(item => (
                  <View key={item.product_id} style={styles.summaryItem}>
                    <Text>{item.quantity} × {item.product_name}</Text>
                    <Text>${(item.price * item.quantity).toFixed(2)}</Text>
                  </View>
                ))}
                
                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>Total:</Text>
                  <Text style={styles.summaryTotalAmount}>${currentSale.total.toFixed(2)}</Text>
                </View>
              </View>
              
              {/* Método de pago */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Método de pago</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={currentSale.payment_method}
                    onValueChange={(value) => setPaymentMethod(value)}
                    style={styles.picker}
                  >
                    <Picker.Item label="Efectivo" value="efectivo" />
                    <Picker.Item label="Tarjeta" value="tarjeta" />
                    <Picker.Item label="Yape / Plin" value="yape" />
                    <Picker.Item label="Otro" value="otro" />
                  </Picker>
                </View>
              </View>
              
              {/* Notas */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notas (opcional)</Text>
                <TextInput
                  style={styles.notesInput}
                  placeholder="Agregar notas sobre la venta..."
                  value={currentSale.notes}
                  onChangeText={setNotes}
                  multiline
                />
              </View>
              
              {/* Botones de acción */}
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.completeButton}
                  onPress={handleCompleteSale}
                  disabled={isLoading || processing}
                >
                  {isLoading || processing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.completeButtonText}>Completar Venta</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  searchButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flex: 1,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  itemContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  itemPrice: {
    color: '#666',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantity: {
    marginHorizontal: 10,
    fontSize: 16,
    fontWeight: '500',
    minWidth: 25,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 15,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#888',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 5,
  },
  totalPanel: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalInfo: {},
  totalItems: {
    color: '#666',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 5,
  },
  checkoutButton: {
    backgroundColor: '#007bff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  checkoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  searchModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  searchResultItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productPrice: {
    fontWeight: '500',
    color: '#007bff',
  },
  productStock: {
    color: '#666',
  },
  noResults: {
    textAlign: 'center',
    color: '#888',
    padding: 20,
  },
  paymentModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  paymentSummary: {
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  summaryTotalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  summaryTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007bff',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    height: 100,
    textAlignVertical: 'top',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 15,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  completeButton: {
    flex: 1,
    backgroundColor: '#28a745',
    borderRadius: 8,
    padding: 15,
    marginLeft: 10,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});

export default SaleScreen;