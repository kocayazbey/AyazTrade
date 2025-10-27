import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AyuCard, AyuButton, AyuInput, AyuTable, AyuBadge, AyuModal } from '@/components';
import { Search, Filter, Download, Eye, Edit, Trash2, RefreshCw, Plus, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/shared/Pagination';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  status: 'active' | 'inactive' | 'draft';
  createdAt: string;
  updatedAt: string;
  imageUrl?: string;
  description?: string;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  attributes: Record<string, string>;
}

interface ProductFilters {
  category: string;
  status: string;
  search: string;
  stockStatus: string;
  page: number;
  limit: number;
}

interface ProductsResponse {
  success: boolean;
  data: {
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

const ProductsPage: React.FC = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0
  });
  const [filters, setFilters] = useState<ProductFilters>({
    category: '',
    status: '',
    search: '',
    stockStatus: '',
    page: 1,
    limit: 20
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productModalOpen, setProductModalOpen] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, [filters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);
      if (filters.stockStatus) queryParams.append('stockStatus', filters.stockStatus);
      queryParams.append('page', filters.page.toString());
      queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`/api/proxy/products?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Ürünler yüklenemedi');
      }

      const data: ProductsResponse = await response.json();

      if (data.success) {
        setProducts(data.data?.products || []);
        setPagination({
          total: data.data.total,
          page: data.data.page,
          limit: data.data.limit,
          totalPages: data.data.totalPages
        });
      } else {
        throw new Error(data.message || 'Ürünler yüklenemedi');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (productId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/proxy/products/${productId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchProducts();
          toast.success('Ürün durumu güncellendi');
        } else {
          throw new Error(data.message || 'Durum güncellenemedi');
        }
      } else {
        throw new Error('Durum güncellenemedi');
      }
    } catch (error) {
      console.error('Error updating product status:', error);
      toast.error('Ürün durumu güncellenirken hata oluştu');
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (window.confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/proxy/products/${productId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            await fetchProducts();
            toast.success('Ürün başarıyla silindi');
          } else {
            throw new Error(data.message || 'Ürün silinemedi');
          }
        } else {
          throw new Error('Ürün silinemedi');
        }
      } catch (error) {
        console.error('Error deleting product:', error);
        toast.error('Ürün silinirken hata oluştu');
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'draft': return 'info';
      default: return 'default';
    }
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { status: 'Stokta Yok', color: 'error' };
    if (stock < 10) return { status: 'Az Stok', color: 'warning' };
    return { status: 'Stokta', color: 'success' };
  };

  const handleViewProduct = async (productId: string) => {
    try {
      const response = await fetch(`/api/proxy/products/${productId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Ürün bilgileri yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success && data.data.product) {
        setSelectedProduct(data.data.product);
        setProductModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error('Ürün bilgileri yüklenirken hata oluştu');
    }
  };

  const getProductStats = () => {
    const total = products.length;
    const active = products.filter(p => p.status === 'active').length;
    const outOfStock = products.filter(p => p.stock === 0).length;
    const lowStock = products.filter(p => p.stock > 0 && p.stock < 10).length;
    const totalValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    return { total, active, outOfStock, lowStock, totalValue };
  };

  const stats = getProductStats();

  const columns = [
    {
      key: 'product',
      title: 'Ürün',
      render: (value: any, record: Product) => (
        <div className="flex items-center gap-3">
          {record.imageUrl ? (
            <img
              src={record.imageUrl}
              alt={record.name}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center">
              <Package className="w-6 h-6 text-gray-400" />
            </div>
          )}
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-sm text-gray-500">SKU: {record.sku}</div>
          </div>
        </div>
      )
    },
    {
      key: 'category',
      title: 'Kategori',
      dataIndex: 'category',
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'price',
      title: 'Fiyat',
      dataIndex: 'price',
      render: (value: number) => (
        <span className="font-medium">₺{value.toLocaleString()}</span>
      )
    },
    {
      key: 'stock',
      title: 'Stok',
      dataIndex: 'stock',
      render: (value: number) => {
        const stockStatus = getStockStatus(value);
        return (
          <div>
            <div className="font-medium">{value}</div>
            <AyuBadge variant={stockStatus.color as any} size="sm">
              {stockStatus.status}
            </AyuBadge>
          </div>
        );
      }
    },
    {
      key: 'status',
      title: 'Durum',
      dataIndex: 'status',
      render: (value: string) => (
        <AyuBadge variant={getStatusColor(value) as any}>
          {value}
        </AyuBadge>
      )
    },
    {
      key: 'updatedAt',
      title: 'Güncellenme',
      dataIndex: 'updatedAt',
      render: (value: string) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString('tr-TR')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'İşlemler',
      render: (value: any, record: Product) => (
        <div className="flex gap-2">
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleViewProduct(record.id)}
          >
            <Eye className="w-4 h-4" />
          </AyuButton>
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => router.push(`/products/${record.id}/edit`)}
          >
            <Edit className="w-4 h-4" />
          </AyuButton>
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteProduct(record.id)}
            className="text-error hover:text-error"
          >
            <Trash2 className="w-4 h-4" />
          </AyuButton>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Ürün Yönetimi</h1>
        <p className="text-gray-600 mt-2">Tüm ürünleri görüntüleyin ve yönetin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Ürün</div>
            <div className="text-3xl font-bold text-primary">{stats.total}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Aktif</div>
            <div className="text-3xl font-bold text-success">{stats.active}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Stokta Yok</div>
            <div className="text-3xl font-bold text-error">{stats.outOfStock}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Az Stok</div>
            <div className="text-3xl font-bold text-warning">{stats.lowStock}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Değer</div>
            <div className="text-3xl font-bold text-success">₺{stats.totalValue.toLocaleString()}</div>
          </div>
        </AyuCard>
      </div>

      {/* Filters */}
      <AyuCard className="mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <AyuInput
              placeholder="Ürün ara..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
              className="w-full"
            />
            
            <select
              className="form-input"
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value, page: 1 })}
            >
              <option value="">Tüm Kategoriler</option>
              <option value="electronics">Elektronik</option>
              <option value="clothing">Giyim</option>
              <option value="home">Ev & Yaşam</option>
              <option value="sports">Spor</option>
              <option value="books">Kitap</option>
            </select>
            
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="draft">Taslak</option>
            </select>
            
            <select
              className="form-input"
              value={filters.stockStatus}
              onChange={(e) => setFilters({ ...filters, stockStatus: e.target.value, page: 1 })}
            >
              <option value="">Tüm Stok Durumları</option>
              <option value="inStock">Stokta</option>
              <option value="lowStock">Az Stok</option>
              <option value="outOfStock">Stokta Yok</option>
            </select>
            
            <div className="flex gap-2">
              <AyuButton
                variant="outline"
                onClick={fetchProducts}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </AyuButton>
              <AyuButton
                variant="primary"
                className="flex-1"
                onClick={() => router.push('/products/add')}
              >
                <Plus className="w-4 h-4 mr-2" />
                Yeni Ürün
              </AyuButton>
            </div>
          </div>
        </div>
      </AyuCard>

      {/* Products Table */}
      <AyuCard>
        <AyuTable
          columns={columns}
          data={products}
          loading={loading}
          emptyText="Ürün bulunamadı"
          hoverable
        />
      </AyuCard>

      {/* Product Details Modal */}
      <AyuModal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={`Ürün Detayları - ${selectedProduct?.name}`}
        size="lg"
      >
        {selectedProduct && (
          <div className="space-y-6">
            <div className="flex gap-6">
              {selectedProduct.imageUrl ? (
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-32 h-32 rounded-lg object-cover"
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-gray-200 flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">{selectedProduct.name}</h3>
                <p className="text-gray-600 mb-4">{selectedProduct.description}</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium">SKU:</span> {selectedProduct.sku}
                  </div>
                  <div>
                    <span className="font-medium">Kategori:</span> {selectedProduct.category}
                  </div>
                  <div>
                    <span className="font-medium">Fiyat:</span> ₺{selectedProduct.price.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Stok:</span> {selectedProduct.stock}
                  </div>
                  <div>
                    <span className="font-medium">Durum:</span> 
                    <AyuBadge variant={getStatusColor(selectedProduct.status) as any} className="ml-2">
                      {selectedProduct.status}
                    </AyuBadge>
                  </div>
                  <div>
                    <span className="font-medium">Güncellenme:</span> {new Date(selectedProduct.updatedAt).toLocaleDateString('tr-TR')}
                  </div>
                </div>
              </div>
            </div>
            
            {selectedProduct.variants && selectedProduct.variants.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Varyantlar</h3>
                <div className="space-y-2">
                  {selectedProduct.variants.map((variant) => (
                    <div key={variant.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{variant.name}</span>
                        <div className="flex gap-4">
                          <span>₺{variant.price.toLocaleString()}</span>
                          <span>Stok: {variant.stock}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AyuModal>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={(page) => setFilters({ ...filters, page })}
          />
        </div>
      )}
    </div>
  );
};

export default ProductsPage;