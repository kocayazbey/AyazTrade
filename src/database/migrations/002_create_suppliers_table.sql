-- Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_person VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Türkiye',
    tax_number VARCHAR(50),
    status VARCHAR(20) DEFAULT 'active',
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    credit_limit DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_city ON suppliers(city);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_code ON suppliers(code);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_deleted_at ON suppliers(deleted_at);

-- Add comments
COMMENT ON TABLE suppliers IS 'Tedarikçi bilgileri';
COMMENT ON COLUMN suppliers.id IS 'Tedarikçi benzersiz kimliği';
COMMENT ON COLUMN suppliers.name IS 'Tedarikçi firma adı';
COMMENT ON COLUMN suppliers.code IS 'Tedarikçi kodu';
COMMENT ON COLUMN suppliers.contact_person IS 'İrtibat kişisi';
COMMENT ON COLUMN suppliers.email IS 'E-posta adresi';
COMMENT ON COLUMN suppliers.phone IS 'Telefon numarası';
COMMENT ON COLUMN suppliers.address IS 'Adres';
COMMENT ON COLUMN suppliers.city IS 'Şehir';
COMMENT ON COLUMN suppliers.country IS 'Ülke';
COMMENT ON COLUMN suppliers.tax_number IS 'Vergi numarası';
COMMENT ON COLUMN suppliers.status IS 'Durum (active/inactive/pending)';
COMMENT ON COLUMN suppliers.payment_terms IS 'Ödeme koşulları';
COMMENT ON COLUMN suppliers.credit_limit IS 'Kredi limiti';
COMMENT ON COLUMN suppliers.balance IS 'Bakiye';
COMMENT ON COLUMN suppliers.created_at IS 'Oluşturulma tarihi';
COMMENT ON COLUMN suppliers.updated_at IS 'Güncellenme tarihi';
COMMENT ON COLUMN suppliers.deleted_at IS 'Silinme tarihi (soft delete)';
