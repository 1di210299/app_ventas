import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  RefreshControl 
} from 'react-native';
import { 
  Card, 
  Title, 
  Text, 
  Divider,
  List,
  Chip,
  Button,
  ActivityIndicator,
  Portal,
  Dialog,
  IconButton,
  Paragraph,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useSalesStore } from '../../store/salesStore';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Network from 'expo-network';

const SaleHistoryScreen = () => {
  const navigation = useNavigation();
  const { salesHistory, loadSalesHistory, getSaleDetails, syncPendingSales, isLoading } = useSalesStore();

  const [refreshing, setRefreshing] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'checking' | 'syncing' | 'error'>('idle');
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  // Cargar ventas al iniciar
  useEffect(() => {
    loadSalesHistory();
  }, []);

  // Función para refrescar la lista
  const onRefresh = async () => {
    setRefreshing(true);
    await loadSalesHistory();
    setRefreshing(false);
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      return format(date, "dd/MM/yyyy HH:mm", { locale: es });
    } catch (error) {
      return 'Fecha desconocida';
    }
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return 'S/ ' + amount.toFixed(2);
  };

  // Obtener el nombre del método de pago
  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'yape': return 'Yape/Plin';
      case 'otro': return 'Otro';
      default: return method;
    }
  };

  // Ver detalles de una venta
  const handleViewDetails = async (saleId: number) => {
    const saleDetails = await getSaleDetails(saleId);
    if (saleDetails) {
      setSelectedSale(saleDetails);
      setDetailsVisible(true);
    }
  };

  // Sincronizar ventas pendientes con el servidor
  const handleSync = async () => {
    try {
      setSyncStatus('checking');
      
      // Verificar conexión a internet
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 3000);
        return;
      }

      setSyncStatus('syncing');
      await syncPendingSales();
      await loadSalesHistory(); // Recargar para reflejar el estado actualizado
      
      setLastSyncDate(new Date().toISOString());
      setSyncStatus('idle');
    } catch (error) {
      console.error('Error al sincronizar ventas:', error);
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  // Renderizar cada elemento de la lista
  const renderSaleItem = ({ item }) => {
    // Contar la cantidad de productos en la venta
    const itemCount = item.items?.length || 0;
    
    return (
      <Card style={styles.saleCard} onPress={() => handleViewDetails(item.id)}>
        <Card.Content>
          <View style={styles.saleHeader}>
            <Title style={styles.saleId}>Venta #{item.id}</Title>
            <Chip 
              icon={item.sync_status === 1 ? "cloud-check" : "cloud-sync"}
              style={[
                styles.syncChip, 
                item.sync_status === 1 ? styles.syncedChip : styles.unsyncedChip
              ]}
            >
              {item.sync_status === 1 ? "Sincronizado" : "Pendiente"}
            </Chip>
          </View>
          
          <View style={styles.saleInfo}>
            <Text style={styles.saleDate}>{formatDate(item.date)}</Text>
            <Text style={styles.saleTotal}>{formatCurrency(item.total)}</Text>
          </View>
          
          <View style={styles.saleDetails}>
            <Text>Productos: {itemCount}</Text>
            <Text>Pago: {getPaymentMethodName(item.payment_method)}</Text>
          </View>
          
          {item.notes && (
            <Text style={styles.saleNotes} numberOfLines={1}>
              Nota: {item.notes}
            </Text>
          )}
        </Card.Content>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      {/* Encabezado con información de sincronización */}
      <Card style={styles.headerCard}>
        <Card.Content style={styles.syncHeaderContent}>
          <View>
            <Title>Historial de ventas</Title>
            {lastSyncDate && (
              <Text style={styles.lastSyncText}>
                Última sincronización: {formatDate(lastSyncDate)}
              </Text>
            )}
          </View>
          
          <Button 
            icon={
              syncStatus === 'idle' ? "sync" : 
              syncStatus === 'checking' ? "cloud-search" :
              syncStatus === 'syncing' ? "sync" :
              "alert-circle"
            }
            mode="outlined"
            onPress={handleSync}
            loading={syncStatus === 'syncing'}
            disabled={syncStatus !== 'idle'}
            style={[
              styles.syncButton,
              syncStatus === 'error' && styles.syncErrorButton
            ]}
          >
            {syncStatus === 'idle' ? "Sincronizar" : 
             syncStatus === 'checking' ? "Verificando..." :
             syncStatus === 'syncing' ? "Sincronizando..." :
             "Error"}
          </Button>
        </Card.Content>
      </Card>

      {/* Lista de ventas */}
      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
        </View>
      ) : (
        <FlatList
          data={salesHistory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSaleItem}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1E88E5']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No hay ventas registradas</Text>
            </View>
          }
        />
      )}

      {/* Dialog de detalles de venta */}
      <Portal>
        <Dialog visible={detailsVisible} onDismiss={() => setDetailsVisible(false)} style={styles.detailsDialog}>
          <Dialog.Title>Detalles de la Venta #{selectedSale?.id}</Dialog.Title>
          <Dialog.ScrollArea style={styles.dialogScrollArea}>
            <View>
              <Text style={styles.detailLabel}>Fecha:</Text>
              <Text style={styles.detailText}>{selectedSale && formatDate(selectedSale.date)}</Text>
              
              <Text style={styles.detailLabel}>Método de pago:</Text>
              <Text style={styles.detailText}>{selectedSale && getPaymentMethodName(selectedSale.payment_method)}</Text>
              
              {selectedSale?.notes && (
                <>
                  <Text style={styles.detailLabel}>Notas:</Text>
                  <Text style={styles.detailText}>{selectedSale.notes}</Text>
                </>
              )}
              
              <Text style={styles.detailLabel}>Productos:</Text>
              {selectedSale?.items?.map((item, index) => (
                <View key={index} style={styles.itemDetail}>
                  <View style={styles.itemDetailHeader}>
                    <Text style={styles.itemName}>{item.product_name}</Text>
                    <Text style={styles.itemQuantity}>{item.quantity} x {formatCurrency(item.price)}</Text>
                  </View>
                  <Text style={styles.itemTotal}>{formatCurrency(item.quantity * item.price)}</Text>
                  <Divider style={styles.itemDivider} />
                </View>
              ))}
              
              <View style={styles.totalDetail}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalValue}>{selectedSale && formatCurrency(selectedSale.total)}</Text>
              </View>
            </View>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDetailsVisible(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 8,
  },
  headerCard: {
    marginBottom: 8,
  },
  syncHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastSyncText: {
    fontSize: 12,
    color: '#757575',
  },
  syncButton: {
    borderColor: '#1E88E5',
  },
  syncErrorButton: {
    borderColor: '#F44336',
  },
  listContent: {
    paddingBottom: 16,
  },
  saleCard: {
    marginBottom: 8,
    elevation: 2,
  },
  saleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  saleId: {
    fontSize: 18,
  },
  syncChip: {
    height: 28,
  },
  syncedChip: {
    backgroundColor: '#4CAF50',
  },
  unsyncedChip: {
    backgroundColor: '#FF9800',
  },
  saleInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  saleDate: {
    color: '#757575',
  },
  saleTotal: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#1E88E5',
  },
  saleDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  saleNotes: {
    marginTop: 8,
    fontStyle: 'italic',
    color: '#757575',
  },
  separator: {
    height: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  detailsDialog: {
    maxHeight: '80%',
  },
  dialogScrollArea: {
    paddingHorizontal: 0,
    paddingBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    marginTop: 12,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
  },
  itemDetail: {
    marginVertical: 4,
  },
  itemDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemName: {
    flex: 1,
    fontSize: 15,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#757575',
  },
  itemTotal: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'right',
    marginTop: 4,
  },
  itemDivider: {
    marginVertical: 8,
  },
  totalDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
});

export default SaleHistoryScreen;