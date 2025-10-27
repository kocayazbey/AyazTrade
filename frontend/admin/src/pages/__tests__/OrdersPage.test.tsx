import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import OrdersPage from '../orders';
import { AuthProvider } from '../../contexts/AuthContext';

const MockedOrdersPage = () => (
  <BrowserRouter>
    <AuthProvider>
      <OrdersPage />
    </AuthProvider>
  </BrowserRouter>
);

describe('OrdersPage', () => {
  it('renders orders page correctly', () => {
    render(<MockedOrdersPage />);
    
    expect(screen.getByText('Orders Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add order/i })).toBeInTheDocument();
  });

  it('opens add order modal when add button is clicked', async () => {
    render(<MockedOrdersPage />);
    
    const addButton = screen.getByRole('button', { name: /add order/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add Order')).toBeInTheDocument();
    });
  });

  it('shows validation errors for empty fields in add order form', async () => {
    render(<MockedOrdersPage />);
    
    const addButton = screen.getByRole('button', { name: /add order/i });
    fireEvent.click(addButton);

    const saveButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter customer name')).toBeInTheDocument();
      expect(screen.getByText('Please enter total amount')).toBeInTheDocument();
      expect(screen.getByText('Please select status')).toBeInTheDocument();
    });
  });

  it('submits add order form with valid data', async () => {
    render(<MockedOrdersPage />);
    
    const addButton = screen.getByRole('button', { name: /add order/i });
    fireEvent.click(addButton);

    const customerNameInput = screen.getByLabelText('Customer Name');
    const totalAmountInput = screen.getByLabelText('Total Amount');
    const statusSelect = screen.getByLabelText('Status');
    const shippingAddressInput = screen.getByLabelText('Shipping Address');
    const paymentMethodInput = screen.getByLabelText('Payment Method');

    fireEvent.change(customerNameInput, { target: { value: 'John Doe' } });
    fireEvent.change(totalAmountInput, { target: { value: '100' } });
    fireEvent.change(statusSelect, { target: { value: 'pending' } });
    fireEvent.change(shippingAddressInput, { target: { value: '123 Main St' } });
    fireEvent.change(paymentMethodInput, { target: { value: 'Credit Card' } });

    const saveButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Order created successfully')).toBeInTheDocument();
    });
  });
});
