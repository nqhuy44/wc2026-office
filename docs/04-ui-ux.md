# UI/UX Guidelines

## 1. UX Goals

- Người chơi dự đoán một trận trong dưới 10 giây.
- Giao diện rõ ràng, không gây cảm giác cá cược.
- Theme sáng, clean, ít nhiễu thị giác.
- Bảng xếp hạng minh bạch, dễ theo dõi.
- Trạng thái prediction dễ hiểu: open, locked, live, finished, scored.
- Mobile-first vì người dùng mở nhanh trên điện thoại.
- Web app dùng tốt trên desktop trong giờ làm và trên mobile khi xem nhanh.

---

## 2. Navigation

### Player Navigation

```text
Dashboard
Matches          ← live badge khi có trận đang diễn ra
Standings        ← group standings + knockout bracket
Leaderboard      ← bảng điểm nội bộ công ty
My Predictions   ← lịch sử và thống kê cá nhân
Prize Pool       ← quỹ giải và đóng góp
Rules
```

### Admin Navigation (riêng, không trộn với player)

```text
Admin Dashboard
Players          ← tạo, quản lý người chơi, cấp code
Companies        ← super admin tạo/chỉnh công ty/league
Donations        ← gộp contributions + sponsors
Matches          ← import/sửa fixture, mở trận dự đoán, set lock time
Results          ← nhập kết quả thủ công + trigger scoring
Settings         ← cài đặt app/company
Exports          ← export kết quả, dự đoán, leaderboard, audit/history
Audit Logs
```

### Company context

- User chỉ thấy dữ liệu của company gắn với access code.
- Header/sidebar hiển thị nickname + company ngắn gọn.
- Admin thấy rõ mình đang quản lý company nào (badge/label ở header).
- Admin thường chỉ có quyền trên một company/league.
- Super admin mới có quyền tạo company/league và gán admin ban đầu.

---

## 3. Dashboard UX

Dashboard ưu tiên:

1. Prize pool tổng quan — tổng quỹ, paid progress, split top 3.
2. Bảng xếp hạng nội bộ — rank của mình và top 3.
3. Trận sắp diễn ra — với nút Predict nhanh.
4. Trận đang LIVE (nếu có).
5. Dự đoán gần đây và kết quả.

Không nhồi quá nhiều bảng trên dashboard. Tối đa 4–5 widget card.

---

## 4. Match Card

### Trạng thái SCHEDULED / OPEN

```text
┌─────────────────────────────────────────┐
│ Group A · Matchday 1                    │
│                                         │
│    Brazil      vs      Japan            │
│    🇧🇷                    🇯🇵             │
│                                         │
│  Kickoff: 22:00, 12/06/2026             │
│  Prediction closes: 21:55               │
│                                         │
│  [OPEN]              [Predict →]        │
└─────────────────────────────────────────┘
```

### Sau khi user đã predict

```text
│  Your pick: 2 - 1    ✏ Edit            │
│  [OPEN]                                 │
```

### Trạng thái LOCKED

```text
│  [LOCKED]        [View Predictions →]  │
│  Your pick: 2 - 1                       │
```

### Trạng thái LIVE

```text
│  🔴 LIVE  ·  67'                        │
│    Brazil  1  -  0  Japan               │
│  Your pick: 2 - 1                       │
```

### Trạng thái FINISHED / SCORED

```text
│  Final: Brazil  2  -  1  Japan          │
│  [SCORED]                               │
│  Your pick: 2 - 1  →  +3 pts ✅        │
```

### Trạng thái VOID

```text
│  [VOID] · Match cancelled               │
│  Your pick: void                        │
```

---

## 5. Prediction Input

Prediction input dùng stepper hoặc number input:

```text
┌──────────────────────────────────────────┐
│ Brazil       [ − ] [ 2 ] [ + ]           │
│ Japan        [ − ] [ 1 ] [ + ]           │
│                                          │
│            [ Save Prediction ]           │
└──────────────────────────────────────────┘
```

Constraints:
- Không cho số âm.
- `0 <= score <= 20`.
- Disabled khi `now >= lock_at` hoặc match LIVE/FINISHED/SCORED/VOID.

---

## 6. Prediction Visibility

### Trước lock (SCHEDULED / OPEN)

Không hiện tỉ số người khác. Chỉ hiện:

```text
Huy     ✓ Submitted
Minh    – Not submitted
An      ✓ Submitted
```

### Sau lock (LOCKED / LIVE / FINISHED / SCORED)

Hiện tỉ số và điểm:

```text
Huy     2-1    3 pts  ✅
Minh    1-0    1 pts  ✓
An      1-1    0 pts  ✗
```

Nếu match chưa SCORED (đang LOCKED/LIVE), hiện tỉ số nhưng điểm chưa cập nhật — hiện dấu `—` hoặc `pending`.

---

## 7. Standings & Knockout UX

Standings screen gồm 2 mode:

