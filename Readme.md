# FoodFast — Hướng dẫn chi tiết & Starter

> Mục tiêu: dự án **FoodFast** gồm 4 microservices (User, Product, Order, Payment) + frontend React (3 UI: Khách hàng, Nhà hàng, Monitoring). Backend Node.js (TypeScript khuyến nghị). Dự án cần có: luồng trạng thái đơn hàng, cập nhật thời gian thực, deploy bằng Docker, code kèm README để up lên GitHub.

---

## Mục lục

1. Tổng quan & Yêu cầu
2. Kiến trúc hệ thống (máy cao cấp / sơ đồ)
3. Đề xuất Tech stack
4. Cấu trúc repository (mono-repo)
5. Mô hình dữ liệu (SQL) cho từng service
6. API spec chính (User, Product, Order, Payment)
7. Order state machine (chi tiết các trạng thái + transition rules)
8. Giao tiếp giữa service (sync vs async) + event payload mẫu
9. Thông báo thời gian thực (WebSocket / Socket.IO) — server + client example
10. Authentication & Authorization
11. Docker & docker-compose (mẫu)
12. CI / CD cơ bản (GitHub Actions mẫu)
13. Testing, Logging, Monitoring, Healthchecks
14. Cách tổ chức UI React (pages, components) + UX flow
15. Checklist để được điểm cao & cách trình bày trên GitHub
16. Next steps & nhiệm vụ ngắn gọn (MVP -> stretch)

---

## 1) Tổng quan & Yêu cầu

* 4 backend services: **User**, **Product**, **Order**, **Payment**.
* 3 giao diện: **Client (khách hàng đặt hàng)**, **Restaurant (nhà hàng nhận/processing/delivering)**, **Monitoring (admin, giám sát đơn hàng)**.
* Frontend: React (khuyến nghị dùng TypeScript + Vite/Create React App). Backend: Node.js (+ TypeScript) với Express (hoặc NestJS nếu muốn cấu trúc sẵn).
* Order lifecycle: `ordering -> processing -> delivering -> done` (và các ngoại lệ như `cancelled`, `failed_delivery`).
* Real-time: gửi update trạng thái đến khách hàng/nhà hàng/monitoring.
* Dev-friendly: Docker Compose để chạy local, kèm Postgres và RabbitMQ (hoặc Redis) cho messaging.

---

## 2) Kiến trúc hệ thống (mô tả)

```
[React Client] <--HTTP/REST/WebSocket--> [API Gateway / BFF]
                                     |---> User Service (auth, profiles)
                                     |---> Product Service (restaurants, menu)
                                     |---> Order Service (order, status, events)
                                     |---> Payment Service (pay, refund)

Order Service --(publish event)--> Message Broker (RabbitMQ/Redis) --> subscribers (Notification / Monitoring / Restaurant UI)

DBs: each service has its own Postgres schema (or shared DB with schemas for a simple project)
```

Gợi ý: để đơn giản bạn có thể không làm API Gateway, nhưng dùng gateway sẽ giúp authentication + socket gateway dễ quản.

---

## 3) Tech stack (đề xuất)

* Backend: Node.js 18+, **TypeScript**, Express hoặc NestJS
* DB: PostgreSQL
* Message broker: RabbitMQ (mạnh mẽ) hoặc Redis Pub/Sub (đơn giản)
* Cache / session: Redis (nếu cần)
* Frontend: React + TypeScript + Vite, TailwindCSS hoặc Chakra/MUI
* Realtime: Socket.IO (server + client) hoặc SSE
* Test: Jest + Supertest (backend), React Testing Library (frontend)
* Container: Docker, Docker Compose
* CI: GitHub Actions (build, test)

---

## 4) Cấu trúc repository (mono-repo - recommended)

```
/ (root)
  ├─ services/
  │   ├─ user-service/
  │   ├─ product-service/
  │   ├─ order-service/
  │   └─ payment-service/
  ├─ client/                # React app
  ├─ infra/                 # docker-compose, nginx, env.example
  ├─ docs/                  # design, ER diagrams
  └─ README.md
```

Ưu điểm: dễ quản lý, build script chung, CI dễ cấu hình.

---

## 5) Mô hình dữ liệu (SQL mẫu)

> Lưu ý: mỗi service giữ DB riêng (logical separation). Dưới đây là bản tóm tắt các bảng chính.

