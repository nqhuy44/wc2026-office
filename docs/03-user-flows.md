# User Flows

## 1. Player Login Flow

```text
Open website
  -> Enter access code
  -> Validate code
  -> Resolve participant and company
  -> Create session
  -> Redirect to Dashboard
```

### Trạng thái lỗi

- Code không tồn tại.
- Code bị disable.
- Player chưa active.
- Company bị disable.
- Session hết hạn.

## 2. Prediction Flow

```text
Open Match Detail
  -> Check league match is open for prediction
  -> Check current time < league_match.lock_at
  -> Enter score
  -> Submit
  -> Backend validates league scope and lock time
  -> Save prediction
  -> Show confirmation
```

### Người chơi sửa prediction

```text
Open own prediction
  -> Current time < league_match.lock_at
  -> Edit score
  -> Submit
  -> Update prediction
  -> Save updated_at
```

## 3. Lock Prediction Flow

Prediction được khóa bằng logic thời gian.

```text
For each league match:
  if prediction enabled and now >= lock_at:
    league match status becomes LOCKED
```

Có thể xử lý bằng:

- Runtime check mỗi lần gọi API.
- Cron job cập nhật trạng thái.
- Kết hợp cả hai.

Khuyến nghị: luôn check ở API khi submit prediction.

## 4. View Predictions Flow

### Trước lock

Người chơi chỉ thấy:

```text
Huy: Đã dự đoán
Minh: Chưa dự đoán
An: Đã dự đoán
```

Không hiển thị tỉ số dự đoán.

### Sau lock

Người chơi thấy toàn bộ prediction:

```text
Huy: 2-1
Minh: 1-0
An: 1-1
```

### Sau khi có kết quả

Hiển thị thêm điểm:

```text
Huy: 2-1 -> 3 điểm
Minh: 1-0 -> 1 điểm
An: 1-1 -> 0 điểm
```

## 5. Admin Create Participants Flow

```text
Open Admin Participants
  -> Add nickname
  -> Assign company
  -> Generate access code
  -> Save participant
  -> Share code manually with player
```

Admin có thể:

- Reset code.
- Disable player.
- Mark contribution paid.

MVP không có display name/avatar/email. Nickname là tên hiển thị duy nhất.

Role rule:

- `ADMIN` chỉ tạo/quản lý participants trong company/league của mình.
- `SUPER_ADMIN` tạo company/league và tạo admin đầu tiên cho company/league đó.

## 6. Admin Import Matches Flow

MVP có thể import bằng CSV.

```text
Prepare CSV
  -> Upload CSV
  -> Preview matches
  -> Validate teams/time/stage
  -> Confirm import
  -> Create teams and global match fixtures
  -> Fixtures are not automatically open for prediction
```

CSV columns đề xuất:

```csv
stage,group_name,home_team,away_team,kickoff_at,venue
Group Stage,A,Brazil,Japan,2026-06-12T22:00:00+07:00,Stadium Name
```

## 7. Admin Open Prediction Flow

Admin mở dự đoán theo từng company/league.

```text
Open Admin Matches
  -> Review imported/API fixtures
  -> Select fixture
  -> Click Open Prediction
  -> Confirm lock_at for this league match
  -> Create/update LeagueMatch
  -> Match appears in player Matches as OPEN
```

Notes:

- API có thể kéo rất nhiều trận, nhưng default không mở dự đoán.
- Một company có thể mở trận khác company khác.
- `lock_at` là setting của `LeagueMatch`, không phải global fixture.

## 8. Admin Enter Result Flow

```text
Open Admin Match Detail
  -> Enter final score
  -> Set match status FINISHED
  -> Trigger scoring for opened league matches
  -> Update leaderboard
```

## 9. Scoring Flow

```text
Match finished
  -> Load all LeagueMatch rows for this match
  -> Load predictions for opened league matches
  -> Compare prediction with actual score
  -> Assign points
  -> Store result_type
  -> Recalculate leaderboard
  -> Mark match as SCORED
```

## 10. Leaderboard Flow

Leaderboard có thể tính realtime từ predictions hoặc lưu snapshot.

MVP khuyến nghị tính bằng query aggregate từ predictions đã scored.

```text
GET /leaderboard
  -> Filter participants by current company
  -> Sum points by participant through league_match
  -> Count exact_score
  -> Count correct_result
  -> Count predictions
  -> Calculate secondary stats
  -> Apply tie-break
  -> Return sorted list
```

Secondary stats:

- Most exact scores.
- Most correct results.
- Longest exact-score streak.
- Most submitted predictions.
- Missed prediction count.

## 11. Donation Flow

```text
Admin marks participant as paid
  -> Contribution status = PAID
  -> Update total contribution
  -> Update prize pool display
```

```text
Admin adds sponsor
  -> Sponsor amount or reward description
  -> Show on Prize Pool page
```

Contribution and sponsor management live in one Admin Donations screen.

## 12. Export Flow

```text
Open Admin Exports
  -> Choose data type
  -> Choose format CSV/XLSX
  -> Apply filters if needed
  -> Generate file
  -> Audit export action
```

Export types:

- Match results.
- Prediction results.
- Leaderboard.
- Prediction history.
- Donations.
- Audit logs.
