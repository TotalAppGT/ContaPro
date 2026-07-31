CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TENANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  nit VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  subdomain VARCHAR(100) NOT NULL UNIQUE,
  plan VARCHAR(50) DEFAULT 'basico',
  status VARCHAR(20) DEFAULT 'active',
  logo_url TEXT,
  address TEXT,
  phone VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'accountant' CHECK (role IN ('owner', 'admin', 'accountant', 'viewer')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHART OF ACCOUNTS (Catálogo de Cuentas)
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  codigo VARCHAR(20) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ACTIVO', 'PASIVO', 'CAPITAL', 'INGRESO', 'GASTO', 'COSTO')),
  nivel INTEGER DEFAULT 1,
  cuenta_padre UUID REFERENCES chart_of_accounts(id),
  acepta_asientos BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

-- ============================================================
-- JOURNAL ENTRIES (Asientos Contables / Partidas)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_nit VARCHAR(20),
  fecha DATE NOT NULL,
  tipo_poliza VARCHAR(20),
  concepto_general TEXT,
  numero INTEGER,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- JOURNAL ENTRY LINES (Líneas de Asiento)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,
  codigo_cuenta VARCHAR(20) NOT NULL,
  concepto TEXT,
  debe DECIMAL(18,2) DEFAULT 0,
  haber DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANK ACCOUNTS (Cuentas Bancarias)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_nit VARCHAR(20),
  nombre_banco VARCHAR(255) NOT NULL,
  numero_cuenta VARCHAR(100) NOT NULL,
  tipo_cuenta VARCHAR(50) DEFAULT 'monetaria',
  saldo_inicial DECIMAL(18,2) DEFAULT 0,
  moneda VARCHAR(10) DEFAULT 'GTQ',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BANK TRANSACTIONS (Transacciones Bancarias)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  descripcion TEXT,
  referencia VARCHAR(255),
  monto DECIMAL(18,2) NOT NULL DEFAULT 0,
  tipo VARCHAR(20) NOT NULL DEFAULT 'credito' CHECK (tipo IN ('debito', 'credito')),
  saldo_actual DECIMAL(18,2) DEFAULT 0,
  conciliado BOOLEAN DEFAULT false,
  documento_contable UUID REFERENCES journal_entries(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SALES BOOK (Libro de Ventas SAT)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_book (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_nit VARCHAR(20),
  fecha DATE NOT NULL,
  numero_documento VARCHAR(100),
  serie VARCHAR(50),
  nit_cliente VARCHAR(20),
  nombre_cliente VARCHAR(255),
  tipo_documento VARCHAR(50),
  regimen VARCHAR(20) DEFAULT 'GENERAL',
  total DECIMAL(18,2) DEFAULT 0,
  base_imponible DECIMAL(18,2) DEFAULT 0,
  iva DECIMAL(18,2) DEFAULT 0,
  exento DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PURCHASES BOOK (Libro de Compras SAT)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases_book (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  client_nit VARCHAR(20),
  fecha DATE NOT NULL,
  numero_documento VARCHAR(100),
  serie VARCHAR(50),
  nit_proveedor VARCHAR(20),
  nombre_proveedor VARCHAR(255),
  tipo_documento VARCHAR(50),
  regimen VARCHAR(20) DEFAULT 'GENERAL',
  total DECIMAL(18,2) DEFAULT 0,
  base_imponible DECIMAL(18,2) DEFAULT 0,
  iva DECIMAL(18,2) DEFAULT 0,
  exento DECIMAL(18,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  payment_provider_id VARCHAR(255),
  amount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant ON journal_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_fecha ON journal_entries(fecha);
CREATE INDEX IF NOT EXISTS idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_account ON bank_transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_fecha ON bank_transactions(fecha);
CREATE INDEX IF NOT EXISTS idx_sales_book_tenant ON sales_book(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_book_fecha ON sales_book(fecha);
CREATE INDEX IF NOT EXISTS idx_purchases_book_tenant ON purchases_book(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_book_fecha ON purchases_book(fecha);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id);
