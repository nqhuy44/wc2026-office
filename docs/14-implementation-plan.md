# Kế hoạch triển khai dự án Fan League (Implementation Plan)

Bản kế hoạch này được xây dựng dựa trên việc phân tích toàn bộ tài liệu (`docs/`), thiết kế mẫu (`prototypes/`), và cấu trúc source code hiện tại (tách rời `frontend` Next.js và `backend` Fastify).

> [!IMPORTANT]
> **User Review Required**
> Hiện tại cấu trúc thư mục chia làm 2 phần riêng biệt là `@fan-league/frontend` (Next.js) và `@fan-league/backend` (Fastify). Thiết kế này hơi khác so với khuyến nghị MVP ban đầu trong `07-tech-stack.md` (dùng chung Route Handler của Next.js). Vui lòng xác nhận bạn muốn tiếp tục với cấu trúc Tách biệt (Fastify + Next.js) hay muốn gộp chung thành một project Next.js duy nhất để dễ triển khai.

---

## Giai đoạn 1: Foundation & Setup (Thiết lập nền móng)

Giai đoạn này đảm bảo môi trường local chạy trơn tru cho cả Frontend và Backend.

### 1.1. Cơ sở dữ liệu (Database)
- [ ] Thiết lập `docker-compose.yml` để chạy PostgreSQL database nội bộ.
- [ ] Khởi tạo `.env` cho backend và chạy `prisma migrate dev` để tạo bảng dựa trên `schema.prisma` hiện có.
- [ ] Viết script `seed.ts` để tạo dữ liệu mẫu (Company mặc định, Admin mặc định, và vài trận đấu World Cup vòng bảng) để phục vụ test UI.

### 1.2. Frontend Tooling
- [ ] Cài đặt **Tailwind CSS**, cấu hình file `tailwind.config.ts` để map đúng bộ màu Hiện đại (Vercel-like light theme) đã chốt ở bản `ui-prototype.html`.
- [ ] Cài đặt và cấu hình **shadcn/ui** và **lucide-react** để tái sử dụng các component chuẩn.
- [ ] Thiết lập alias path (`@/components`, `@/lib`) trong `tsconfig.json`.

---

## Giai đoạn 2: Backend API Development (Fastify)

Xây dựng các REST API endpoints cung cấp dữ liệu cho ứng dụng.

### 2.1. Core Setup
- [ ] Thiết lập Prisma Client plugin cho Fastify.
- [ ] Thiết lập Error handling & Validation (sử dụng **Zod** để validate body/query).
- [ ] Implement CORS và Helmet.

### 2.2. Auth & Sessions
- [ ] `POST /api/auth/login`: Nhận Access Code, kiểm tra hash, tạo session token, trả về HTTP-only cookie.
- [ ] `POST /api/auth/logout`: Xóa session.
- [ ] Middleware xác thực quyền (Player vs Admin).

### 2.3. Modules chính
- [ ] **Matches API:** GET danh sách trận đấu (theo status), GET chi tiết trận đấu.
- [ ] **Predictions API:** POST/PUT dự đoán (cần check kỹ logic `lockAt`), GET dự đoán của bản thân, GET dự đoán của mọi người (chỉ public sau khi khóa).
- [ ] **Leaderboard API:** Query tổng hợp điểm số dựa trên `Prediction.points`.
- [ ] **Admin API:** CRUD cho Participants, Tạo Access Code, Cập nhật tỉ số trận đấu (`Match.homeScore`, `Match.awayScore`) và gọi hàm Trigger chấm điểm.

---

## Giai đoạn 3: Frontend Development (Next.js)

Biến các file HTML prototypes thành các React Components thực thụ.

### 3.1. Layouts & Navigation
- [ ] Tạo `AuthLayout` (cho trang Login).
- [ ] Tạo `MainLayout` bao gồm Responsive Sidebar (Desktop) và Bottom Navigation kính mờ (Mobile).

### 3.2. Core Components (shadcn/ui)
- [ ] Xây dựng các base components: `Button`, `Input`, `Card`, `Tabs`, `Table`.
- [ ] Tích hợp `MatchCard` (Hiển thị đội bóng, badge trạng thái, bộ đếm Stepper để dự đoán tỉ số).

### 3.3. Tích hợp Trang (Pages)
- [ ] **Login Page:** Form nhập mã truy cập.
- [ ] **Dashboard:** Hiển thị trận sắp tới, tóm tắt điểm số cá nhân, Prize pool.
- [ ] **Matches Page:** Danh sách toàn bộ trận đấu chia tab (Upcoming, Live, Finished).
- [ ] **Leaderboard Page:** Bảng xếp hạng toàn công ty.
- [ ] **Admin Panel:** Cấu trúc các trang quản lý dựa trên các màn hình prototype số 10-18.

---

## Giai đoạn 4: Integration & Testing (Tích hợp & Kiểm thử)

Kết nối 2 đầu Frontend và Backend để thành một App hoàn chỉnh.

### 4.1. Data Fetching
- [ ] Cài đặt cấu hình API Client (`axios` hoặc native `fetch`).
- [ ] Viết các service layer trên Frontend để gọi Backend.
- [ ] (Tuỳ chọn) Áp dụng **TanStack React Query** để quản lý cache và loading state cho mượt mà.

### 4.2. Kiểm thử Logic (Business Logic Testing)
- [ ] Test luồng khóa dự đoán (Không cho phép đổi tỉ số khi trận đấu `LOCKED`).
- [ ] Test Engine chấm điểm: Đảm bảo tính toán chính xác 3 điểm (Đúng tỉ số) và 1 điểm (Đúng kết quả Thắng/Hòa/Thua).

---

## Giai đoạn 5: Deployment

- [ ] Cập nhật file `Dockerfile` cho cả Frontend và Backend để tối ưu dung lượng (Multi-stage build).
- [ ] Viết tài liệu `DEPLOYMENT.md` hướng dẫn chạy trên Docker Compose (hoặc VPS).
- [ ] Thiết lập `Makefile` ở thư mục gốc để quản lý các lệnh chạy tự động (theo đúng chuẩn DevOps).

> [!NOTE]
> **Open Questions:**
> 1. Frontend fetch data từ Backend thì bạn muốn tự viết bằng `fetch`/`axios` đơn thuần hay dùng thư viện quản lý state như `React Query`?
> 2. Bạn muốn tự merge code layout, hay để tôi bắt đầu bước đầu tiên của **Giai đoạn 1** ngay bây giờ?