### User Service (users)

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'customer', -- customer | restaurant | admin
  full_name VARCHAR(150),
  restaurant_id UUID, -- nếu role = restaurant
  created_at TIMESTAMP DEFAULT now()
);
```

### Product Service (restaurants + products)

```sql
CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  address TEXT,
  owner_id UUID,
  opening_hours JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id),
  name VARCHAR(255),
  description TEXT,
  price NUMERIC(10,2),
  category VARCHAR(100),
  available BOOLEAN DEFAULT true
);
```

### Order Service (orders + items)

```sql
CREATE TYPE order_status AS ENUM ('ordering','processing','delivering','done','cancelled','failed_delivery');

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  restaurant_id UUID,
  total_amount NUMERIC(10,2),
  status order_status DEFAULT 'ordering',
  address TEXT,
  phone VARCHAR(50),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID,
  name VARCHAR(255),
  price NUMERIC(10,2),
  quantity INT
);
```

### Payment Service (payments)

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  amount NUMERIC(10,2),
  status VARCHAR(30), -- pending, succeeded, failed, refunded
  provider VARCHAR(50),
  provider_payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 6) API spec chính (tóm tắt)

> Dùng REST cho tất cả service — mỗi service expose url riêng (ví dụ `http://localhost:5001/users`, `:5002/products`, `:5003/orders`, `:5004/payments`).

### User Service

* `POST /auth/register` {email,password,role,full_name} -> 201
* `POST /auth/login` {email,password} -> {accessToken, refreshToken}
* `GET /users/me` -> user profile

### Product Service

* `GET /restaurants` -> list
* `GET /restaurants/:id` -> detail + menu
* `POST /restaurants/:id/products` -> create product (auth: restaurant)

### Order Service

* `POST /orders`  (customer) body: {restaurant_id, items:[{product_id, quantity}], address, phone, payment_method}

  * Response: order object (status=ordering)
  * Side-effect: publish `order.created` event
* `GET /orders/:id` -> detail
* `PUT /orders/:id/status` (restaurant or system) {status: 'processing'|'delivering'|'done'|'cancelled'}

  * Only allowed transitions permitted
  * On status change: publish `order.updated` event

### Payment Service

* `POST /payments` {order_id, amount, method} -> returns payment url / client_secret
* Webhook endpoint: `POST /payments/webhook` (Stripe-like) để cập nhật trạng thái payment
* On payment success -> publish `payment.succeeded` event

**Event examples (JSON):**

```json
// order.created
{ "type": "order.created", "data": { "order_id": "...", "user_id": "...", "restaurant_id": "...", "total": 120000 } }

// order.updated
{ "type": "order.updated", "data": { "order_id": "...", "status": "processing" } }
```

---

## 7) Order state machine (chi tiết)

**States**: `ordering` -> `processing` -> `delivering` -> `done`
**Other**: `cancelled`, `failed_delivery`

**Transitions (allowed):**

* `ordering` -> `processing` (trigger: restaurant chấp nhận)
* `ordering` -> `cancelled` (trigger: user cancel trước khi processing)
* `processing` -> `delivering` (trigger: nhà hàng báo hoàn thành & giao)
* `delivering` -> `done` (trigger: user xác nhận nhận)
* `delivering` -> `failed_delivery` (trigger: giao nhưng không ai nhận)
* `failed_delivery` -> `cancelled` or -> `returning` (policy tuỳ chọn)

**Quy tắc/kiểm tra:**

* Chỉ nhà hàng được chuyển `ordering -> processing`.
* Chỉ hệ thống (hoặc shipper trong tương lai) được chuyển `processing -> delivering`.
* Chỉ khách hàng được chuyển `delivering -> done` (xác nhận nhận).
* Mỗi transition phải ghi log / history để audit.

**Order history table** (ghi lại mọi thay đổi trạng thái):

```sql
CREATE TABLE order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  from_status TEXT,
  to_status TEXT,
  changed_by VARCHAR(100),
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

---

## 8) Giao tiếp giữa service (sync vs async)

* **Synchronous**: Frontend gọi Order Service -> trả order_id. Order Service có thể gọi Product Service / User Service sync để kiểm tra dữ liệu (hoặc dùng cached data).
* **Asynchronous (recommended for state updates & notifications)**: Order Service publish events to RabbitMQ. Một Notification/Socket Gateway subscribe event và push tới WebSocket client. Monitoring service cũng subscribe để cập nhật dashboard.

**Khi nào dùng async:** khi muốn thông báo real-time hoặc khi muốn viết log/analytics tách rời.

**Ví dụ payload (order.updated):**

```json
{
  "event": "order.updated",
  "data": {
    "order_id": "...",
    "status": "processing",
    "updated_at": "2025-10-01T15:00:00Z"
  }
}
```

---

## 9) Thông báo thời gian thực (Socket.IO) — ví dụ code

### Server (Node + socket.io) — tóm tắt

* Tạo 1 **socket gateway** service (hoặc chạy trong API Gateway) kết nối tới RabbitMQ.
* Khi có event `order.updated`, push event tới room tương ứng: `socket.to(order.user_id).emit('order_update', payload)`.

**Pseudo-code:**

```ts
// khi nhận event từ RabbitMQ
const payload = { orderId, status };
io.to(`user:${userId}`).emit('order_update', payload);
io.to(`restaurant:${restaurantId}`).emit('order_update', payload);
io.emit('monitoring:order_update', payload); // cho dashboard
```

### Client (React + socket.io-client) — ví dụ

```tsx
import { io } from 'socket.io-client';

