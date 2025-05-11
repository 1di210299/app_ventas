import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Image } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  IconButton, 
  FAB,
  Searchbar,
  Divider,
  Text,
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useProductStore } from '../../store/productStore';

// Definimos los tipos para la navegación
type ProductsStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: number };
  ProductForm: { productId?: number };
};

type ProductListScreenNavigationProp = StackNavigationProp<ProductsStackParamList, 'ProductList'>;

const ProductListScreen = () => {
  const navigation = useNavigation<ProductListScreenNavigationProp>();
  const { products, loadProducts, isLoading, error, searchProducts } = useProductStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const results = await searchProducts(query);
    setSearchResults(results);
    setIsSearching(false);
  };

  const displayedProducts = searchQuery.trim().length > 0 ? searchResults : products;

  const formatCurrency = (amount: number) => {
    return 'S/ ' + amount.toFixed(2);
  };

  const renderItem = ({ item }: { item: any }) => (
    <Card 
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
    >
      <Card.Content style={styles.cardContent}>
        <View style={styles.productInfo}>
          <Title numberOfLines={1}>{item.name}</Title>
          <Paragraph style={styles.price}>{formatCurrency(item.price)}</Paragraph>
          
          <View style={styles.stockContainer}>
            {item.stock <= 0 ? (
              <Chip icon="alert-circle" style={styles.outOfStock}>Sin Stock</Chip>
            ) : item.stock < 5 ? (
              <Chip icon="alert" style={styles.lowStock}>Stock Bajo: {item.stock}</Chip>
            ) : (
              <Text style={styles.stockText}>Stock: {item.stock}</Text>
            )}
          </View>
        </View>

        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.imagePlaceholder]}>
            <IconButton icon="image-outline" size={30} />
          </View>
        )}
      </Card.Content>
      
      <Card.Actions style={styles.cardActions}>
        <IconButton 
          icon="pencil"
          onPress={() => navigation.navigate('ProductForm', { productId: item.id })}
        />
        <IconButton 
          icon="eye"
          onPress={() => navigation.navigate('ProductDetail', { productId: item.id })}
        />
      </Card.Actions>
    </Card>
  );

  return (
    <View style={styles.container}>
      <Searchbar
        placeholder="Buscar productos"
        onChangeText={handleSearch}
        value={searchQuery}
        style={styles.searchBar}
      />
      
      {isLoading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={displayedProducts}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <Divider />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1E88E5']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {isSearching 
                ? 'Buscando productos...' 
                : searchQuery.length > 0 
                ? 'No se encontraron productos' 
                : 'No hay productos registrados'}
            </Text>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('ProductForm')}
        label="Nuevo"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    margin: 8,
    elevation: 2,
  },
  listContent: {
    paddingBottom: 80, // Para asegurar que el FAB no tape el último elemento
  },
  card: {
    margin: 8,
    elevation: 2,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
    marginTop: 4,
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 4,
  },
  imagePlaceholder: {
    backgroundColor: '#e1e1e1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockContainer: {
    marginTop: 8,
  },
  stockText: {
    fontSize: 14,
    color: '#4CAF50',
  },
  lowStock: {
    backgroundColor: '#FFC107',
    alignSelf: 'flex-start',
  },
  outOfStock: {
    backgroundColor: '#F44336',
    alignSelf: 'flex-start',
    color: 'white',
  },
  cardActions: {
    justifyContent: 'flex-end',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E88E5',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  errorContainer: {
    padding: 16,
    backgroundColor: '#ffebee',
    margin: 8,
    borderRadius: 4,
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
  },
});

export default ProductListScreen;