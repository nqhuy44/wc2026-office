# Screens

## 1. Login Screen

### Mục tiêu

Cho người chơi vào app bằng access code do admin/BTC cấp. Không cần email, password, hay profile.

### Layout

```text
┌─────────────────────────────────────────┐
│                                         │
│            ⚽ Fan League                │
│       World Cup 2026 · Fan League       │
│                                         │
│         Access Code                     │
│        [ HUY-7K29        ]              │
│                                         │
│          [ Join League ]                │
│                                         │
│             Rules & Help                │
└─────────────────────────────────────────┘
```

### Components

- Logo/app name.
- Input: access code (text, case-insensitive, trim whitespace).
- Button: Join League (primary).
- Link: Rules & Help.

### Validation

- Required.
- Nếu code sai, bị disable, hoặc company disabled → hiện chung: "Invalid access code."
- Không tiết lộ lý do cụ thể để tránh đoán code.

### Edge cases

- Session còn hạn → redirect thẳng vào Dashboard mà không cần nhập lại.

---

## 2. Dashboard Screen

### Mục tiêu

Tổng quan nhanh, trong đó prize pool và bảng xếp hạng là điểm nhấn chính. Trận sắp tới và live match vẫn có nhưng không lấn át phần league status.

### Layout (Desktop: 2 cột; Mobile: 1 cột)

```text
┌──────────────────────┬──────────────────────┐
│  👤 Huy · Acme VN   │                      │
│  Rank: #2 · 21 pts  │   Prize Pool          │
│                      │   💰 4,500,000 đ     │
│  ─────────────────  │                      │
│  🔴 LIVE NOW        │   🥇 2,700,000 đ     │
│  Brazil vs Japan     │   🥈 1,350,000 đ     │
│  67'  1 - 0          │   🥉   450,000 đ     │
│                      │                      │
│  ─────────────────  │   ──────────────────  │
│  Next Match          │   Top 3 Leaderboard  │
│  France vs Spain     │   1 Minh  24 pts     │
│  22:00 · 2h15m       │   2 Huy   21 pts     │
│  [Predict →]         │   3 An    18 pts     │
│                      │                      │
│  Recent Results      │                      │
│  Germany vs USA      │                      │
│  2-1 (Exact +3) ✅   │                      │
└──────────────────────┴──────────────────────┘
```

### Components

- **Prize pool card**: tổng quỹ, paid progress, split top 3.
- **Leaderboard highlight**: rank của mình, top 3, khoảng cách điểm với người trên/dưới.
- **User summary**: nickname, company/league, rank, total points.
- **Next match card**: next OPEN match, nút Predict.
- **Live card** (nếu có trận LIVE): team, current score, thời gian.
- **Recent results**: 3-5 trận gần nhất đã scored với điểm của mình.

### Data

- Current participant (nickname, rank, points, company/league).
- Live matches.
- Next open match.
- Prize pool summary.
- Recent scored predictions.
- Leaderboard top 3.

---

## 3. Matches Screen

### Mục tiêu

Xem toàn bộ lịch trận World Cup, lọc theo trạng thái.

### Tabs

```text
[ 🔴 Live (2) ] [ Upcoming ] [ Past ] [ All ]
```

- Live tab hiện badge số trận đang diễn ra; ẩn tab nếu không có.
- Upcoming: SCHEDULED + OPEN.
- Past: FINISHED + SCORED + VOID.
- All: tất cả.

### Match Card Layout

```text
┌──────────────────────────────────────────┐
│ Group A · Matchday 1           [OPEN]    │
│                                          │
│   🇧🇷 Brazil      2  -  1      Japan 🇯🇵  │
│                                          │
│   Kickoff: 22:00 · 12/06/2026            │
│   Closes:  21:55                         │
│                                          │
│   Your pick: 2 - 1   ✏ Edit   [Predict] │
└──────────────────────────────────────────┘
```

Variations:
- **No prediction yet**: hiện "No pick yet" + nút Predict.
- **Locked / Live**: ẩn nút Predict, hiện "View Predictions".
- **Scored**: hiện "Your pick: 2-1 → +3 pts ✅" thay nút predict.

