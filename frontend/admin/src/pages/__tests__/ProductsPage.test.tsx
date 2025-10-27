import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductsPage from '../products';
import { AuthProvider } from '../../contexts/AuthContext';

const MockedProductsPage = () => (
  <BrowserRouter>
    <AuthProvider>
      <ProductsPage />
    </AuthProvider>
  </BrowserRouter>
);

describe('ProductsPage', () => {
  it('renders products page correctly', () => {
    render(<MockedProductsPage />);
    
    expect(screen.getByText('Products Management')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument();
  });

  it('opens add product modal when add button is clicked', async () => {
    render(<MockedProductsPage />);
    
    const addButton = screen.getByRole('button', { name: /add product/i });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('Add Product')).toBeInTheDocument();
    });
  });

  it('shows validation errors for empty fields in add product form', async () => {
    render(<MockedProductsPage />);
    
    const addButton = screen.getByRole('button', { name: /add product/i });
    fireEvent.click(addButton);

    const saveButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Please enter product name')).toBeInTheDocument();
      expect(screen.getByText('Please enter SKU')).toBeInTheDocument();
      expect(screen.getByText('Please enter price')).toBeInTheDocument();
    });
  });

  it('submits add product form with valid data', async () => {
    render(<MockedProductsPage />);
    
    const addButton = screen.getByRole('button', { name: /add product/i });
    fireEvent.click(addButton);

    const nameInput = screen.getByLabelText('Product Name');
    const skuInput = screen.getByLabelText('SKU');
    const priceInput = screen.getByLabelText('Price');
    const categorySelect = screen.getByLabelText('Category');
    const statusSelect = screen.getByLabelText('Status');

    fireEvent.change(nameInput, { target: { value: 'Test Product' } });
    fireEvent.change(skuInput, { target: { value: 'TEST-001' } });
    fireEvent.change(priceInput, { target: { value: '100' } });
    fireEvent.change(categorySelect, { target: { value: 'Electronics' } });
    fireEvent.change(statusSelect, { target: { value: 'active' } });

    const saveButton = screen.getByRole('button', { name: /ok/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Product created successfully')).toBeInTheDocument();
    });
  });
});
