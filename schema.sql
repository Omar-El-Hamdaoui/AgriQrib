-- ============================================================================
-- TERROIR DIRECT - Schéma PostgreSQL (Supabase)
-- Correction : ENUM remplacés par CREATE TYPE ... AS ENUM
-- ============================================================================

-- ── Types énumérés ────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
    'producer', 'buyer_individual', 'buyer_restaurant', 'buyer_transit', 'admin'
);

CREATE TYPE product_unit AS ENUM (
    'kg', 'piece', 'bunch', 'liter', 'dozen'
);

CREATE TYPE order_status AS ENUM (
    'pending', 'confirmed', 'preparing', 'ready', 'in_transit', 'delivered', 'cancelled'
);

CREATE TYPE delivery_method AS ENUM (
    'pickup', 'delivery'
);

CREATE TYPE offer_status AS ENUM (
    'pending', 'accepted', 'rejected', 'counter_offer', 'expired'
);

CREATE TYPE notification_type AS ENUM (
    'order_update', 'offer_received', 'offer_response', 'new_product', 'delivery_reminder'
);

-- ── 1. UTILISATEURS ───────────────────────────────────────────────────────────
-- Note : id = même UUID que auth.users de Supabase

CREATE TABLE users (
    id            UUID PRIMARY KEY,
    email         VARCHAR(255) UNIQUE NOT NULL,
    role          user_role NOT NULL,
    first_name    VARCHAR(100) NOT NULL,
    last_name     VARCHAR(100) NOT NULL,
    phone         VARCHAR(20),
    avatar_url    TEXT,
    is_verified   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

-- ── 2. FERMES ─────────────────────────────────────────────────────────────────

CREATE TABLE farms (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_name             VARCHAR(200) NOT NULL,
    description           TEXT,
    address               TEXT NOT NULL,
    city                  VARCHAR(100) NOT NULL,
    postal_code           VARCHAR(10) NOT NULL,
    latitude              DECIMAL(10, 8),
    longitude             DECIMAL(11, 8),
    certifications        TEXT[],
    cover_image_url       TEXT,
    rating                DECIMAL(2,1) DEFAULT 0,
    total_reviews         INT DEFAULT 0,
    is_active             BOOLEAN DEFAULT TRUE,
    delivery_radius_km    INT DEFAULT 50,
    minimum_order_amount  DECIMAL(10,2) DEFAULT 0,
    created_at            TIMESTAMP DEFAULT NOW()
);

-- ── 3. CATÉGORIES ─────────────────────────────────────────────────────────────

CREATE TABLE categories (
    id             SERIAL PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    slug           VARCHAR(100) UNIQUE NOT NULL,
    icon           VARCHAR(50),
    parent_id      INT REFERENCES categories(id),
    display_order  INT DEFAULT 0
);

-- ── 4. PRODUITS ───────────────────────────────────────────────────────────────

CREATE TABLE products (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id                 UUID REFERENCES farms(id) ON DELETE CASCADE,
    category_id             INT REFERENCES categories(id),
    name                    VARCHAR(200) NOT NULL,
    description             TEXT,
    photo_url               TEXT,
    photos                  TEXT[],
    unit                    product_unit NOT NULL,
    price_per_unit          DECIMAL(10,2) NOT NULL,
    quantity_available      DECIMAL(10,2) NOT NULL,
    minimum_quantity        DECIMAL(10,2) DEFAULT 1,
    is_organic              BOOLEAN DEFAULT FALSE,
    harvest_date            DATE,
    expiry_date             DATE,
    is_available            BOOLEAN DEFAULT TRUE,
    bulk_discount_threshold DECIMAL(10,2),
    bulk_discount_percent   DECIMAL(5,2),
    created_at              TIMESTAMP DEFAULT NOW(),
    updated_at              TIMESTAMP DEFAULT NOW()
);

-- ── 5. PANIERS ────────────────────────────────────────────────────────────────

CREATE TABLE carts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cart_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID REFERENCES carts(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity    DECIMAL(10,2) NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW(),
    UNIQUE(cart_id, product_id)
);

-- ── 6. COMMANDES ──────────────────────────────────────────────────────────────

CREATE TABLE orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id            UUID REFERENCES users(id),
    farm_id             UUID REFERENCES farms(id),
    status              order_status DEFAULT 'pending',
    total_amount        DECIMAL(10,2) NOT NULL,
    delivery_method     delivery_method NOT NULL,
    delivery_address    TEXT,
    delivery_date       DATE,
    delivery_time_slot  VARCHAR(50),
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE TABLE order_items (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_id  UUID REFERENCES products(id),
    quantity    DECIMAL(10,2) NOT NULL,
    unit_price  DECIMAL(10,2) NOT NULL,
    subtotal    DECIMAL(10,2) NOT NULL
);

-- ── 7. OFFRES DE NÉGOCIATION ──────────────────────────────────────────────────

CREATE TABLE offers (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id               UUID REFERENCES products(id) ON DELETE CASCADE,
    buyer_id                 UUID REFERENCES users(id),
    farm_id                  UUID REFERENCES farms(id),
    proposed_quantity        DECIMAL(10,2) NOT NULL,
    proposed_price_per_unit  DECIMAL(10,2) NOT NULL,
    total_proposed           DECIMAL(10,2) NOT NULL,
    original_price_per_unit  DECIMAL(10,2) NOT NULL,
    status                   offer_status DEFAULT 'pending',
    counter_price            DECIMAL(10,2),
    counter_quantity         DECIMAL(10,2),
    message                  TEXT,
    response_message         TEXT,
    expires_at               TIMESTAMP,
    created_at               TIMESTAMP DEFAULT NOW(),
    updated_at               TIMESTAMP DEFAULT NOW()
);

-- ── 8. AVIS ───────────────────────────────────────────────────────────────────

CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id    UUID REFERENCES orders(id),
    farm_id     UUID REFERENCES farms(id),
    buyer_id    UUID REFERENCES users(id),
    rating      INT CHECK (rating >= 1 AND rating <= 5),
    comment     TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ── 9. FAVORIS ────────────────────────────────────────────────────────────────

CREATE TABLE favorites (
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    farm_id     UUID REFERENCES farms(id) ON DELETE CASCADE,
    created_at  TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, farm_id)
);

-- ── 10. NOTIFICATIONS ─────────────────────────────────────────────────────────

CREATE TABLE notifications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
    type        notification_type NOT NULL,
    title       VARCHAR(200) NOT NULL,
    message     TEXT NOT NULL,
    data        JSONB,
    is_read     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

-- ── INDEX ─────────────────────────────────────────────────────────────────────

CREATE INDEX idx_products_farm      ON products(farm_id);
CREATE INDEX idx_products_category  ON products(category_id);
CREATE INDEX idx_products_available ON products(is_available, quantity_available);
CREATE INDEX idx_orders_buyer       ON orders(buyer_id);
CREATE INDEX idx_orders_farm        ON orders(farm_id);
CREATE INDEX idx_offers_status      ON offers(status);
CREATE INDEX idx_farms_location     ON farms(latitude, longitude);