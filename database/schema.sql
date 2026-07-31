-- ============================================================
-- ContaPro - Sistema Contable Multi-Tenant para Guatemala
-- Esquema PostgreSQL alineado con la API Express
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. TENANTS (Despachos / Empresas)
-- ============================================================
CREATE TABLE IF NOT EXISTS tenants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre          VARCHAR(255) NOT NULL,
    nit             VARCHAR(20)  NOT NULL,
    email           VARCHAR(255) NOT NULL,
    subdomain       VARCHAR(100) NOT NULL UNIQUE,
    custom_domain   VARCHAR(255),
    plan            VARCHAR(20)  NOT NULL DEFAULT 'personal'
                        CHECK (plan IN ('personal', 'profesional', 'empresarial')),
    estado          VARCHAR(20)  NOT NULL DEFAULT 'trial'
                        CHECK (estado IN ('trial', 'activo', 'suspendido', 'cancelado')),
    logo_base64     TEXT,
    direccion       TEXT,
    telefono        VARCHAR(20),
    colegiado       VARCHAR(50),
    firma_nombre    VARCHAR(255),
    trial_ends_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_subdomain ON tenants (subdomain);
CREATE INDEX idx_tenants_estado ON tenants (estado);

-- ============================================================
-- 2. USERS (Usuarios)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    rol             VARCHAR(20)  NOT NULL DEFAULT 'auxiliar'
                        CHECK (rol IN ('owner', 'contador', 'auxiliar', 'cliente_viewer')),
    activo          BOOLEAN      NOT NULL DEFAULT true,
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users (tenant_id);
CREATE INDEX idx_users_email ON users (email);

-- ============================================================
-- 3. SUBSCRIPTIONS (Suscripciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    plan                  VARCHAR(20) NOT NULL,
    estado                VARCHAR(20) NOT NULL DEFAULT 'activo',
    periodo_inicio        DATE        NOT NULL,
    periodo_fin           DATE        NOT NULL,
    monto                 NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subs_tenant ON subscriptions (tenant_id);

-- ============================================================
-- 4. CHART OF ACCOUNTS (Catálogo de Cuentas)
--  tenant_id=NULL = cuentas plantilla que se copian al registrar un nuevo tenant
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id              SERIAL PRIMARY KEY,
    tenant_id       UUID,
    codigo          VARCHAR(20)  NOT NULL,
    nombre          VARCHAR(255) NOT NULL,
    tipo            VARCHAR(20)  NOT NULL
                        CHECK (tipo IN ('ACTIVO', 'PASIVO', 'CAPITAL', 'INGRESO', 'GASTO', 'COSTO')),
    nivel           INTEGER      NOT NULL DEFAULT 1,
    acepta_asientos BOOLEAN      NOT NULL DEFAULT true,
    activo          BOOLEAN      NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, codigo)
);

CREATE INDEX idx_coa_tenant ON chart_of_accounts (tenant_id);
CREATE INDEX idx_coa_template ON chart_of_accounts (tenant_id) WHERE tenant_id IS NULL;

-- ============================================================
-- 5. JOURNAL ENTRIES (Encabezado de Asientos Contables)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id       UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_nit      VARCHAR(20),
    numero          INTEGER        NOT NULL,
    fecha           DATE           NOT NULL,
    tipo_poliza     VARCHAR(20)    DEFAULT 'DIARIO'
                        CHECK (tipo_poliza IN ('DIARIO', 'AJUSTE', 'INGRESO', 'EGRESO')),
    concepto_general TEXT,
    created_by      UUID           REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_je_tenant ON journal_entries (tenant_id);
CREATE INDEX idx_je_fecha ON journal_entries (tenant_id, fecha);
CREATE INDEX idx_je_client ON journal_entries (tenant_id, client_nit);

-- ============================================================
-- 6. JOURNAL ENTRY LINES (Detalle de Asientos Contables)
-- ============================================================
CREATE TABLE IF NOT EXISTS journal_entry_lines (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journal_entry_id    UUID           NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
    codigo_cuenta       VARCHAR(20)    NOT NULL,
    concepto            TEXT,
    debe                NUMERIC(14,2)  NOT NULL DEFAULT 0,
    haber               NUMERIC(14,2)  NOT NULL DEFAULT 0
);

