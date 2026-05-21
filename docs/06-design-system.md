# Design System

## 1. Design Direction

Phong cách nên là:

- Nhẹ nhàng.
- Sạch.
- Friendly.
- Theme sáng làm mặc định.
- Không giống betting/casino.
- Mobile-first.
- Dễ nhìn khi mở nhanh trong giờ làm.

Nguồn cảm hứng:

- Notion-like layout.
- Mini Motorways style simplicity.
- Pastel sports dashboard.
- Clean internal company tool.

## 2. Color Palette

### Semantic colors

| Token | Use |
|---|---|
| `background` | Nền chính |
| `surface` | Card/table |
| `primary` | CTA chính |
| `secondary` | Badge phụ |
| `success` | Paid/scored/correct |
| `warning` | Pending/locking soon |
| `danger` | Error/void |
| `muted` | Text phụ |

### Gợi ý màu

```text
Background: #F8F7F2
Surface:    #FFFFFF
Primary:    #2F7D5C
Accent:     #F4A261
Text:       #1F2937
Muted:      #6B7280
Success:    #16A34A
Warning:    #F59E0B
Danger:     #DC2626
Border:     #E5E7EB
```

Không dùng đỏ/đen quá mạnh làm màu chủ đạo để tránh cảm giác cá cược.

## 3. Typography

Font đề xuất:

- Inter.
- Geist.
- Nunito Sans.

Scale:

```text
Page title: 28-32px
Section title: 20-24px
Card title: 16-18px
Body: 14-16px
Caption: 12-13px
```

## 4. Spacing

Dùng spacing scale:

```text
4px, 8px, 12px, 16px, 24px, 32px
```

Card padding:

```text
Mobile: 16px
Desktop: 20-24px
```

## 5. Radius & Shadow

```text
Card radius: 8px
Button radius: 8px
Input radius: 10px
Shadow: soft, subtle
```

Card nên dùng cho từng item như match, prediction summary, leaderboard row trên mobile. Không dùng nhiều card lồng nhau hoặc section nổi quá nặng.

## 6. Components

### Button

Variants:

- Primary.
- Secondary.
- Ghost.
- Danger.

States:

- Default.
- Hover.
- Disabled.
- Loading.

### Badge

Dùng cho match status:

- Open.
- Locked.
- Live.
- Finished.
- Scored.
- Void.

### Match Card

Elements:

- Team names.
- Flags/logos.
- Kickoff time.
- Lock countdown.
- Status badge.
- Prediction status.
- CTA.

### Score Input

Nên dùng number stepper:

```text
[-] [2] [+]
```

### Data Table

Dùng cho:

- Leaderboard.
- Donations: contributions + sponsors.
- Prediction tracking.
- Admin participants.
- Admin exports.

Mobile nên chuyển table thành card list nếu quá rộng.

## 7. Icon Style

Có thể dùng `lucide-react`.

Icons đề xuất:

- Trophy.
- Calendar.
- Users.
- Lock.
- Clock.
- CheckCircle.
- XCircle.
- Coins.
- Shield.
- Download.

## 8. Motion

Motion nhẹ:

- Button hover.
- Card hover.
- Confetti nhỏ khi user đúng tỉ số.
- Countdown pulse khi còn dưới 10 phút.

Không nên animation quá nhiều.

## 9. Accessibility

- Contrast đủ rõ.
- Không chỉ dùng màu để thể hiện trạng thái.
- Input có label rõ ràng.
- Button disabled có reason.
- Table có header rõ.
