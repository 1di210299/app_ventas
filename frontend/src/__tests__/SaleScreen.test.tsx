import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SaleScreen from '../screens/sales/SaleScreen';
import { useSalesStore } from '../store/salesStore';
import { useProductStore } from '../store/productStore';

// Mock de los stores
jest.mock('../store/salesStore');
jest.mock('../store/productStore');
jest.mock('expo-barcode-scanner', () => ({
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
}));

describe('SaleScreen', () => {
  beforeEach(() => {
    // Mock de las funciones del store
    useSalesStore.mockReturnValue({
      currentSale: {
        items: [],
        total: 0,
        payment_method: 'efectivo',
        notes: '',
      },
      addItemToSale: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItemFromSale: jest.fn(),
      setPaymentMethod: jest.fn(),
      setNotes: jest.fn(),
      clearSale: jest.fn(),
      completeSale: jest.fn().mockResolvedValue(true),
      isLoading: false,
    });
    
    useProductStore.mockReturnValue({
      products: [
        { id: 1, name: 'Producto 1', price: 10, stock: 20 },
        { id: 2, name: 'Producto 2', price: 15, stock: 5 },
      ],
      searchProducts: jest.fn().mockResolvedValue([
        { id: 1, name: 'Producto 1', price: 10, stock: 20 },
      ]),
      isLoading: false,
    });
  });

  it('renders correctly', () => {
    const { getByText, getByPlaceholderText } = render(<SaleScreen />);
    
    expect(getByPlaceholderText('Buscar producto por nombre o código')).toBeTruthy();
    expect(getByText('Venta actual')).toBeTruthy();
    expect(getByText('Total:')).toBeTruthy();
    expect(getByText('S/ 0.00')).toBeTruthy();
  });

  it('searches for products and displays results', async () => {
    const { getByPlaceholderText, findByText } = render(<SaleScreen />);
    
    const searchInput = getByPlaceholderText('Buscar producto por nombre o código');
    fireEvent.changeText(searchInput, 'Producto');
    
    const productResult = await findByText('Producto 1');
    expect(productResult).toBeTruthy();
    expect(useProductStore().searchProducts).toHaveBeenCalledWith('Producto');
  });

  it('adds product to sale when clicked', async () => {
    const { getByPlaceholderText, findByText } = render(<SaleScreen />);
    
    const searchInput = getByPlaceholderText('Buscar producto por nombre o código');
    fireEvent.changeText(searchInput, 'Producto');
    
    const productResult = await findByText('Producto 1');
    fireEvent.press(productResult);
    
    expect(useSalesStore().addItemToSale).toHaveBeenCalledWith(
      { id: 1, name: 'Producto 1', price: 10, stock: 20 },
      1
    );
  });

  it('completes sale when button is pressed', async () => {
    // Cambiar el mock para tener items en la venta
    useSalesStore.mockReturnValue({
      currentSale: {
        items: [{ product_id: 1, product_name: 'Producto 1', quantity: 2, price: 10 }],
        total: 20,
        payment_method: 'efectivo',
        notes: '',
      },
      addItemToSale: jest.fn(),
      updateItemQuantity: jest.fn(),
      removeItemFromSale: jest.fn(),
      setPaymentMethod: jest.fn(),
      setNotes: jest.fn(),
      clearSale: jest.fn(),
      completeSale: jest.fn().mockResolvedValue(true),
      isLoading: false,
    });

    const { getByText } = render(<SaleScreen />);
    
    const completeButton = getByText('Completar venta');
    fireEvent.press(completeButton);
    
    await waitFor(() => {
      expect(useSalesStore().completeSale).toHaveBeenCalled();
    });
  });
});