- `Groups`: bảng xếp hạng vòng bảng World Cup.
- `Knockout`: nhánh đấu Round of 32 → Final sau khi có dữ liệu knockout.

### Tabs

```text
[ Groups ] [ Knockout ]
[ Group A ] [ Group B ] [ Group C ] ... [ Group L ]
```

Trên mobile dùng dropdown hoặc horizontal scroll tabs.

### Bảng standings mỗi nhóm

```text
  #   Team          MP  W  D  L  GF  GA  GD  Pts
  1   Brazil         3  3  0  0   7   2  +5   9
  2   Japan          3  1  1  1   4   4   0   4
  3   Mexico         3  1  0  2   3   5  -2   3
  4   Senegal        3  0  1  2   1   4  -3   1
```

- Highlight top 2 (qualified) với màu xanh nhạt.
- Highlight team đang ở biên (3rd) với màu vàng nếu có rule playoff.
- Highlighted row khi đang LIVE.

### Live indicator

Khi trận Group Stage đang diễn ra, cột GF/GA có thể refresh và badge LIVE hiện ở tab.

### Knockout bracket

- Hiển thị nhánh đấu theo round: Round of 32, Round of 16, Quarter-final, Semi-final, Third-place, Final.
- Mỗi node hiển thị teams, kickoff, score/status, và nút Predict/View nếu admin đã mở trận đó trong league.
- Trận chưa xác định đội hiển thị placeholder như `Winner Group A` hoặc `TBD`.
- Mobile dùng list theo round thay vì bracket ngang quá rộng.

---

## 8. Leaderboard UX (Office)

Bảng xếp hạng nội bộ công ty — không phải WC group standings.

### Cột

```text
 #   Nickname   Pts   Exact  Correct  Wrong  Played
 1   Minh        24     6       6       3      15
 2   Huy         21     5       6       4      15
```

### Highlight

- Top 3 dùng badge vàng/bạc/đồng (🥇🥈🥉 hoặc màu).
- Row của user hiện tại highlight nhẹ (background khác màu).
- Nếu đồng hạng, hiện dấu `=` hoặc highlight bằng chú thích.

### Tie-break tooltip

Khi hover/tap vào rank, hiện tooltip giải thích tie-break:

```text
Tied on points. Ranked by exact score count (5 vs 4).
```

### Secondary stats

Leaderboard nên có các cards nhỏ phía trên hoặc bên phải:

- Most exact scores.
- Most correct results.
- Longest exact-score streak.
- Best knockout predictor.
- Most predictions submitted.
- Missed predictions count.

---

## 9. Prize Pool / Donations UX

```text
┌──────────────────────────────────────────────┐
│  💰 Total Prize Pool: 4,500,000 đ             │
│                                              │
│  🥇 1st Place   60%   →  2,700,000 đ         │
│  🥈 2nd Place   30%   →  1,350,000 đ         │
│  🥉 3rd Place   10%   →    450,000 đ         │
├──────────────────────────────────────────────┤
│  Player Contributions  4,000,000 đ (20/20) ✓ │
│  Sponsors              500,000 đ              │
└──────────────────────────────────────────────┘
```

- Thanh tiến độ cho "đã thu / tổng" đóng góp.
- Danh sách participants với paid/pending/waived.
- Danh sách sponsors kèm ghi chú trong cùng màn.
- Chỉ hiện PAID trong tổng prize pool.

Admin cũng dùng cùng mental model này: một màn `Donations` để quản lý cả player contributions và sponsors, không tách thành 2 screen riêng.

---

## 10. My Predictions / Personal Records UX

### Stats summary card (đầu trang)

```text
Total Points: 21   Rank: #2 / 20 people
Exact:  5  (3 pts each)
Correct: 6  (1 pt each)
Wrong:   4
Played: 15 / 64 matches
```

### Lịch sử predictions (dạng list/table)

Mỗi dòng:

```text
Brazil vs Japan    2 - 1   [EXACT] +3pts
France vs Spain    1 - 1   [CORRECT] +1pt
Argentina vs USA   3 - 1   [WRONG] 0pt
```

- Filter: All / Exact / Correct / Wrong / Pending.
- Sort: theo thời gian hoặc theo điểm.

---

## 11. Status Labels

| Status    | Label      | Badge color          |
|-----------|------------|----------------------|
| SCHEDULED | Upcoming   | Gray                 |
| OPEN      | Open       | Green                |
| LOCKED    | Locked     | Orange               |
| LIVE      | 🔴 Live    | Red (pulsing dot)    |
| FINISHED  | Finished   | Blue                 |
| SCORED    | Scored     | Blue-filled          |
| VOID      | Void       | Red muted / strikethrough |

---

## 12. Admin UX Principles

### Tốc độ thao tác

- Form nhập kết quả phải tối giản: chỉ 2 field score + button Save.
- Không yêu cầu reload trang sau khi lưu.
- Inline edit trong table nếu có thể.

### Feedback rõ ràng

