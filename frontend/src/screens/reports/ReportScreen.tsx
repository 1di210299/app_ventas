import React, { useEffect, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Dimensions,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  ActivityIndicator,
  Divider,
  List,
  IconButton,
  Portal,
  Dialog,
  Avatar
} from 'react-native-paper';
import { useReportStore } from '../../store/reportStore';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Network from 'expo-network';

const screenWidth = Dimensions.get('window').width - 32;

const ReportScreen = () => {
  const { 
    dailySalesData, 
    topProducts, 
    salesByPaymentMethod,
    totalSalesAmount,
    averageSaleAmount,
    salesCount, 
    dateRange,
    isLoading,
    error,
    setDateRange,
    generateReports,
    fetchReportsFromServer
  } = useReportStore();

  const [refreshing, setRefreshing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerType, setDatePickerType] = useState<'start' | 'end'>('start');
  const [localDateRange, setLocalDateRange] = useState(dateRange);
  const [isServerSyncAvailable, setIsServerSyncAvailable] = useState(false);

  // Verificar si hay conexión para sincronizar con el servidor
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const networkState = await Network.getNetworkStateAsync();
      setIsServerSyncAvailable(
        networkState.isConnected && networkState.isInternetReachable !== false
      );
    };
    
    checkNetworkStatus();
  }, []);

  // Cargar reportes al iniciar
  useEffect(() => {
    generateReports(dateRange.startDate, dateRange.endDate);
  }, []);

  // Función para refrescar los datos
  const onRefresh = async () => {
    setRefreshing(true);
    await generateReports(dateRange.startDate, dateRange.endDate);
    setRefreshing(false);
  };

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return 'S/ ' + amount.toFixed(2);
  };

  // Formatear fecha
  const formatDate = (date: Date | string) => {
    if (typeof date === 'string') {
      const parsedDate = parseISO(date);
      if (isValid(parsedDate)) {
        return format(parsedDate, 'dd/MM/yyyy', { locale: es });
      }
      return date;
    }
    return format(date, 'dd/MM/yyyy', { locale: es });
  };

  // Mostrar selector de fecha
  const showDatePickerModal = (type: 'start' | 'end') => {
    setDatePickerType(type);
    setShowDatePicker(true);
  };

  // Manejar cambio de fecha
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    
    if (selectedDate) {
      const newDateRange = { ...localDateRange };
      
      if (datePickerType === 'start') {
        newDateRange.startDate = selectedDate;
        // Asegurarse de que la fecha de inicio no sea mayor que la fecha de fin
        if (selectedDate > newDateRange.endDate) {
          newDateRange.endDate = selectedDate;
        }
      } else {
        newDateRange.endDate = selectedDate;
        // Asegurarse de que la fecha de fin no sea menor que la fecha de inicio
        if (selectedDate < newDateRange.startDate) {
          newDateRange.startDate = selectedDate;
        }
      }
      
      setLocalDateRange(newDateRange);
    }
  };

  // Aplicar filtro de fechas
  const applyDateFilter = () => {
    setDateRange(localDateRange.startDate, localDateRange.endDate);
  };

  // Sincronizar con el servidor
  const handleServerSync = async () => {
    await fetchReportsFromServer();
  };

  // Preparar datos para gráficos
  const getLineChartData = () => {
    return {
      labels: dailySalesData.map(item => {
        const date = parseISO(item.date);
        return format(date, 'dd/MM');
      }),
      datasets: [
        {
          data: dailySalesData.map(item => item.totalSales),
          color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ['Ventas diarias']
    };
  };

  const getBarChartData = () => {
    const products = topProducts.slice(0, 5); // Limitar a 5 productos
    
    return {
      labels: products.map(item => item.name.substring(0, 10) + (item.name.length > 10 ? '...' : '')),
      datasets: [
        {
          data: products.map(item => item.quantity)
        }
      ]
    };
  };

  const getPieChartData = () => {
    const colors = ['#1E88E5', '#43A047', '#FB8C00', '#E53935', '#5E35B1'];
    
    return salesByPaymentMethod.map((item, index) => {
      // Traducir método de pago
      let methodName = item.method;
      switch (item.method) {
        case 'efectivo': methodName = 'Efectivo'; break;
        case 'tarjeta': methodName = 'Tarjeta'; break;
        case 'yape': methodName = 'Yape/Plin'; break;
        case 'otro': methodName = 'Otro'; break;
      }
      
      return {
        name: methodName,
        value: item.total,
        color: colors[index % colors.length],
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      };
    });
  };

  // Configuración de los gráficos
  const chartConfig = {
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: '#ffa726'
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={['#1E88E5']}
        />
      }
    >
      {/* Filtro de fechas */}
      <Card style={styles.card}>
        <Card.Content>
          <Title>Reportes de ventas</Title>
          <View style={styles.dateFilterContainer}>
            <View style={styles.datePickerButton}>
              <Text style={styles.dateFilterLabel}>Desde:</Text>
              <Button 
                mode="outlined" 
                onPress={() => showDatePickerModal('start')}
                style={styles.dateButton}
              >
                {formatDate(localDateRange.startDate)}
              </Button>
            </View>
            
            <View style={styles.datePickerButton}>
              <Text style={styles.dateFilterLabel}>Hasta:</Text>
              <Button 
                mode="outlined" 
                onPress={() => showDatePickerModal('end')}
                style={styles.dateButton}
              >
                {formatDate(localDateRange.endDate)}
              </Button>
            </View>
            
            <Button 
              mode="contained"
              onPress={applyDateFilter}
              style={styles.applyButton}
              disabled={isLoading}
              compact
            >
              Aplicar
            </Button>
          </View>

          {isLoading && <ActivityIndicator style={styles.loader} />}
          
          {isServerSyncAvailable && (
            <Button
              mode="outlined"
              onPress={handleServerSync}
              icon="cloud-sync"
              style={styles.syncButton}
            >
              Sincronizar datos con el servidor
            </Button>
          )}
        </Card.Content>
      </Card>

      {/* Resumen */}
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.cardTitle}>Resumen de ventas</Title>
          <Text style={styles.periodText}>
            Período: {formatDate(dateRange.startDate)} - {formatDate(dateRange.endDate)}
          </Text>
          
          <View style={styles.statsContainer}>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Total ventas</Text>
                <Text style={styles.statValue}>{formatCurrency(totalSalesAmount)}</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}># Ventas</Text>
                <Text style={styles.statValue}>{salesCount}</Text>
              </Card.Content>
            </Card>
            
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.statLabel}>Venta promedio</Text>
                <Text style={styles.statValue}>{formatCurrency(averageSaleAmount)}</Text>
              </Card.Content>
            </Card>
          </View>
        </Card.Content>
      </Card>

      {/* Gráfico de ventas diarias */}
      {dailySalesData.length > 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Ventas diarias</Title>
            <LineChart
              data={getLineChartData()}
              width={screenWidth}
              height={220}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
              }}
              bezier
              style={styles.chart}
              withVerticalLabels={dailySalesData.length <= 15} // Solo mostrar etiquetas si no hay demasiados datos
              withHorizontalLabels={true}
              withDots={dailySalesData.length <= 15} // Solo mostrar puntos si no hay demasiados datos
            />
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Ventas diarias</Title>
            <Text style={styles.noDataText}>No hay datos para el período seleccionado</Text>
          </Card.Content>
        </Card>
      )}

      {/* Gráfico de productos más vendidos */}
      {topProducts.length > 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Productos más vendidos</Title>
            {topProducts.length >= 5 && (
              <BarChart
                data={getBarChartData()}
                width={screenWidth}
                height={220}
                chartConfig={{
                  ...chartConfig,
                  color: (opacity = 1) => `rgba(67, 160, 71, ${opacity})`,
                }}
                style={styles.chart}
                showValuesOnTopOfBars={true}
                withHorizontalLabels={true}
              />
            )}
            
            <View style={styles.topProductsList}>
              {topProducts.map((product, index) => (
                <View key={index} style={styles.topProductItem}>
                  <View style={styles.productRank}>
                    <Avatar.Text 
                      size={32} 
                      label={(index + 1).toString()} 
                      style={{
                        backgroundColor: index === 0 ? '#FFD700' : 
                                        index === 1 ? '#C0C0C0' : 
                                        index === 2 ? '#CD7F32' : '#1E88E5'
                      }}
                    />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDetails}>
                      {product.quantity} unidades - {formatCurrency(product.total)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Productos más vendidos</Title>
            <Text style={styles.noDataText}>No hay datos para el período seleccionado</Text>
          </Card.Content>
        </Card>
      )}

      {/* Gráfico de métodos de pago */}
      {salesByPaymentMethod.length > 0 ? (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Ventas por método de pago</Title>
            <PieChart
              data={getPieChartData()}
              width={screenWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="15"
              style={styles.chart}
              absolute={false}
            />
          </Card.Content>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.cardTitle}>Ventas por método de pago</Title>
            <Text style={styles.noDataText}>No hay datos para el período seleccionado</Text>
          </Card.Content>
        </Card>
      )}

      {/* DatePicker en modal */}
      {showDatePicker && (
        <DateTimePicker
          value={datePickerType === 'start' ? localDateRange.startDate : localDateRange.endDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}
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
  cardTitle: {
    fontSize: 18,
    marginBottom: 12,
  },
  dateFilterContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  datePickerButton: {
    flex: 1,
    marginRight: 8,
    minWidth: 120,
  },
  dateFilterLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  dateButton: {
    height: 40,
    justifyContent: 'center',
  },
  applyButton: {
    backgroundColor: '#1E88E5',
    marginLeft: 8,
    height: 40,
    justifyContent: 'center',
  },
  loader: {
    marginTop: 8,
  },
  periodText: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  statCard: {
    width: '32%',
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 8,
  },
  topProductsList: {
    marginTop: 16,
  },
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productRank: {
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
  },
  productDetails: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  noDataText: {
    textAlign: 'center',
    color: '#757575',
    marginVertical: 40,
    fontSize: 16,
  },
  syncButton: {
    marginTop: 12,
    borderColor: '#1E88E5',
  },
});

export default ReportScreen;