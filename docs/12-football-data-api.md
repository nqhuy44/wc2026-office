# Football Data API

## 1. Recommendation

MVP nên hỗ trợ manual mode trước:

- Import lịch trận bằng CSV.
- Admin nhập kết quả thủ công.
- App tự tính điểm.

Sau đó mới tích hợp API để sync:

- Fixtures.
- Results.
- Live status.
- Team info.
- Lineups nếu cần.

Kết luận hiện tại: có thể lấy API để lấy thông tin trận, nhưng không nên để API là dependency bắt buộc của MVP. Thiết kế nên chạy ổn với CSV/manual trước, rồi bật API provider bằng config.

API sync chỉ tạo/cập nhật fixture global. Không tự động mở prediction cho từng league, vì admin cần chọn trận nào đáng chơi để giữ game vui.

## 2. Why Manual First

Với app nội bộ, manual mode có lợi:

- Không phụ thuộc quota API.
- Không phụ thuộc độ chính xác live data.
- Không cần xử lý nhiều edge cases.
- Dễ kiểm soát kết quả chính thức.
- Làm MVP nhanh hơn.

## 3. API Data Needed

### Core data

- Teams.
- Fixtures.
- Kickoff time.
- Venue.
- Stage/group.
- Match status.
- Final score.

### Optional data

- Live score.
- Lineups.
- Events.
- Cards.
- Substitutions.
- Team flags/logos.

## 4. Provider Abstraction

Nên thiết kế abstraction để sau này đổi provider dễ.

```ts
export interface FootballDataProvider {
  getFixtures(): Promise<ExternalFixture[]>;
  getFixtureById(id: string): Promise<ExternalFixture | null>;
  getLiveFixtures(): Promise<ExternalFixture[]>;
}
```

External fixture model:

```ts
export type ExternalFixture = {
  externalMatchId: string;
  homeTeam: ExternalTeam;
  awayTeam: ExternalTeam;
  kickoffAt: string;
  stage: string;
  groupName?: string;
  venue?: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
};
```

## 5. Sync Strategy

### Fixtures sync

```text
Fetch fixtures
  -> Upsert teams
  -> Upsert matches by externalMatchId
  -> Do not create open LeagueMatch automatically
  -> Do not override manually locked/admin overridden fields unless allowed
```

### Results sync

```text
Fetch finished fixtures
  -> Update homeScore/awayScore
  -> Mark FINISHED
  -> Trigger scoring only for opened league matches if not scored
```

## 6. Manual Override Protection

Add future fields if needed:

```text
isManualOverride
manualOverrideFields
lastSyncedAt
externalProvider
```

MVP schema chưa cần, nhưng nên cân nhắc nếu tích hợp API sớm.

## 7. API Providers to Evaluate

Các provider nên xem xét khi gần World Cup:

- SportMonks: đã có tài liệu riêng cho World Cup 2026, hỗ trợ fixtures, livescores, standings, teams và filter theo season/stage.
- API-Football.
- football-data.org.
- TheSportsDB.
- Provider chuyên WC2026 nhỏ hơn nếu cần, nhưng phải kiểm tra độ tin cậy/license kỹ hơn.

Tiêu chí chọn:

- Có World Cup 2026 fixtures không.
- Có live score không.
- Có free tier đủ dùng không.
- Quota request/ngày.
- Có điều khoản cho internal company game không.
- Có lineups không.
- License cho internal use.
- Độ ổn định.

## 8. Recommended Integration Order

1. Manual CSV import fixtures.
2. Manual result entry + scoring.
3. Add provider abstraction.
4. Add fixture sync behind `FOOTBALL_API_PROVIDER`.
5. Add admin "Open Prediction" workflow using synced fixtures.
6. Add result sync.
7. Optional live score polling.

Với app dự đoán nội bộ, fixtures và final score là đủ. Live status hữu ích nhưng không bắt buộc.

## 9. Sync Schedule

Đề xuất:

### Trước giải

- Sync fixtures mỗi ngày.

### Trong ngày có trận

- Sync mỗi 15 phút cho upcoming/live/finished.

### Khi trận live

- Nếu cần live score: sync mỗi 1-5 phút.
- Nếu chỉ cần result: sync mỗi 15-30 phút là đủ.

## 10. Fallback

Luôn cho admin nhập kết quả thủ công nếu API lỗi.

API không nên là nguồn duy nhất.

## 11. Current Provider Notes

SportMonks có World Cup 2026 guide, dùng Football API v3 endpoint chung với filter theo season/stage thay vì endpoint riêng. Provider này phù hợp để thử đầu tiên nếu chấp nhận paid/quota.

football-data.org có API resources chuẩn như competitions, matches, teams, standings và dùng `X-Auth-Token`. Cần xác nhận coverage World Cup 2026 và plan trước khi chọn.
