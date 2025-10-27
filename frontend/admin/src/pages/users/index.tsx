import React, { useState, useEffect } from 'react';
import { AyuCard, AyuButton, AyuInput, AyuTable, AyuBadge, AyuModal } from '@/components';
import { Search, Filter, Download, Eye, Edit, Trash2, RefreshCw, UserPlus } from 'lucide-react';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'customer' | 'editor';
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin: string;
  orderCount: number;
  totalSpent: number;
}

interface UserFilters {
  role: string;
  status: string;
  search: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    role: '',
    status: '',
    search: ''
  });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userModalOpen, setUserModalOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (filters.role) queryParams.append('role', filters.role);
      if (filters.status) queryParams.append('status', filters.status);
      if (filters.search) queryParams.append('search', filters.search);

      const response = await fetch(`/api/proxy/users?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Kullanıcılar yüklenemedi');
      }

      const data = await response.json();
      
      if (data.success) {
        const transformedUsers: User[] = (data.data?.users || data.data || []).map((user: any) => ({
          id: user.id,
          username: user.username || user.email?.split('@')[0] || '',
          email: user.email || '',
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          role: user.role || 'customer',
          status: user.status || user.isActive ? 'active' : 'inactive',
          createdAt: user.createdAt ? new Date(user.createdAt).toISOString().split('T')[0] : '',
          lastLogin: user.lastLogin ? new Date(user.lastLogin).toISOString().split('T')[0] : '',
          orderCount: user.orderCount || 0,
          totalSpent: parseFloat(user.totalSpent) || 0,
        }));
        setUsers(transformedUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        await fetchUsers();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (window.confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/v1/admin/users/${userId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'error';
      case 'editor': return 'warning';
      case 'customer': return 'success';
      default: return 'default';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'inactive': return 'warning';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const handleViewUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/v1/admin/users/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedUser(data.data.user);
        setUserModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const getUserStats = () => {
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const admins = users.filter(u => u.role === 'admin').length;
    const customers = users.filter(u => u.role === 'customer').length;
    const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0);

    return { total, active, admins, customers, totalRevenue };
  };

  const stats = getUserStats();

  const columns = [
    {
      key: 'user',
      title: 'Kullanıcı',
      render: (value: any, record: User) => (
        <div>
          <div className="font-medium">{record.firstName} {record.lastName}</div>
          <div className="text-sm text-gray-500">@{record.username}</div>
        </div>
      )
    },
    {
      key: 'email',
      title: 'E-posta',
      dataIndex: 'email',
      render: (value: string) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'role',
      title: 'Rol',
      dataIndex: 'role',
      render: (value: string) => (
        <AyuBadge variant={getRoleColor(value) as any}>
          {value}
        </AyuBadge>
      )
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
      key: 'orderCount',
      title: 'Sipariş',
      dataIndex: 'orderCount',
      render: (value: number) => (
        <span className="text-sm">{value}</span>
      )
    },
    {
      key: 'totalSpent',
      title: 'Toplam Harcama',
      dataIndex: 'totalSpent',
      render: (value: number) => (
        <span className="font-medium">₺{value.toLocaleString()}</span>
      )
    },
    {
      key: 'lastLogin',
      title: 'Son Giriş',
      dataIndex: 'lastLogin',
      render: (value: string) => (
        <span className="text-sm">
          {new Date(value).toLocaleDateString('tr-TR')}
        </span>
      )
    },
    {
      key: 'actions',
      title: 'İşlemler',
      render: (value: any, record: User) => (
        <div className="flex gap-2">
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleViewUser(record.id)}
          >
            <Eye className="w-4 h-4" />
          </AyuButton>
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleStatusChange(record.id, record.status === 'active' ? 'inactive' : 'active')}
          >
            <Edit className="w-4 h-4" />
          </AyuButton>
          <AyuButton
            size="sm"
            variant="ghost"
            onClick={() => handleDeleteUser(record.id)}
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
        <h1 className="text-3xl font-bold text-gray-900">Kullanıcı Yönetimi</h1>
        <p className="text-gray-600 mt-2">Tüm kullanıcıları görüntüleyin ve yönetin</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Kullanıcı</div>
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
            <div className="text-sm font-medium text-gray-500 mb-2">Admin</div>
            <div className="text-3xl font-bold text-error">{stats.admins}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Müşteri</div>
            <div className="text-3xl font-bold text-success">{stats.customers}</div>
          </div>
        </AyuCard>
        
        <AyuCard>
          <div className="p-6">
            <div className="text-sm font-medium text-gray-500 mb-2">Toplam Gelir</div>
            <div className="text-3xl font-bold text-success">₺{stats.totalRevenue.toLocaleString()}</div>
          </div>
        </AyuCard>
      </div>

      {/* Filters */}
      <AyuCard className="mb-6">
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <AyuInput
              placeholder="Kullanıcı ara..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full"
            />
            
            <select
              className="form-input"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">Tüm Roller</option>
              <option value="admin">Admin</option>
              <option value="editor">Editör</option>
              <option value="customer">Müşteri</option>
            </select>
            
            <select
              className="form-input"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="suspended">Askıya Alınmış</option>
            </select>
            
            <div className="flex gap-2">
              <AyuButton
                variant="outline"
                onClick={fetchUsers}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Yenile
              </AyuButton>
              <AyuButton
                variant="primary"
                className="flex-1"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Yeni Kullanıcı
              </AyuButton>
            </div>
          </div>
        </div>
      </AyuCard>

      {/* Users Table */}
      <AyuCard>
        <AyuTable
          columns={columns}
          data={users}
          loading={loading}
          emptyText="Kullanıcı bulunamadı"
          hoverable
        />
      </AyuCard>

      {/* User Details Modal */}
      <AyuModal
        isOpen={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={`Kullanıcı Detayları - ${selectedUser?.firstName} ${selectedUser?.lastName}`}
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Kişisel Bilgiler</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Ad:</span> {selectedUser.firstName} {selectedUser.lastName}</p>
                <p><span className="font-medium">Kullanıcı Adı:</span> @{selectedUser.username}</p>
                <p><span className="font-medium">E-posta:</span> {selectedUser.email}</p>
                <p><span className="font-medium">Rol:</span> 
                  <AyuBadge variant={getRoleColor(selectedUser.role) as any} className="ml-2">
                    {selectedUser.role}
                  </AyuBadge>
                </p>
                <p><span className="font-medium">Durum:</span> 
                  <AyuBadge variant={getStatusColor(selectedUser.status) as any} className="ml-2">
                    {selectedUser.status}
                  </AyuBadge>
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-4">İstatistikler</h3>
              <div className="space-y-2">
                <p><span className="font-medium">Toplam Sipariş:</span> {selectedUser.orderCount}</p>
                <p><span className="font-medium">Toplam Harcama:</span> ₺{selectedUser.totalSpent.toLocaleString()}</p>
                <p><span className="font-medium">Kayıt Tarihi:</span> {new Date(selectedUser.createdAt).toLocaleDateString('tr-TR')}</p>
                <p><span className="font-medium">Son Giriş:</span> {new Date(selectedUser.lastLogin).toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>
        )}
      </AyuModal>
    </div>
  );
};

export default UsersPage;