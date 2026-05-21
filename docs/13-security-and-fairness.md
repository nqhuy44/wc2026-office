# Security and Fairness

## 1. Goals

- Không cần bảo mật enterprise-level.
- Nhưng cần đủ để tránh sửa dự đoán sau giờ khóa.
- Cần audit rõ ràng để tránh tranh cãi.
- Không lưu access code plain text.

## 2. Access Code Security

Access code nên:

- Random.
- Khó đoán.
- Mỗi participant một code.
- Có thể reset.
- Không lưu plain text.

Ví dụ format:

```text
HUY-7K29
MINH-Q82P
AN-X4Z1
```

Database lưu:

```text
accessCodeHash
```

Không lưu:

```text
accessCode
```

## 3. Session Security

Session cookie nên:

- `httpOnly`.
- `sameSite=lax`.
- `secure=true` trên production.
- Có expiration.

Session token lưu DB dưới dạng hash.

## 4. Prediction Lock Enforcement

Rule quan trọng nhất:

```text
Backend phải reject mọi prediction write nếu fixture chưa mở cho league hoặc now >= leagueMatch.lockAt.
```

Không tin frontend.

Pseudo-code:

```ts
if (!leagueMatch.isPredictionEnabled || new Date() >= leagueMatch.lockAt) {
  throw new Error("Prediction is locked");
}
```

## 5. Prediction Visibility

Trước lock:

- Không trả tỉ số prediction của người khác từ API.
- Chỉ trả `submitted: true/false`.

Sau lock:

- Có thể trả tỉ số prediction của mọi người.

## 6. Audit Log

Audit các action sau:

- Admin sửa kết quả.
- Admin mở trận dự đoán.
- Admin sửa kickoff/league lock time.
- Admin void match.
- Admin recalculate score.
- Admin reset access code.
- Admin sửa contribution.
- Admin sửa sponsor.
- Admin export dữ liệu.

Prediction của user đã có `createdAt` và `updatedAt`, nhưng có thể audit thêm nếu muốn.

## 7. Anti-cheat Rules

- Mỗi participant chỉ có một prediction mỗi `LeagueMatch`.
- Chỉ trận được admin mở cho league mới được predict.
- Backend phải verify `participant.companyId === leagueMatch.companyId` khi submit prediction.
- Không cho sửa sau lock.
- Không public prediction trước lock.
- Access code chỉ phát qua kênh nội bộ.
- Admin action có audit.

## 8. Edge Cases

### User mở màn hình trước lock nhưng submit sau lock

Backend reject.

### User đổi giờ máy local

Không ảnh hưởng vì backend dùng server time.

### Admin nhập sai kết quả

Admin sửa lại result và recalculate. Audit log ghi nhận.

### Match bị đổi giờ sát trận

Admin cập nhật kickoff và league lock time. Nếu prediction đã khóa, BTC cần quyết định có mở lại hay không.

### Hai người bằng điểm cuối giải

Áp dụng tie-break đã công bố trong rules.

## 9. Legal/Policy Positioning

Trong app nên tránh các từ:

- Bet.
- Betting.
- Odds.
- Wager.
- Stake.
- Payout per match.

Nên dùng:

- Prediction.
- Pick.
- Fan League.
- Prize pool.
- Contribution.
- Friendly game.

## 10. Data Privacy

Không cần thu thập thông tin cá nhân phức tạp.

Chỉ cần:

- Nickname.
- Company.
- Access code hash.
- Contribution status.
- Prediction data.

Không cần email, số điện thoại, tài khoản ngân hàng trong MVP.

## 11. Company Data Isolation

Vì app có thể phục vụ nhiều company, backend phải enforce scope theo company từ session.

Áp dụng cho:

- Leaderboard.
- Donations: contributions + sponsors.
- Prize pool.
- Admin participants.
- Admin settings.
- LeagueMatch open/lock state.
- Audit logs.

Không tin `companyId` từ client cho admin thường. Server lấy company từ session participant. Match/team có thể là dữ liệu dùng chung vì World Cup fixture giống nhau cho mọi company.

Role isolation:

- `ADMIN` chỉ thao tác trong company/league của mình.
- `SUPER_ADMIN` mới được tạo company/league, tạo admin ban đầu, và export cross-company.

## 12. Export Safety

Export phải được audit vì chứa dữ liệu tổng hợp có thể gây tranh cãi.

Mỗi export log nên ghi:

- Actor.
- Company/league scope.
- Export type.
- Filters.
- Format.
- Created at.

Admin thường không được export dữ liệu company khác.