- Sau khi nhập kết quả: hiện "Result saved. Scoring triggered."
- Sau khi tạo user: hiện access code một lần duy nhất, có nút Copy.
- Sau khi mark paid: cell đổi màu ngay.

### Confirmation trước action nguy hiểm

- Void match: confirm modal.
- Recalculate score: confirm "This will overwrite existing points".
- Reset access code: confirm "Old code will stop working".
- Disable player: confirm.

### Scoping rõ ràng

- Admin chỉ thấy người chơi và dữ liệu của company mình.
- Header admin luôn hiện tên company đang quản lý.
- Super admin có thêm company switcher và màn Companies.

### Mở trận dự đoán

- Fixture sync từ API mặc định chỉ tạo match ở trạng thái chưa mở prediction cho từng league.
- Admin chọn từng trận để mở dự đoán trong company/league của mình.
- Khi mở trận, admin bắt buộc set hoặc xác nhận `lockAt` riêng cho trận đó.
- Table admin matches cần filter: All fixtures / Open for prediction / Not opened / Locked / Needs result.

### Export

- Admin có màn `Exports` hoặc nút export trong từng màn dữ liệu.
- Export nên hỗ trợ CSV trước, XLSX sau nếu cần.
- Dữ liệu export mặc định scoped theo company/league của admin.
- Super admin có thể export cross-company khi có quyền rõ ràng.

---

## 13. Empty States

| Màn hình         | Empty state text                                      |
|------------------|-------------------------------------------------------|
| Matches/Upcoming | No upcoming matches yet.                              |
| Matches/Live     | No matches live right now.                            |
| Leaderboard      | Leaderboard appears after the first scored match.     |
| My Predictions   | You haven't made any predictions yet.                 |
| Prize Pool       | No contributions recorded yet.                        |
| Standings        | Standings and bracket will update after matches are scored. |
| Admin Audit Logs | No actions recorded yet.                              |

---

## 14. Error States

| Lỗi                            | Message                                                         |
|--------------------------------|-----------------------------------------------------------------|
| Prediction locked              | This match is locked. You can view predictions now.             |
| Invalid score                  | Score must be between 0 and 20.                                 |
| Match not found                | Match not found.                                                |
| Session expired                | Your session has expired. Please log in again.                  |
| Access code wrong / disabled   | Invalid access code.                                            |
| Company disabled               | Invalid access code.                                            |

Thông điệp lỗi không nên tiết lộ lý do cụ thể tại sao code không hợp lệ (tránh enumeration attack).

---

## 15. Responsive Layout

Ứng dụng là một Web App Responsive, thích ứng kích thước màn hình:

### Mobile (< 768px)

- **Bottom Navigation** thay cho sidebar.
- Layout một cột.
- Match cards, leaderboard rows hiển thị dạng Card thay vì Table.
- Group Standings dùng horizontal-scroll table.

### Tablet / Desktop (≥ 768px)

- **Sidebar Navigation** cố định bên trái.
- Grid 2 cột ở trang chính:
  - Cột trái (rộng): Match cards / Leaderboard / Standings.
  - Cột phải (sidebar): Stats, Prize Pool mini, next match countdown.
- Leaderboard và Admin panel hiển thị dạng Table đầy đủ.

---

## 16. Visual Direction

Ưu tiên:
- Background sáng (`#F8F7F2`), card trắng.
- Typography đủ lớn để đọc nhanh.
- CTA rõ: `Predict`, `Save`, `View`.
- Status dùng badge màu nhẹ + text label.
- Form admin layout một cột đơn giản để thao tác nhanh.

Tránh:
- Dark theme làm mặc định.
- Gradient nặng, hiệu ứng casino.
- Màu đỏ/đen dominant.
- Yêu cầu user nhập email/password/thông tin cá nhân ngoài nickname.

---

## 17. Live Match Experience

Khi có trận LIVE:

- Badge "🔴 LIVE" hiện trên tab Matches trong navigation (với số đếm).
- Match card LIVE nổi bật với viền đỏ nhẹ hoặc background khác.
- Score live hiện nếu có từ API (update polling hoặc cron 1-5 phút).
- Predictions của trận đó đã visible (đã lock trước kickoff).
- Không có action predict khi LIVE.

---

## 18. Motion & Micro-interactions

Motion nhẹ, không gây chú ý quá mức:

- Button hover: scale nhẹ hoặc shadow thêm.
- Match card hover: lift shadow.
- Confetti nhỏ khi user đúng tỉ số (EXACT_SCORE).
- Countdown pulse khi còn < 10 phút trước lock.
- Toast notification khi save thành công.

---

## 19. Accessibility

- Contrast đủ rõ (WCAG AA tối thiểu).
- Không chỉ dùng màu để thể hiện trạng thái — kèm text/icon.
- Input có label rõ ràng.
- Button disabled có `title` hoặc tooltip giải thích.
- Table có header rõ với `aria-label`.
- Score stepper có accessible label: "Home team score" / "Away team score".