### Grouping

- Upcoming: nhóm theo ngày, mỗi ngày một section header.
- Past: nhóm theo ngày, mới nhất trên đầu.
- Live: không nhóm, hiện tất cả lên đầu.

---

## 4. Match Detail Screen

### Mục tiêu

Cho người chơi predict, xem prediction người khác sau lock, xem kết quả.

### Layout

```text
┌──────────────────────────────────────────┐
│ ← Back          Group A · Matchday 1     │
├──────────────────────────────────────────┤
│                                          │
│   🇧🇷 Brazil         vs         Japan 🇯🇵  │
│   Kickoff: 22:00 · 12/06/2026            │
│   Venue: MetLife Stadium, New York       │
│   [OPEN]   Closes in: 01:24:37 ⏱        │
│                                          │
├──────────────────────────────────────────┤
│  Your Prediction                         │
│                                          │
│  Brazil    [ − ] [ 2 ] [ + ]            │
│  Japan     [ − ] [ 1 ] [ + ]            │
│                                          │
│           [ Save Prediction ]            │
├──────────────────────────────────────────┤
│  Participant Predictions (15 people)     │
│                                          │
│  Huy        ✓ Submitted                  │
│  Minh       ✓ Submitted                  │
│  An         – Not submitted              │
│                                          │
│  (Scores hidden until match is locked)   │
├──────────────────────────────────────────┤
│  Final Result (after scored)             │
│  Brazil  2 - 1  Japan                    │
│  Winner: Brazil                          │
└──────────────────────────────────────────┘
```

### Sections

1. **Match header**: teams, flags, kickoff, venue, status, countdown.
2. **Prediction form** (chỉ hiện khi OPEN và chưa lock):
   - Score stepper cho home và away.
   - Nút Save Prediction.
   - Nếu đã có prediction: hiện score hiện tại + nút Edit.
3. **Lock countdown**: pulse khi < 10 phút.
4. **Prediction summary**:
   - Trước lock: `Submitted / Not submitted` (không hiện score).
   - Sau lock (LOCKED/LIVE): hiện tỉ số + `pending` ở cột points.
   - Sau scored: hiện tỉ số + điểm + icon kết quả.
5. **Final result**: hiện sau khi FINISHED/SCORED.

### States

| Match Status | Form | Scores visible | Points visible |
|---|---|---|---|
| SCHEDULED/OPEN | Editable | No | No |
| LOCKED | Disabled | Yes | No |
| LIVE | Disabled | Yes | No |
| FINISHED | Disabled | Yes | No |
| SCORED | Disabled | Yes | Yes |
| VOID | Disabled | Yes | — |

---

## 5. Standings & Bracket Screen

### Mục tiêu

Xem bảng xếp hạng vòng bảng World Cup và nhánh đấu các vòng knockout sau này.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│  World Cup 2026 · Standings                          │
│                                                      │
│  [ Groups ] [ Knockout Bracket ]                     │
│                                                      │
│  [A] [B] [C] [D] [E] [F] [G] [H] [I] [J] [K] [L]  │
│                                                      │
│  Group A                                             │
│  ─────────────────────────────────────────────────  │
│   #   Team        MP   W   D   L   GF  GA  GD  Pts  │
│   1   Brazil       3   3   0   0    7   2  +5    9   │
│   2   Japan        3   1   1   1    4   4   0    4   │
│   3   Mexico       3   1   0   2    3   5  -2    3   │
│   4   Senegal      3   0   1   2    1   4  -3    1   │
│  ─────────────────────────────────────────────────  │
│  ✅ Brazil, Japan advance to Round of 32             │
└──────────────────────────────────────────────────────┘
```

### Groups mode

- WC 2026 có 12 bảng (A–L), mỗi bảng 4 đội.
- Mobile: horizontal scroll hoặc dropdown chọn nhóm.
- Desktop: tab bar ngang (A–L).

### Highlight rows

- 🟢 Top 2 mỗi bảng: background xanh nhạt (qualified).
- 🟡 3rd place (nếu có rule vòng thứ ba, tùy FIFA): background vàng nhạt.
- 🔴 Row của trận đang LIVE: pulse nhẹ hoặc icon live.

### Cột

| Cột | Ý nghĩa |
|-----|---------|
| MP  | Matches Played |
| W   | Wins |
| D   | Draws |
| L   | Losses |
| GF  | Goals For |
| GA  | Goals Against |
| GD  | Goal Difference |
| Pts | Points |

### Data source

Tính từ Match results của các trận GROUP stage đã SCORED, group by `groupName`.

### Knockout mode

Sau vòng bảng, screen này có thêm nhánh đấu:

```text
Round of 32     Round of 16      Quarter      Semi       Final
Brazil ─┐
        ├─ Brazil ─┐