const socket = io('http://localhost:6000', { auth: { token: 'Bearer ...' } });

useEffect(() => {
  socket.on('order_update', data => {
    // cập nhật UI
  });
  return () => { socket.off('order_update'); }
}, []);
```

Gợi ý: sử dụng rooms theo user id hoặc restaurant id để chỉ gửi đến client cần nhận.

---

## 10) Authentication & Authorization

* Dùng JWT (access token ngắn hạn + refresh token dài hạn).
* User service có `/auth/login`, `/auth/refresh`.
* Mỗi request đến dịch vụ khác (product/order) cần header `Authorization: Bearer <token>`; middleware xác thực token và attach `req.user`.
* Role-based access: `customer`, `restaurant`, `admin`.

---

## 11) Docker & docker-compose (mẫu cơ bản)

**docker-compose.yml (tóm tắt)**

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data
  rabbitmq:
    image: rabbitmq:3-management
    ports: ['15672:15672']
  user-service:
    build: ./services/user-service
    env_file: .env.user
    depends_on: ['postgres']
  product-service:
    build: ./services/product-service
    env_file: .env.product
    depends_on: ['postgres']
  order-service:
    build: ./services/order-service
    env_file: .env.order
    depends_on: ['postgres','rabbitmq']
  payment-service:
    build: ./services/payment-service
    env_file: .env.payment
    depends_on: ['postgres']
  socket-gateway:
    build: ./services/socket-gateway
    env_file: .env.socket
    depends_on: ['rabbitmq']
  client:
    build: ./client
    ports: ['3000:3000']
volumes:
  pgdata:
```

Chạy `docker-compose up --build` để chạy toàn bộ hệ thống local.

---

## 12) CI / CD (GitHub Actions mẫu)

* Workflow: install, run lint, run tests, build docker images.
* Nếu muốn deploy: push to DockerHub / GitHub Container Registry.

**.github/workflows/ci.yml (mẫu)**

```yaml
name: CI
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with: node-version: 18
      - run: yarn install
      - run: yarn test
```

---

## 13) Testing, Logging, Monitoring

* **Testing**: Unit tests cho services (Jest), integration tests (Supertest + real DB via docker-testcontainers or sqlite for speed), e2e cho frontend.
* **Logging**: Winston / pino cho backend. Ghi log change-status, errors.
* **Monitoring**: health endpoints (`GET /health`), Prometheus metrics (optional), hoặc dùng `rabbitmq:15672` để quan sát brokers.

---

## 14) UI React — cấu trúc & UX flow

**Pages (3 app flows):**

* Client (customer): Home, Restaurant detail, Cart, Checkout, Order tracking
* Restaurant: Orders list (filter: new/processing/delivering), Order detail, change status buttons
* Monitoring: Live map/list of all orders (cập nhật realtime), metrics (số orders, avg time)

**Components chính:**

* `Header`, `Footer`, `RestaurantCard`, `ProductCard`, `Cart`, `OrderTracker`, `OrderList`

**Flow đặt hàng (tóm tắt):**

1. Khách chọn món -> tạo cart -> Checkout (gọi Payment service)
2. Tạo order: `POST /orders` -> nhận `order_id`
3. Backend publish event `order.created` -> restaurant UI nhận tin (tray)
4. Restaurant accept -> update status to `processing` -> publish `order.updated`
5. Khi shipper bắt đầu, set `delivering` -> publish
6. Khách xác nhận -> update `done`.

**Thiết kế UI:** pastel colors như bạn muốn; Tailwind + component library để nhanh.

---

## 15) Checklist để được điểm cao & cách trình bày trên GitHub

**Bắt buộc (MVP):**

* [x] Hệ thống chạy với `docker-compose up --build`
* [x] Đăng ký/Đăng nhập (JWT)
* [x] CRUD restaurants & products
* [x] Tạo order, chuyển trạng thái theo quy tắc
* [x] Cập nhật realtime (socket)
* [x] Payment mock (hoặc Stripe test)
* [x] README chi tiết + Postman collection

**Nâng cao (để nổi bật):**

* Unit & integration tests
* GitHub Actions CI
* Dockerfile tối ưu
* Monitoring / metrics / health
* Deploy demo (Heroku / Render / Fly / DigitalOcean)

**Cách viết README để impress:**

* Overview + architecture diagram
* Quick start (commands dùng để chạy)
* API docs & Postman link
* Screenshots / gif demo
* Live demo link (nếu deploy)

---

## 16) Next steps & nhiệm vụ ngắn gọn (MVP -> stretch)