CREATE INDEX idx_jel_entry ON journal_entry_lines (journal_entry_id);
CREATE INDEX idx_jel_cuenta ON journal_entry_lines (codigo_cuenta);

-- ============================================================
-- 7. SALES BOOK (Libro de Ventas)
-- ============================================================
CREATE TABLE IF NOT EXISTS sales_book (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_nit        VARCHAR(20),
    fecha             DATE           NOT NULL,
    numero_documento  VARCHAR(50)    NOT NULL,
    serie             VARCHAR(20)    DEFAULT 'FEL',
    nit_cliente       VARCHAR(20)    DEFAULT 'C/F',
    nombre_cliente    VARCHAR(255)   DEFAULT 'Consumidor Final',
    tipo_documento    VARCHAR(20)    DEFAULT 'FACTURA',
    regimen           VARCHAR(20)    DEFAULT 'GENERAL',
    total             NUMERIC(14,2)  NOT NULL DEFAULT 0,
    base_imponible    NUMERIC(14,2)  NOT NULL DEFAULT 0,
    iva               NUMERIC(14,2)  NOT NULL DEFAULT 0,
    exento            NUMERIC(14,2)  NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sb_tenant ON sales_book (tenant_id);
CREATE INDEX idx_sb_fecha ON sales_book (tenant_id, fecha);
CREATE INDEX idx_sb_client ON sales_book (tenant_id, client_nit);

-- ============================================================
-- 8. PURCHASES BOOK (Libro de Compras)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchases_book (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_nit        VARCHAR(20),
    fecha             DATE           NOT NULL,
    numero_documento  VARCHAR(50)    NOT NULL,
    serie             VARCHAR(20)    DEFAULT 'FEL',
    nit_proveedor     VARCHAR(20)    DEFAULT 'C/F',
    nombre_proveedor  VARCHAR(255)   DEFAULT 'Proveedor',
    tipo_documento    VARCHAR(20)    DEFAULT 'FACTURA',
    regimen           VARCHAR(20)    DEFAULT 'GENERAL',
    total             NUMERIC(14,2)  NOT NULL DEFAULT 0,
    base_imponible    NUMERIC(14,2)  NOT NULL DEFAULT 0,
    iva               NUMERIC(14,2)  NOT NULL DEFAULT 0,
    exento            NUMERIC(14,2)  NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pb_tenant ON purchases_book (tenant_id);
CREATE INDEX idx_pb_fecha ON purchases_book (tenant_id, fecha);
CREATE INDEX idx_pb_client ON purchases_book (tenant_id, client_nit);

-- ============================================================
-- 9. BANK ACCOUNTS (Cuentas Bancarias)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_nit        VARCHAR(20)    NOT NULL,
    banco             VARCHAR(100)   NOT NULL,
    numero_cuenta     VARCHAR(50)    NOT NULL,
    tipo_cuenta       VARCHAR(30)    DEFAULT 'Monetaria',
    moneda            VARCHAR(5)     DEFAULT 'GTQ',
    saldo_inicial     NUMERIC(14,2)  NOT NULL DEFAULT 0,
    saldo_actual      NUMERIC(14,2)  NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX idx_ba_cuenta ON bank_accounts (tenant_id, client_nit, numero_cuenta);

-- ============================================================
-- 10. BANK TRANSACTIONS (Transacciones Bancarias)
-- ============================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id         UUID           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_nit        VARCHAR(20)    NOT NULL,
    numero_cuenta     VARCHAR(50)    NOT NULL,
    fecha             DATE           NOT NULL,
    no_documento      VARCHAR(50),
    tipo              VARCHAR(30)    NOT NULL,
    concepto          TEXT,
    credito           NUMERIC(14,2)  NOT NULL DEFAULT 0,
    debito            NUMERIC(14,2)  NOT NULL DEFAULT 0,
    saldo             NUMERIC(14,2)  NOT NULL DEFAULT 0,
    conciliado        BOOLEAN        NOT NULL DEFAULT false,
    conciliado_at     TIMESTAMPTZ,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bt_tenant ON bank_transactions (tenant_id);
CREATE INDEX idx_bt_cuenta ON bank_transactions (tenant_id, numero_cuenta);
CREATE INDEX idx_bt_fecha ON bank_transactions (tenant_id, fecha);

-- ============================================================
-- 11. TAX REGIME CONFIG (Configuración Fiscal por Cliente)
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_regime_config (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id     UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_nit    VARCHAR(20)  NOT NULL,
    regimen       VARCHAR(20)  NOT NULL DEFAULT 'GENERAL'
                      CHECK (regimen IN ('GENERAL', 'PEQUENO')),
    nombre_empresa VARCHAR(255),
    nit_empresa   VARCHAR(20),
    direccion     TEXT,
    UNIQUE (tenant_id, client_nit)
);

-- ============================================================
-- 12. ACTIVITY LOG (Auditoría)
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_log (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id   UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID         REFERENCES users(id) ON DELETE SET NULL,
    accion      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_al_tenant ON activity_log (tenant_id);
CREATE INDEX idx_al_fecha ON activity_log (tenant_id, created_at DESC);

-- ============================================================
-- SEED DATA: Catálogo de Cuentas Plantilla (22 cuentas)
-- Se copian automáticamente al crear un nuevo tenant
-- ============================================================
INSERT INTO chart_of_accounts (tenant_id, codigo, nombre, tipo, nivel, acepta_asientos) VALUES
    (NULL, '101001', 'Caja',                          'ACTIVO',   1, true),
    (NULL, '101002', 'Bancos',                        'ACTIVO',   1, true),
    (NULL, '102001', 'Cuentas por Cobrar',            'ACTIVO',   1, true),
    (NULL, '102002', 'Inventarios',                   'ACTIVO',   1, true),
    (NULL, '103001', 'Mobiliario y Equipo',           'ACTIVO',   1, true),
    (NULL, '103002', 'Depreciación Acumulada',        'ACTIVO',   1, true),
    (NULL, '201001', 'Proveedores por Pagar',         'PASIVO',   1, true),
    (NULL, '202001', 'Impuestos por Pagar',           'PASIVO',   1, true),
    (NULL, '202002', 'Cuentas por Pagar Varias',      'PASIVO',   1, true),
    (NULL, '301001', 'Capital Social',                'CAPITAL',  1, true),
    (NULL, '302001', 'Utilidades del Ejercicio',      'CAPITAL',  1, true),
    (NULL, '302002', 'Utilidades Retenidas',          'CAPITAL',  1, true),
    (NULL, '401001', 'Ventas de Servicios',           'INGRESO',  1, true),
    (NULL, '401002', 'Ventas de Productos',           'INGRESO',  1, true),
    (NULL, '402001', 'Otros Ingresos',                'INGRESO',  1, true),
    (NULL, '501001', 'Compras',                       'GASTO',    1, true),
    (NULL, '502001', 'Gastos Operativos',             'GASTO',    1, true),
    (NULL, '502002', 'Sueldos y Salarios',            'GASTO',    1, true),
    (NULL, '502003', 'Alquileres',                    'GASTO',    1, true),
    (NULL, '502004', 'Servicios Básicos',             'GASTO',    1, true),
    (NULL, '502005', 'Gastos de Publicidad',          'GASTO',    1, true),
    (NULL, '503001', 'Gastos Financieros',            'GASTO',    1, true)
ON CONFLICT (tenant_id, codigo) DO NOTHING;

-- ============================================================
-- FUNCIÓN: Copiar catálogo plantilla a un nuevo tenant
-- ============================================================
CREATE OR REPLACE FUNCTION copiar_catalogo_tenant(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO chart_of_accounts (tenant_id, codigo, nombre, tipo, nivel, acepta_asientos, activo)
    SELECT p_tenant_id, codigo, nombre, tipo, nivel, acepta_asientos, activo
    FROM chart_of_accounts
    WHERE tenant_id IS NULL
    ON CONFLICT (tenant_id, codigo) DO NOTHING;
END;
$$;