Japan  ─┘          ├─ Brazil ─┐
                   │          ├─ ...
TBD    ─┐          │
        ├─ Spain  ─┘
Spain  ─┘
```

Yêu cầu UX:

- Desktop: bracket ngang theo round.
- Mobile: list theo round để dễ đọc.
- Match chưa xác định đội hiển thị `TBD`, `Winner Group A`, `Runner-up Group B`.
- Mỗi knockout match node hiển thị kickoff, status, final score nếu có.
- Nếu admin đã mở prediction cho league hiện tại, hiện action `Predict` hoặc `View Predictions`.

### Note WC 2026

WC 2026 có 48 đội, vẫn dùng 12 bảng 4 đội. Top 2 mỗi bảng (24 đội) + 8 đội hạng 3 tốt nhất = 32 đội vào Round of 32. Rules cụ thể theo FIFA chính thức.

---

## 6. Leaderboard Screen (Office)

### Mục tiêu

Bảng xếp hạng nội bộ công ty — ai đoán tốt nhất trong team.

### Layout

```text
┌────────────────────────────────────────────────────────┐
│  Office Leaderboard · Acme VN                          │
│                                                        │
│  (15 scored matches of 64 total)                       │
│                                                        │
│   #     Nickname    Pts    Exact  Correct  Wrong  Played│
│  🥇 1   Minh         24      6       6       3      15  │
│  🥈 2   Huy          21      5       6       4      15  │
│  🥉 3   An           18      4       6       5      15  │
│       4  Thu          16      4       4       7      15  │
│       5  Phuong       14      3       5       7      15  │
│  ──   (You are here: #2)                               │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Features

- Secondary stat cards:
  - Most exact scores.
  - Most correct results.
  - Best average points per predicted match.
  - Longest exact-score streak.
  - Most predictions submitted.
  - Missed predictions count.
- Highlight row của user hiện tại (background khác).
- Badge 🥇🥈🥉 cho top 3.
- Tie-break tooltip khi hover rank: "Tied on points. Ranked by exact score (6 vs 5)."
- Thống kê nhỏ: "X scored matches / 64 total".
- Future filters: by stage, by matchday, by team.

### Cột đầy đủ

| Cột | Ý nghĩa |
|-----|---------|
| # | Rank |
| Nickname | Tên hiển thị |
| Pts | Tổng điểm |
| Exact | Số lần đúng tỉ số chính xác (3 pts) |
| Correct | Số lần đúng kết quả W/D/L (1 pt) |
| Wrong | Số lần sai |
| Played | Số trận đã dự đoán |

---

## 7. My Predictions Screen (Personal Records)

### Mục tiêu

Xem lịch sử và thống kê cá nhân của bản thân.

### Layout

```text
┌───────────────────────────────────────────────┐
│  My Predictions · Huy                         │
│                                               │
│  ┌──────┬──────┬─────────┬────────┬────────┐ │
│  │  21  │  5   │    6    │   4    │  15    │ │
│  │ pts  │exact │ correct │ wrong  │ played │ │
│  └──────┴──────┴─────────┴────────┴────────┘ │
│  Rank: #2 / 20                                │
│                                               │
│  Filter: [ All ] [Exact] [Correct] [Wrong]    │
│                                               │
│  Brazil vs Japan      2-1   EXACT    +3 pts ✅│
│  12/06/2026                                   │
│                                               │
│  France vs Spain      1-1   CORRECT  +1 pt ✓ │
│  14/06/2026                                   │
│                                               │
│  Argentina vs USA     3-1   WRONG    0 pts ✗ │
│  15/06/2026                                   │
│                                               │
│  Germany vs Korea     1-0   PENDING  —        │
│  16/06/2026  (not scored yet)                 │
└───────────────────────────────────────────────┘
```

### Stats summary (top)

- Total points.
- Exact score count.
- Correct result count.
- Wrong count.
- Played count.
- Current rank.

### Prediction list

- Mỗi row: match (home vs away), prediction score, result type badge, points.
- Sort: theo ngày mới nhất.
- Filter tabs: All / Exact / Correct / Wrong / Pending.
- Icon kết quả: ✅ Exact / ✓ Correct / ✗ Wrong / — Pending.

### Highlight

- EXACT rows dùng green background nhạt.
- CORRECT rows dùng blue nhạt.
- WRONG rows bình thường.

---

## 8. Prize Pool & Donations Screen

### Mục tiêu

Minh bạch toàn bộ quỹ giải thưởng: ai đã đóng, sponsor là ai, split bao nhiêu.

### Layout

```text
┌────────────────────────────────────────────────────┐
│  Prize Pool · Acme VN                              │
│                                                    │
│  💰 Total Pool: 4,500,000 đ                        │
│  ████████████████████░░░░ 20/20 paid               │
│                                                    │
│  🥇 1st Place   60%   →  2,700,000 đ              │
│  🥈 2nd Place   30%   →  1,350,000 đ              │
│  🥉 3rd Place   10%   →    450,000 đ              │
├────────────────────────────────────────────────────┤
│  Player Contributions (20 people)                  │
│                                                    │
│  Nickname     Amount        Status       Paid At   │
│  Huy          200,000 đ    ✅ Paid      12/05/2026 │
│  Minh         200,000 đ    ✅ Paid      11/05/2026 │
│  An           200,000 đ    ⏳ Pending   —          │
│  Thu          200,000 đ    ✅ Waived    — (note)   │
│                                                    │
├────────────────────────────────────────────────────┤
│  Sponsors                                          │
│                                                    │
│  Team DevOps   500,000 đ   Bonus for exact champ  │
│  HR Team       —           Voucher 200k cho top 3  │
└────────────────────────────────────────────────────┘
```

### Sections

1. **Total prize pool**: chỉ tính PAID contributions + sponsors có amount.
2. **Progress bar**: X/Y đã đóng.
3. **Prize split**: dạng card 3 hạng với số tiền tương ứng.
4. **Player contributions table**: nickname, amount, status badge, paid at.
5. **Sponsors section**: tên sponsor, amount (nếu có), mô tả giải thưởng, ghi chú.

### Contribution status badges

| Status | Badge |
|--------|-------|
| PAID | ✅ Paid (green) |
| PENDING | ⏳ Pending (yellow) |
| WAIVED | 🔵 Waived (blue) |
| REFUNDED | 🔴 Refunded (red) |

---

## 9. Rules Screen

Hiển thị rule đơn giản, dạng prose/FAQ:

- Cách dự đoán (score input).
- Scoring: 3/1/0 points.
- Lock time: 5 phút trước kickoff.
- Tie-break order.
- Prize split (%).
- Trận hoãn/hủy.
- FAQ ngắn.

---

## 10. Admin Dashboard

### Mục tiêu

Tổng quan nhanh cho admin về trạng thái giải.

### Widgets

```text
┌──────────────────────────────────────────────────────┐
│  Admin Dashboard · Acme VN                           │
│                                                      │
│  ┌──────────┬────────────┬──────────┬─────────────┐  │
│  │ Players  │  Paid      │ Pending  │ Prize Pool  │  │
│  │    20    │    18      │    2     │ 4,500,000đ  │  │
│  └──────────┴────────────┴──────────┴─────────────┘  │
│                                                      │
│  ┌──────────────────────┬───────────────────────┐    │
│  │  Matches need result │  Matches not scored   │    │
│  │         3            │          2            │    │
│  └──────────────────────┴───────────────────────┘    │
│                                                      │
│  Recent Audit Logs                                   │
│  Huy (admin) · Entered result · Brazil 2-1 Japan    │
│  Huy (admin) · Marked paid · Minh                   │
│  Huy (admin) · Reset code · An                      │
└──────────────────────────────────────────────────────┘
```

### Widgets

- Total players / Paid / Pending.
- Total prize pool.
- Matches needing result entry.
- Matches finished but not scored yet.
- Recent audit log (5 entries).

---

## 11. Admin Players Screen

### Mục tiêu

Tạo, quản lý người chơi, gán access code, disable, mark paid.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│  Players · Acme VN                  [+ Add Player]  │
│                                                      │
│  Search: [___________]                               │
│                                                      │
│  Nickname   Role    Status    Contribution  Actions  │
│  Huy        Player  Active    ✅ Paid       ⋮        │
│  Minh       Admin   Active    ✅ Paid       ⋮        │
│  An         Player  Active    ⏳ Pending    ⋮        │
│  Thu        Player  Disabled  ✅ Waived     ⋮        │
└──────────────────────────────────────────────────────┘
```

### Actions per row (dropdown ⋮)

- Copy Access Code (nếu vừa tạo/reset).
- Reset Access Code → confirm → hiện code mới 1 lần.
- Mark Paid.
- Edit Nickname.
- Toggle Admin/Player role.
- Disable Player.

### Add Player form (modal hoặc drawer)

```text
Nickname *          [_________________]
Role                [Player ▼]

[ Generate & Save ]
```

- Sau khi save: hiện access code 1 lần duy nhất với nút Copy.
- Code format: `NICKNAME-XXXX` (ví dụ: `HUY-7K29`).

### Reset Code modal

```text
⚠️ Reset access code for Huy?
Old code will stop working immediately.

[ Cancel ]  [ Reset & Copy New Code ]
```

---

## 12. Admin Companies Screen

### Mục tiêu

Tạo và quản lý công ty/league. Screen này chỉ dành cho `SUPER_ADMIN`; admin thường không thấy hoặc không có quyền thao tác.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│  Companies                              [+ New]      │
│                                                      │
│  Name          Slug        Players   Status  Actions │
│  Acme VN       acme-vn       20      Active    ⋮     │
│  Tech Corp     tech-corp     15      Active    ⋮     │
│  Startup X     startup-x      8      Disabled  ⋮     │
└──────────────────────────────────────────────────────┘
```

### Create/Edit Company form

```text
Company Name *      [_________________]
Slug *              [_________________]  (auto-generated)
Status              [Active ▼]

[ Save ]
```

### Actions per company

- Edit name/status.
- View players.
- Disable company.
- Create initial league admin.
- Reset league admin code.

---

## 13. Admin Donations Screen

### Mục tiêu

Gộp contributions và sponsors vào cùng một màn để admin quản lý toàn bộ nguồn tạo prize pool. Admin mark paid sau khi nhận tiền thực tế, đồng thời ghi nhận sponsor tiền mặt/hiện vật/giải phụ.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│  Donations · Acme VN     [+ Add Contribution] [+ Add Sponsor] │
│                                                      │
│  Summary: 18 paid / 20 total · 3,600,000 / 4,000,000│
│  Sponsors: 500,000 đ + 2 reward items               │
│                                                      │
│  [ Player Contributions ] [ Sponsors ]              │
│                                                      │
│  Nickname  Amount        Status     Paid At   Note   │
│  Huy       200,000 đ    ✅ Paid    12/05     —      │
│  Minh      200,000 đ    ✅ Paid    11/05     —      │
│  An        200,000 đ    ⏳ Pending  —        —      │
│  Thu       200,000 đ    🔵 Waived   —       (note)  │
│  [Mark Paid] [Edit] per row                         │
└──────────────────────────────────────────────────────┘
```

### Actions per row

- **Mark Paid**: đổi status → PAID, tự fill paid_at = now.
- **Edit**: sửa amount, status, note, paid_at.
- **Waive**: đổi sang WAIVED + bắt buộc nhập note.
- **Refund**: đổi sang REFUNDED.

### Add Contribution Record form

```text
Player *        [Select player ▼]
Amount *        [200,000 đ]
Status *        [Pending ▼]
Paid At         [date picker]
Note            [_________________]

[ Save ]
```

### Bulk action

- Select all pending → Mark all paid (confirm modal).

### Add/Edit Sponsor form

```text
Sponsor Name *      [_________________]
Amount              [_________________]  (optional)
Currency            [VND ▼]
Reward Description  [_________________]  (optional)
Note                [_________________]  (optional)

[ Save ]
```

---

## 14. Admin Matches Screen

### Mục tiêu

Xem/import fixture World Cup từ CSV/API, chọn trận nào được mở dự đoán cho league hiện tại, set lock time riêng cho từng trận, sửa thời gian và void match khi cần.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│  Matches       [+ Create] [↑ Import CSV] [Sync API] │
│                                                      │
│  Filter: [ All Fixtures ▼ ] [ Stage ▼ ] [ Open ▼ ]  │
│                                                      │
│  Home      Away    Kickoff      Prediction    Lock   │
│  Brazil    Japan   12/06 22:00  Open          21:55  │
│  France    Spain   14/06 22:00  Not opened    —      │
│  Germany   USA     15/06 19:00  Locked        18:55  │
└──────────────────────────────────────────────────────┘
```

### Actions per row (⋮)

- Open prediction for league.
- Close/lock prediction manually.
- Edit league lock time.
- Edit fixture kickoff/venue/stage.
- Enter Result → opens Result form.
- Trigger Scoring (nếu result đã nhập nhưng chưa score).
- Recalculate Score (nếu cần).
- Void Match → confirm modal.

### Open Prediction modal

```text
Open prediction for Acme VN?

Match: France vs Spain
Kickoff: 14/06/2026 22:00
Lock At: [14/06/2026 21:55]  (default kickoff - 5 minutes)

[ Cancel ] [ Open Prediction ]
```

Notes:

- API có thể kéo về rất nhiều fixtures, nhưng default là `Not opened`.
- Chỉ các trận được admin mở mới xuất hiện là predict-able trong league.
- `lockAt` thuộc league/company, không thuộc fixture global.
- Một company có thể mở trận A, company khác không mở trận đó.

### Create Match form

```text
Stage *         [Group Stage ▼]
Group Name      [A ▼]
Home Team *     [Select team ▼]
Away Team *     [Select team ▼]
Kickoff *       [datetime picker]
Venue           [_________________]

[ Save ]
```

### Import CSV

```text
1. Download template CSV
2. Fill in matches
3. Upload CSV
4. Preview table (validate errors highlighted)
5. Confirm import
```

CSV columns:

```csv
stage,group_name,home_team,away_team,kickoff_at,venue
GROUP,A,Brazil,Japan,2026-06-12T22:00:00+07:00,MetLife Stadium
```

---

## 15. Admin Results Screen (Score Input)

### Mục tiêu

Nhập kết quả thủ công sau khi trận kết thúc, trigger scoring.

### Layout

```text
┌──────────────────────────────────────────────────────┐
│  Enter Results                                       │
│                                                      │
│  Filter: [ Finished - Not Scored ▼ ]                 │
│                                                      │
│  Brazil vs Japan  ·  Group A  ·  12/06/2026 22:00   │
│  ────────────────────────────────────────────────    │
│  Home Score (Brazil)  [ 2 ]                          │
│  Away Score (Japan)   [ 1 ]                          │
│  Result Source        [ Manual ▼ ]                   │
│                                                      │
│  [ Save Result ]   → [ Trigger Scoring ]             │
│                                                      │
│  ─────────────────────────────────────────           │
│  France vs Spain  ·  Group B  ·  14/06/2026 22:00   │
│  ────────────────────────────────────────────────    │
│  Home Score (France)  [ _ ]                          │
│  Away Score (Spain)   [ _ ]                          │
│  ...                                                 │
└──────────────────────────────────────────────────────┘
```

### Flow sau khi nhập

1. Admin nhập home score + away score.
2. Save Result → match status → FINISHED, winner auto-calculated.
3. Button "Trigger Scoring" sáng lên.
4. Admin click Trigger Scoring → system scores predictions của các `LeagueMatch` đã mở cho match đó.
5. Match status → SCORED; từng league match cập nhật scoring state.
6. Toast: "Scoring complete. 15 predictions scored."

### Recalculate Score

- Hiện nút "Recalculate" nếu match đã SCORED.
- Confirm: "This will overwrite existing prediction points. Continue?"
- Log vào audit.

### Trigger Scoring scope

- Match result là dữ liệu dùng chung.
- Scoring chỉ áp dụng cho company/league đã mở prediction cho match đó và có predictions.
- Leaderboard của từng company tự cập nhật sau đó.

---

## 16. Admin Settings Screen

### Mục tiêu

Cấu hình app theo công ty.

### Sections

```text
General
  App Name:               [Fan League]
  Timezone:               [Asia/Ho_Chi_Minh ▼]

Match Defaults
  Default Lock Minutes:   [5]   (minutes before kickoff)

Contributions
  Default Amount:         [200,000 đ]
  Currency:               [VND ▼]

Prize Split
  1st Place:  [60] %
  2nd Place:  [30] %
  3rd Place:  [10] %
  (Must sum to 100%)

Prediction Visibility
  Show scores after:  [Lock ▼] (Lock / Kickoff / Manual)

Result Source Note
  [Manual input by BTC]

[ Save Settings ]
```

### Validation

- Prize split percentages phải tổng = 100%.
- Lock minutes phải > 0.

---

## 17. Admin Exports Screen

### Mục tiêu

Cho admin export dữ liệu để tổng kết, đối soát, hoặc chia sẻ offline.

### Layout

```text
┌────────────────────────────────────────────────────────────┐
│  Exports · Acme VN                                        │
│                                                            │
│  Data type       Scope                Format      Action   │
│  Match results   Opened league matches CSV/XLSX   Export   │
│  Predictions     All predictions      CSV/XLSX   Export   │
│  Leaderboard     Current ranking      CSV/XLSX   Export   │
│  History         Prediction history   CSV/XLSX   Export   │
│  Donations       Contributions+sponsor CSV/XLSX  Export   │
│  Audit logs      Admin actions        CSV        Export   │
└────────────────────────────────────────────────────────────┘
```

### Export types

- Match results.
- Prediction results by match.
- Leaderboard.
- Personal prediction history.
- Donations: contributions + sponsors.
- Audit logs.

### Rules

- Admin thường export trong company/league của mình.
- Super admin có thể export theo company hoặc toàn hệ thống.
- Export nên ghi rõ generated at, timezone, company/league, filters.
- CSV là format MVP; XLSX có thể thêm sau.

---

## 18. Admin Audit Logs Screen

### Mục tiêu

Minh bạch mọi action của admin để tránh tranh cãi.

### Layout

```text
┌────────────────────────────────────────────────────────────┐
│  Audit Logs · Acme VN                                     │
│                                                            │
│  Filter: [All ▼] [Entity ▼] [Actor ▼]     [date range]   │
│                                                            │
│  When           Actor  Action              Entity         │
│  12/06 22:45    Huy    Enter result        Match #Brazil   │
│  12/06 22:50    Huy    Trigger scoring     Match #Brazil   │
│  11/06 10:00    Huy    Mark paid           Contribution    │
│  11/06 09:30    Huy    Reset access code   Participant/An  │
│                                                            │
│  (Click row to see before/after JSON detail)               │
└────────────────────────────────────────────────────────────┘
```

### Columns

- Timestamp.
- Actor (admin nickname).
- Action (verb).
- Entity type + ID/name.
- [Detail →] mở before/after JSON.
