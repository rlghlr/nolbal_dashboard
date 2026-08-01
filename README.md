# 놀발 데이터 관리자 (Nolbal Data Admin)

플랫폼 활동·결제·상품·앱설치 데이터를 보여주는 대시보드와, 로그인 후 데이터를
직접 입력·수정할 수 있는 관리자 도구입니다. 데이터는 **Firebase Firestore**에
저장되며, 대시보드는 실시간으로 갱신됩니다.

## 🌐 접속 주소

- **대시보드**: https://nolbaldashboard.web.app
- **Firebase 콘솔**: https://console.firebase.google.com/project/nolbaldashboard

---

## 1. 대시보드 보기 (로그인 불필요)

누구나 위 주소로 접속하면 볼 수 있습니다.

- **상단 탭**: 플랫폼 활동 / 결제·취소 / 상품 판매 / 앱 설치 현황
- **기간 필터**: 시작일·종료일, 또는 `최근 1주 / 2주 / 3주 / 전체` 버튼
- **그래프 집계**: 일별 / 주별 전환
- **채널 체크박스**: 안드로이드·iOS·WEB·전체 DAU 선택 표시
- **EXCEL 다운로드**: 현재 그래프 데이터를 CSV로 저장

---

## 2. 데이터 입력 (로그인 필요)

대시보드 **우측 상단 `⚙ 데이터 입력`** 버튼 → 로그인하면 관리자 화면이 열립니다.

> 데이터 조회는 누구나 가능하지만, **입력·수정·삭제는 로그인한 사용자만** 가능합니다
> (Firestore 보안 규칙으로 서버에서 강제).

관리자 화면은 4개 탭으로 구성됩니다.

### 📊 일별 지표
- **날짜 선택** 드롭다운에서 기존 날짜를 고르면 그 날짜 값이 폼에 채워집니다.
- **＋ 새 날짜…** 를 고르면 새 날짜를 추가할 수 있습니다.
- 값을 입력하면 **파생값이 자동 계산·검증**됩니다.
  - 전체 다운로드 = AOS + iOS 다운로드
  - 신규 다운로드 = AOS 다운로드 + iOS 첫 다운로드
  - 레저/숙박 결제 = 기존회원 + 신규회원
  - 총 결제 = 레저 결제 + 숙박 결제
  - 총 취소 = 레저 취소 + 숙박 취소
  - 비쿠폰 결제 = 총 결제 − 쿠폰 결제
  - DAU = 안드로이드 + iOS + WEB 유입
- **저장** / **삭제** 버튼으로 반영. 저장 즉시 대시보드에 반영됩니다.

### 🛍 인기 상품 · 🗂 카테고리 일별
- 날짜를 선택하면 그 날짜의 행이 **표(그리드)** 로 표시됩니다.
- **＋ 행 추가**로 새 행 입력, 각 행 오른쪽 **×** 로 삭제.
- **CSV 붙여넣기**: 여러 줄을 붙여넣고 `CSV → 행 채우기`로 대량 입력.
  - 인기 상품 형식: `상품군,카테고리,상품명,결제건`
  - 카테고리 일별 형식: `상품군,회원,카테고리,결제건`
- **저장**을 누르면 **해당 날짜의 데이터가 입력한 내용으로 교체**됩니다.

### ⚙ 설정
- 대시보드 기준/정의 메타데이터(키-값)를 편집합니다.

---

## 3. 데이터 구조 (Firestore)

| 컬렉션 | 문서 ID | 필드 |
|--------|---------|------|
| `daily` | 날짜(`YYYY-MM-DD`) | 다운로드·삭제·유입·DAU·결제·취소·회원·쿠폰 등 (파생값 포함) |
| `products` | 자동 ID | `date, day, domain, category, product, count` |
| `categoryDaily` | 자동 ID | `date, day, domain, member, category, count` |
| `meta` | `config` | 기준값·정의 설정 |

- `domain` = `레저` / `숙박`
- `member` = `기존회원` / `신규회원`
- 카테고리 값
  - 레저: 키즈/테마파크, 워터파크, 모바일교환권, 액티비티, 문화/교육/체험, 전시/공연, 에듀파크, 스키/눈썰매, 크루즈
  - 숙박: 호텔/리조트, 팬션/글램핑, 한옥, 게스트하우스

현재 **2026년 7월(7/1~7/28)** 데이터가 들어 있으며, 신규 데이터는 **기존 데이터에 추가**하는
방식으로 관리합니다.

---

## 4. 개발자용 — 로컬 스크립트 & 배포

> 아래 작업은 **서비스 계정 키**가 필요합니다. (프로젝트 설정 → 서비스 계정 → 새 비공개 키 생성)

```bash
# 의존성 설치
npm install

# 환경 변수 (프록시 환경에서는 NODE_EXTRA_CA_CERTS도 필요할 수 있음)
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json

# 초기 데이터 이관 (scripts/seed-data.json → Firestore, 각 컬렉션 교체)
export FIRESTORE_PREFER_REST=true
npm run seed

# 인증 활성화 + 관리자 계정 생성 + 웹앱 config 조회
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='********' npm run setup

# 배포 (호스팅)
firebase deploy --only hosting --project nolbaldashboard
# 보안 규칙 배포
firebase deploy --only firestore:rules --project nolbaldashboard
```

### 파일 구조
```
public/index.html         대시보드 + 관리자 UI (프론트엔드 전부)
firestore.rules           보안 규칙 (공개 읽기 / 로그인 쓰기)
firestore.indexes.json    인덱스 정의
firebase.json             호스팅·Firestore 설정
scripts/seed.js           데이터 이관 스크립트
scripts/setup.js          인증·관리자·웹앱 셋업 스크립트
scripts/seed-data.json    이관용 원본 데이터 스냅샷
```

---

## 5. 보안 규칙

```
match /{document=**} {
  allow read: if true;              // 대시보드 공개 조회
  allow write: if request.auth != null;  // 로그인 사용자만 입력/수정/삭제
}
```

- 웹 `apiKey`는 클라이언트에 노출되어도 되는 값입니다(비밀 아님).
- **서비스 계정 키**는 절대 저장소에 커밋하지 마세요. 사용 후 콘솔에서 폐기하세요.
