CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
    wa_id            VARCHAR(20) NOT NULL,
    direction        VARCHAR(10) NOT NULL CHECK (direction IN ('inbound','outbound')),
    body             TEXT,
    wamid            VARCHAR(100),
    meta_timestamp   VARCHAR(20),
    status           VARCHAR(20) DEFAULT 'received',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wa_msgs_tenant ON whatsapp_messages (tenant_id);
CREATE INDEX idx_wa_msgs_waid ON whatsapp_messages (wa_id);