**MVP (1-2 tuần):**

1. Thiết lập repository, docker-compose, Postgres, RabbitMQ.
2. Viết User service (auth + JWT).
3. Viết Product service (restaurants, products endpoints).
4. Viết Order service (create order, change status, publish events).
5. Viết socket-gateway để nhận event và push realtime.
6. Viết React client (basic ordering + order tracking) và Restaurant UI (list orders + change status).

**Stretch (tuần tiếp theo):**

* Payment service tích hợp Stripe test
* Tests + CI
* Monitoring dashboard
* Deploy demo online

---

## Mẫu code & helper snippets (quick-start)

**1) Tạo order (Order Service) — Express handler (pseudo)**

```ts
app.post('/orders', async (req,res)=>{
  const { userId, restaurantId, items, address } = req.body;
  // 1. validate items with Product Service (or accept snapshot)
  // 2. compute total
  const order = await db.insertOrder(...);
  // 3. publish event
  await rabbit.publish('order.created', { orderId: order.id, userId, restaurantId });
  res.status(201).json(order);
});
```

**2) Change status + publish**

```ts
app.put('/orders/:id/status', async (req,res)=>{
  const { status } = req.body;
  // check permission
  const old = await db.getOrder(id);
  if(!allowed(old.status, status)) return res.status(400)
  await db.updateOrderStatus(id, status);
  await rabbit.publish('order.updated', { orderId: id, status });
  res.json({ ok: true });
});
```

**3) React socket client example**

```tsx
import { io } from 'socket.io-client';
const socket = io('http://localhost:6000', { auth: { token } });
useEffect(()=>{
  socket.on('order_update', data => setOrder(prev=> ({...prev, status: data.status})))
  return ()=>{ socket.disconnect(); }
},[])
```

---

## Tài liệu / nguồn tham khảo (làm repo):

* Đính kèm file Postman collection (export JSON).
* Screenshots UI.
* Hướng dẫn chạy từng service (README ở mỗi services/*.md)

---

## Kết luận & Tôi có thể giúp gì tiếp theo

Mình đã soạn hướng dẫn chi tiết này để bạn có thể thực hiện đồ án và đẩy lên GitHub. Trong bước tiếp theo mình **có thể** (chọn 1 hoặc nhiều):

* Scaffold (tạo skeleton) **Order Service** + Dockerfile + example SQL
* Scaffold **React client** (Vite + Tailwind) với trang Home, Restaurant, Order Tracker
* Viết **docker-compose.yml** đầy đủ cho toàn bộ hệ thống
* Viết **README.md** hoàn chỉnh để bạn up lên GitHub

Chỉ cần nói: **"Scaffold Order Service"** hoặc **"Scaffold React client"** (hoặc yêu cầu khác) — mình sẽ tạo code starter ngay lập tức.

Chúc bạn may mắn — nếu muốn mình có thể bắt tay tạo cái **starter repo** luôn để bạn chỉ việc phát triển tiếp.

---

## 🎯 Tiếp tục — Mã khung (Scaffold) **Order Service** (Node.js + TypeScript + Express)

Mình đã tạo mã khung **Order Service** trong tài liệu này (mã mẫu, Dockerfile, migration SQL, và hướng dẫn chạy). Bạn có thể copy từng file vào folder `services/order-service` rồi chạy.

### Nội dung chính đã thêm

* `package.json` (script build, dev)
* `tsconfig.json`
* `Dockerfile`
* `docker-compose` snippet (để chạy cùng Postgres + RabbitMQ)
* `src/index.ts` (Express app, kết nối DB, RabbitMQ)
* `src/db.ts` (pg pool)
* `src/routes/orders.ts` (endpoints: POST /orders, GET /orders/:id, PUT /orders/:id/status)
* `src/rabbit.ts` (kết nối và publish sample)
* `migrations/001_create_orders.sql`
* Hướng dẫn chạy local

> **Ghi chú:** đây là scaffold để bạn phát triển tiếp (đã include validation + state transition checks + event publish).

---

### `package.json`

```json
{
  "name": "order-service",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "migrate": "psql $DATABASE_URL -f migrations/001_create_orders.sql"
  },
  "dependencies": {
    "amqplib": "^0.10.3",
    "express": "^4.18.2",
    "pg": "^8.11.0",
    "uuid": "^9.0.0",
    "dotenv": "^16.0.3"
  },
  "devDependencies": {
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.4.2",
    "@types/express": "^4.17.17",
    "@types/node": "^20.2.5",
    "@types/uuid": "^9.0.2"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "CommonJS",
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

### `Dockerfile`

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 4000
CMD ["node","dist/index.js"]
```

### `docker-compose` (snippet to add to root `docker-compose.yml`)

```yaml
  order-service:
    build: ./services/
```
