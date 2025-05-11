import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { formatISO, format } from 'date-fns';
import { es } from 'date-fns/locale';
import Papa from 'papaparse';

// Formato para moneda
const formatCurrency = (amount: number): string => {
  return 'S/ ' + amount.toFixed(2);
};

// Generar archivo CSV
export const generateCSV = async (
  data: any[],
  headers: string[],
  fileName: string
): Promise<boolean> => {
  try {
    // Crear encabezados del CSV
    let csvContent = headers.join(',') + '\n';

    // Agregar filas de datos
    data.forEach((row) => {
      const values = headers.map((header) => {
        const value = row[header] || '';
        // Escapar comillas en valores de texto
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
      });
      csvContent += values.join(',') + '\n';
    });

    // Crear ruta del archivo
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filePath = `${FileSystem.documentDirectory}${fileName}_${timestamp}.csv`;

    // Escribir archivo
    await FileSystem.writeAsStringAsync(filePath, csvContent);

    // Compartir archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/csv',
        dialogTitle: 'Exportar reporte CSV',
      });
      return true;
    } else {
      console.error('Compartir no está disponible en este dispositivo');
      return false;
    }
  } catch (error) {
    console.error('Error al generar CSV:', error);
    return false;
  }
};

// Generar archivo PDF con reportes
export const generateSalesReportPDF = async (
  reportData: {
    dailySalesData: any[];
    topProducts: any[];
    salesByPaymentMethod: any[];
    totalSalesAmount: number;
    averageSaleAmount: number;
    salesCount: number;
    dateRange: {
      startDate: Date;
      endDate: Date;
    };
  }
): Promise<boolean> => {
  try {
    const {
      dailySalesData,
      topProducts,
      salesByPaymentMethod,
      totalSalesAmount,
      averageSaleAmount,
      salesCount,
      dateRange,
    } = reportData;

    // Formato de fechas
    const startDate = format(dateRange.startDate, 'dd/MM/yyyy', { locale: es });
    const endDate = format(dateRange.endDate, 'dd/MM/yyyy', { locale: es });
    const currentDate = format(new Date(), "dd 'de' MMMM, yyyy", { locale: es });
    
    // Generar tabla de ventas diarias
    let dailySalesRows = '';
    dailySalesData.forEach((item) => {
      const date = format(new Date(item.date), 'dd/MM/yyyy', { locale: es });
      dailySalesRows += `
        <tr>
          <td>${date}</td>
          <td>${formatCurrency(item.totalSales)}</td>
          <td>${item.salesCount}</td>
        </tr>
      `;
    });

    // Generar tabla de productos más vendidos
    let topProductsRows = '';
    topProducts.slice(0, 10).forEach((product, index) => {
      topProductsRows += `
        <tr>
          <td>${index + 1}</td>
          <td>${product.name}</td>
          <td>${product.quantity}</td>
          <td>${formatCurrency(product.total)}</td>
        </tr>
      `;
    });

    // Generar tabla de ventas por método de pago
    let paymentMethodRows = '';
    salesByPaymentMethod.forEach((item) => {
      let methodName = item.method;
      switch (item.method) {
        case 'efectivo': methodName = 'Efectivo'; break;
        case 'tarjeta': methodName = 'Tarjeta'; break;
        case 'yape': methodName = 'Yape/Plin'; break;
        case 'otro': methodName = 'Otro'; break;
      }
      
      paymentMethodRows += `
        <tr>
          <td>${methodName}</td>
          <td>${formatCurrency(item.total)}</td>
        </tr>
      `;
    });

    // Template HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Reporte de Ventas</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              padding: 20px;
              color: #333;
            }
            h1, h2 {
              color: #1E88E5;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              padding-bottom: 10px;
              border-bottom: 1px solid #eee;
            }
            .date {
              font-size: 14px;
              color: #777;
            }
            .summary {
              background-color: #f9f9f9;
              padding: 15px;
              border-radius: 5px;
              margin-bottom: 20px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
            }
            .summary-item {
              background: white;
              padding: 10px;
              border-radius: 5px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .summary-label {
              font-size: 12px;
              color: #777;
              margin-bottom: 5px;
            }
            .summary-value {
              font-size: 18px;
              font-weight: bold;
              color: #1E88E5;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              margin-bottom: 20px;
            }
            th, td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            .section {
              margin-bottom: 20px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #777;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Reporte de Ventas</h1>
            <p class="date">Generado el: ${currentDate}</p>
          </div>
          
          <div class="period">
            <p>Periodo: <strong>${startDate}</strong> al <strong>${endDate}</strong></p>
          </div>
          
          <div class="summary">
            <h2>Resumen</h2>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Total Ventas</div>
                <div class="summary-value">${formatCurrency(totalSalesAmount)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Número de Ventas</div>
                <div class="summary-value">${salesCount}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Venta Promedio</div>
                <div class="summary-value">${formatCurrency(averageSaleAmount)}</div>
              </div>
            </div>
          </div>
          
          <div class="section">
            <h2>Ventas por Día</h2>
            ${dailySalesData.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Total</th>
                    <th>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  ${dailySalesRows}
                </tbody>
              </table>
            ` : '<p>No hay datos para el período seleccionado</p>'}
          </div>
          
          <div class="section">
            <h2>Productos Más Vendidos</h2>
            ${topProducts.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${topProductsRows}
                </tbody>
              </table>
            ` : '<p>No hay datos para el período seleccionado</p>'}
          </div>
          
          <div class="section">
            <h2>Ventas por Método de Pago</h2>
            ${salesByPaymentMethod.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Método</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${paymentMethodRows}
                </tbody>
              </table>
            ` : '<p>No hay datos para el período seleccionado</p>'}
          </div>
          
          <div class="footer">
            <p>VentaFácil - Sistema de Gestión de Ventas</p>
          </div>
        </body>
      </html>
    `;

    // Generar PDF
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    // Renombrar archivo con fecha
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const newUri = `${FileSystem.documentDirectory}reporte_ventas_${timestamp}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri
    });

    // Compartir PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Exportar reporte de ventas',
      });
      return true;
    } else {
      console.error('Compartir no está disponible en este dispositivo');
      return false;
    }
  } catch (error) {
    console.error('Error al generar PDF:', error);
    return false;
  }
};

// Generar PDF con detalles de una venta
export const generateSaleReceiptPDF = async (
  sale: any,
  businessInfo: {
    name: string;
    address: string;
    phone: string;
    ruc?: string;
  }
): Promise<boolean> => {
  try {
    // Formatear fecha
    const saleDate = format(
      new Date(sale.date),
      "dd 'de' MMMM, yyyy HH:mm",
      { locale: es }
    );
    
    // Generar filas de productos
    let productsRows = '';
    sale.items.forEach((item: any) => {
      productsRows += `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(item.price)}</td>
          <td>${formatCurrency(item.quantity * item.price)}</td>
        </tr>
      `;
    });
    
    // Obtener método de pago
    let paymentMethod = 'No especificado';
    switch (sale.payment_method) {
      case 'efectivo': paymentMethod = 'Efectivo'; break;
      case 'tarjeta': paymentMethod = 'Tarjeta'; break;
      case 'yape': paymentMethod = 'Yape/Plin'; break;
      case 'otro': paymentMethod = 'Otro'; break;
    }

    // Template HTML del comprobante
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Comprobante de Venta</title>
          <style>
            body {
              font-family: 'Helvetica Neue', Arial, sans-serif;
              padding: 20px;
              color: #333;
              max-width: 80mm;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .business-name {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            .business-details {
              font-size: 12px;
              margin-bottom: 3px;
            }
            .receipt-title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 15px 0;
              border-top: 1px dashed #ccc;
              border-bottom: 1px dashed #ccc;
              padding: 8px 0;
            }
            .sale-details {
              margin-bottom: 15px;
              font-size: 12px;
            }
            .sale-detail {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
              margin-bottom: 20px;
              font-size: 12px;
            }
            th, td {
              padding: 8px 4px;
              border-bottom: 1px solid #ddd;
              text-align: left;
            }
            th {
              font-weight: bold;
            }
            .totals {
              margin-top: 15px;
              font-size: 14px;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 5px;
            }
            .grand-total {
              font-weight: bold;
              font-size: 16px;
              border-top: 1px solid #333;
              padding-top: 8px;
              margin-top: 8px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              border-top: 1px dashed #ccc;
              padding-top: 10px;
            }
            .notes {
              margin-top: 15px;
              font-size: 12px;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${businessInfo.name}</div>
            <div class="business-details">${businessInfo.address}</div>
            <div class="business-details">Tel: ${businessInfo.phone}</div>
            ${businessInfo.ruc ? `<div class="business-details">RUC: ${businessInfo.ruc}</div>` : ''}
          </div>
          
          <div class="receipt-title">COMPROBANTE DE VENTA</div>
          
          <div class="sale-details">
            <div class="sale-detail">
              <span>No. Venta:</span>
              <span>${sale.id}</span>
            </div>
            <div class="sale-detail">
              <span>Fecha:</span>
              <span>${saleDate}</span>
            </div>
            <div class="sale-detail">
              <span>Método de pago:</span>
              <span>${paymentMethod}</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${productsRows}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-row grand-total">
              <span>TOTAL:</span>
              <span>${formatCurrency(sale.total)}</span>
            </div>
          </div>
          
          ${sale.notes ? `
            <div class="notes">
              <strong>Notas:</strong>
              <p>${sale.notes}</p>
            </div>
          ` : ''}
          
          <div class="footer">
            <p>¡Gracias por su compra!</p>
            <p>VentaFácil</p>
          </div>
        </body>
      </html>
    `;

    // Generar PDF
    const { uri } = await Print.printToFileAsync({ html: htmlContent });
    
    // Renombrar archivo con fecha
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const newUri = `${FileSystem.documentDirectory}boleta_${sale.id}_${timestamp}.pdf`;
    await FileSystem.moveAsync({
      from: uri,
      to: newUri
    });

    // Compartir PDF
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(newUri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir comprobante de venta',
      });
      return true;
    } else {
      console.error('Compartir no está disponible en este dispositivo');
      return false;
    }
  } catch (error) {
    console.error('Error al generar comprobante PDF:', error);
    return false;
  }
};

