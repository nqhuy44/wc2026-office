# Admin Guide

## 1. Admin Responsibilities

Admin/BTC quản lý:

- Company/league của mình.
- Danh sách người chơi.
- Access code.
- Donations: đóng tiền + nhà tài trợ.
- Lịch trận.
- Trận nào được mở dự đoán.
- Kết quả trận.
- Tính điểm.
- Rule và prize split.
- Export dữ liệu.

Role scope:

- `ADMIN`: chỉ có quyền trên một company/league.
- `SUPER_ADMIN`: tạo/quản lý company/league và tạo admin ban đầu.

## 2. Setup Before Tournament

Checklist:

1. Tạo app setting.
2. Tạo company.
3. Tạo admin user cho company.
4. Tạo participant list.
5. Generate access code cho từng người.
6. Set contribution amount.
7. Nhập contribution status.
8. Nhập sponsor nếu có.
9. Import lịch trận.
10. Kiểm tra timezone.
11. Chọn trận sẽ mở dự đoán cho league.
12. Kiểm tra `lockAt` cho từng trận đã mở.
13. Publish rules.

## 3. Participant Management

Admin có thể:

- Add participant.
- Edit nickname.
- Disable participant.
- Reset access code.
- Assign role admin/player trong company hiện tại.

Access code chỉ hiện một lần sau khi tạo/reset.

MVP identity:

- Mỗi participant chỉ có nickname.
- Nickname unique toàn app.
- Mỗi participant thuộc đúng một company.
- Không cần email, display name, avatar hoặc password.
- Chỉ super admin được tạo company và gán admin đầu tiên.

## 4. Donations Management

Contributions và sponsors quản lý chung trong một screen `Donations`.

### Contribution status

Status:

- `PENDING`: chưa đóng.
- `PAID`: đã đóng.
- `WAIVED`: được miễn đóng.
- `REFUNDED`: đã hoàn tiền.

Admin nên ghi note nếu có trường hợp đặc biệt.

### Sponsor fields

Sponsor có thể là:

- Tiền mặt.
- Hiện vật.
- Giải phụ.

Ví dụ:

```text
Sponsor: Team DevOps
Amount: 500.000đ
Reward: Bonus for exact score champion
```

## 5. Match Management

Admin có thể tạo/import/sync fixture. Fixture từ API/CSV không tự động mở prediction.

Mỗi global match cần:

- Home team.
- Away team.
- Kickoff time.
- Stage.
- Group name nếu có.
- Venue nếu có.

Mỗi league match cần:

- Company/league.
- Match.
- Prediction enabled.
- Lock time.
- Status: not opened/open/locked/scored/void.

Admin có thể:

- Open prediction cho một fixture.
- Set/edit lock time cho fixture đó trong league của mình.
- Close/lock prediction thủ công nếu cần.
- Filter fixtures: all/open/not opened/locked/needs result.

## 6. Result Management

Sau khi trận kết thúc:

1. Admin nhập final score.
2. Chọn result source.
3. Save result.
4. Trigger scoring.
5. Kiểm tra prediction points.
6. Publish scored match.

Scoring chỉ tính cho các league đã mở prediction cho match đó.

## 7. Recalculate Score

Admin có thể recalculate nếu:

- Nhập sai kết quả.
- API sync sai.
- Có bug scoring cần sửa.

Recalculate phải tạo audit log.

## 8. Void Match

Dùng khi trận bị hủy hoặc không tính điểm.

Void match sẽ:

- Set match status `VOID`.
- Set predictions result type `VOID`.
- Set points = 0.

## 9. Admin Dashboard Widgets

Nên có:

- Participants total.
- Paid count.
- Pending payment count.
- Total prize pool.
- Leaderboard top 3.
- Matches open for prediction.
- Fixtures not opened yet.
- Upcoming matches.
- Matches needing result.
- Matches not scored.
- Recent audit logs.

Dashboard admin nên nổi bật prize pool và leaderboard giống player dashboard, nhưng thêm operational widgets.

Tất cả widget admin phải filter theo company/league của admin, trừ dữ liệu fixture/team World Cup dùng chung.

## 10. Export

Admin có thể export:

- Kết quả các trận.
- Kết quả dự đoán theo trận.
- Leaderboard hiện tại.
- Lịch sử dự đoán.
- Donations: contributions + sponsors.
- Audit logs.

MVP export CSV. XLSX có thể thêm sau.

Export phải ghi audit log và scoped theo company/league của admin. Super admin có thể export cross-company khi cần.

## 11. Manual Override

Admin có quyền override:

- Kickoff time.
- League match lock time.
- Final score.
- Match status.

Tất cả override phải được audit.