// Función para generar un archivo CSV
export const exportToCSV = async (data: any[], filename: string) => {
  try {
    // Convertir a formato CSV usando PapaParse
    const csv = Papa.unparse(data, {
      delimiter: ',',
      header: true,
    });
    
    // Ruta del archivo
    const path = `${FileSystem.documentDirectory}${filename}.csv`;
    
    // Escribir el archivo
    await FileSystem.writeAsStringAsync(path, csv);
    
    // Compartir el archivo
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: `Compartir ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
      return true;
    } else {
      console.log('Sharing not available');
      return false;
    }
  } catch (error) {
    console.error('Error exporting to CSV:', error);
    return false;
  }
};

// Función para exportar el historial de ventas a CSV
export const exportSalesHistoryToCSV = async (sales: any[]) => {
  // Preparar los datos para CSV
  const csvData = sales.map(sale => ({
    'ID': sale.id,
    'Fecha': sale.date ? format(new Date(sale.date), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
    'Total': sale.total.toFixed(2),
    'Método de pago': formatPaymentMethod(sale.payment_method),
    'Notas': sale.notes || '',
    'Sincronizado': sale.sync_status === 1 ? 'Sí' : 'No'
  }));
  
  const filename = `ventas_${format(new Date(), 'yyyy-MM-dd')}`;
  return exportToCSV(csvData, filename);
};

// Función para exportar los detalles de una venta específica a CSV
export const exportSaleDetailsToCSV = async (sale: any) => {
  if (!sale || !sale.items) return false;
  
  // Preparar los datos para CSV
  const csvData = sale.items.map((item: any) => ({
    'Producto': item.product_name,
    'Cantidad': item.quantity,
    'Precio unitario': item.price.toFixed(2),
    'Subtotal': (item.quantity * item.price).toFixed(2)
  }));
  
  const filename = `venta_${sale.id}_${format(new Date(sale.date), 'yyyy-MM-dd')}`;
  return exportToCSV(csvData, filename);
};

// Función para exportar el reporte de ventas a CSV
export const exportSalesReportToCSV = async (reportData: any) => {
  if (!reportData) return false;
  
  // Datos diarios
  const dailyData = reportData.dailySalesData.map((day: any) => ({
    'Fecha': format(new Date(day.date), 'dd/MM/yyyy', { locale: es }),
    'Total Ventas': day.totalSales.toFixed(2),
    'Cantidad Ventas': day.salesCount
  }));
  
  // Productos más vendidos
  const productsData = reportData.topProducts.map((product: any) => ({
    'Producto': product.name,
    'Cantidad': product.quantity,
    'Total': product.total.toFixed(2)
  }));
  
  // Ventas por método de pago
  const paymentMethodsData = reportData.salesByPaymentMethod.map((method: any) => ({
    'Método de pago': formatPaymentMethod(method.method),
    'Total': method.total.toFixed(2)
  }));
  
  // Combinar todos los reportes en un solo CSV con secciones
  const csvData = [
    { 'Reporte de Ventas': `Del ${format(new Date(reportData.dateRange.startDate), 'dd/MM/yyyy', { locale: es })} al ${format(new Date(reportData.dateRange.endDate), 'dd/MM/yyyy', { locale: es })}` },
    { 'Total ventas': reportData.totalSalesAmount.toFixed(2), 'Cantidad ventas': reportData.salesCount, 'Promedio por venta': reportData.averageSaleAmount.toFixed(2) },
    { '': '' }, // Línea en blanco como separador
    { 'VENTAS DIARIAS': '' },
    ...dailyData,
    { '': '' }, // Línea en blanco como separador
    { 'PRODUCTOS MÁS VENDIDOS': '' },
    ...productsData,
    { '': '' }, // Línea en blanco como separador
    { 'VENTAS POR MÉTODO DE PAGO': '' },
    ...paymentMethodsData
  ];
  
  const filename = `reporte_ventas_${format(new Date(), 'yyyy-MM-dd')}`;
  return exportToCSV(csvData, filename);
};

// Función auxiliar para formatear el método de pago
const formatPaymentMethod = (method: string): string => {
  switch(method) {
    case 'efectivo': return 'Efectivo';
    case 'tarjeta': return 'Tarjeta';
    case 'yape': return 'Yape/Plin';
    case 'otro': return 'Otro';
    default: return method;
  }
};