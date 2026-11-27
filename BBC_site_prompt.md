# BBC(불광 배드민턴 클럽, Bulgwang Badminton Club) 사이트 재구현 프롬프트 — GitHub Pages 버전

## 사용법 (사용자용 메모)

### 왜 구조를 바꿨나

- 원본은 Django 서버이고, 서버 PC가 켜져 있어야 동작합니다.
- GitHub Pages는 HTML/JS/CSS 같은 정적 파일만 서비스합니다. 서버 코드(Python)나 DB는 돌릴 수 없습니다.
- 그래서 역할을 둘로 나눴습니다. 둘 다 무료이고, 내 PC는 꺼져 있어도 됩니다.

```
[브라우저] ──(HTML/JS)──> GitHub Pages        : 화면 (무료, 정적 호스팅)
    └──────(데이터/로그인)──> Supabase        : PostgreSQL DB + 로그인 + 권한 (무료 플랜)
```

통계 계산(보정승률, 하이라이트 등)은 서버 대신 브라우저 JS에서 계산합니다. 동호회 규모(멤버 100명 이하, 경기 수천 건)면 충분히 빠릅니다.

### 진행 순서

1. 아래 **「직접 해야 할 설정」**을 먼저 하세요. GitHub와 Supabase 계정, 저장소, DB가 필요합니다.
2. 「마스터 프롬프트」 블록 전체를 AI 코딩 도구(Claude Code 등)에 붙여넣으세요.
3. 한 번에 안 되면 **「단계별 후속 프롬프트」**를 순서대로 보내세요.
4. AI가 만든 `supabase/schema.sql`을 Supabase SQL Editor에서 실행합니다. 그다음 `assets/js/config.js`에 URL과 키를 넣고 push하면 배포됩니다.

### 직접 해야 할 설정 (AI가 대신 못 하는 것)

| # | 할 일 | 비고 |
|---|---|---|
| 1 | GitHub 저장소 `EasyBros/BBC` 사용 | 무료 계정은 Public 저장소만 Pages 가능합니다. 코드는 공개되지만 데이터는 Supabase에 있고 로그인으로 보호됩니다. |
| 2 | supabase.com에서 프로젝트 만들기 | Region은 Northeast Asia (Seoul). DB 비밀번호는 따로 보관하세요. |
| 3 | SQL Editor에서 `supabase/schema.sql` 실행 → (선택) `supabase/seed.sql` | seed는 가짜 데모 데이터입니다. |
| 4 | Authentication → Users → Add user 2개 (Auto Confirm 체크) | `bbc@club.com` (동호회 공용 비밀번호), `bbcadmin@club.com` (관리자 비밀번호). |
| 5 | SQL Editor에서 `insert into app_admins(user_id) select id from auth.users where email='bbcadmin@club.com';` | 관리자 지정 |
| 6 | Authentication → Sign In / Providers → **Allow new user sign-ups 끄기** | 꼭 하세요. 켜져 있으면 아무나 가입해서 데이터를 읽고 쓸 수 있습니다. |
| 7 | Project Settings → API에서 Project URL과 **Publishable key(구 anon key)**를 `assets/js/config.js`에 입력 | 이 키는 공개돼도 되는 키입니다. service_role / secret key는 절대 넣지 마세요. |
| 8 | GitHub 저장소 → Settings → Pages → Source: Deploy from a branch, main / (root) | 1~2분 후 `https://easybros.github.io/BBC/` 로 접속 |
| 9 | (권장) 저장소 Settings → Secrets → `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` 등록 | 무료 Supabase가 7일 동안 요청이 없으면 일시정지되는 것을 막는 keepalive 워크플로우에서 씁니다. |

### 알아둘 점

- **비용**: GitHub Pages와 Supabase 무료 플랜이면 0원입니다. Supabase 무료 한도는 DB 500MB이고, 동호회 기록은 수 MB 수준입니다.
- **일시정지**: Supabase 무료 프로젝트는 7일간 요청이 없으면 멈춥니다. 명절 연휴가 길면 걸릴 수 있어서, 3일마다 자동으로 핑하는 GitHub Actions를 포함시켰습니다. 멈췄더라도 대시보드에서 Restore 버튼으로 복구됩니다.
- **접근 제어**: 사이트 주소는 누구나 열 수 있지만, 동호회 비밀번호로 로그인해야 데이터가 보입니다. 비밀번호는 동호회 단톡방에만 공유하세요.
- **백업**: 무료 플랜은 자동 백업이 약합니다. 관리자 페이지의 **「JSON 백업 다운로드」**로 가끔 받아 두세요.
- **이미지**: 로고와 배경 사진은 직접 준비한 이미지로 `assets/img/`에 넣으세요. 원본 사이트의 이미지는 쓰지 않습니다.
- **기존 기록 이전(선택)**: 원본 사이트의 기록을 옮기려면 마지막의 선택 프롬프트를 쓰세요. 다른 멤버 이름이 외부 서비스에 저장되므로 동호회 동의를 먼저 받으세요.
- **원본 확인 불가 항목**: 서버 코드에서만 알 수 있는 동작은 ASSUMPTION(가정)으로 표시했고, 파일 끝에 표로 모았습니다.
- **표기**: 프롬프트 전체를 한국어로 썼습니다. 코드 식별자, 파일 경로, API·함수 이름, 색상값, CSS 값은 그대로 두었습니다.

---

## 마스터 프롬프트

### 역할

당신은 시니어 풀스택 엔지니어입니다. 아래 명세대로 완성된, 바로 배포 가능한 앱을 만드세요.
단계별로 진행하세요(맨 아래 "개발 단계" 참고). 화면에 나오는 한국어 문구는 명세에 적힌 그대로 정확히 사용하세요.

### 제품 개요

"BBC"(Bulgwang Badminton Club, 불광 배드민턴 클럽). 복식 배드민턴 동호회 리그 기록 사이트입니다.
출석 체크, 무작위 짝 배정, 경기 점수 입력(직접 입력 + 붙여넣은 텍스트 일괄 파싱),
베이지안 방식 보정승률 기반 랭킹, 일/주/월/시즌 하이라이트,
파트너 궁합 분석(히트맵, 꺾은선 그래프, 거미줄 그래프), 팝업이 있는 공지사항.
한국어 UI, 모바일 우선, 기본 다크 테마, 계절별 테마.

### 호스팅 제약 (가장 중요)

- 프론트엔드는 GitHub Pages가 서비스하는 100% 정적 파일입니다(프로젝트 사이트: `https://easybros.github.io/BBC/`). 서버 코드 없음, 빌드 단계 없음. 순수 HTML + 바닐라 JS ES 모듈 + CSS. Pages 배포 방식 = "Deploy from a branch: main / root". 빈 `.nojekyll` 파일을 추가하세요.
- 백엔드는 Supabase(Postgres + Auth + Row Level Security + RPC 함수), 무료 플랜.
- 사이트가 `/<repo>/` 아래에 있으므로 내부 링크는 모두 상대 경로로 작성합니다. 페이지는 저장소 루트에 평평하게 둡니다: `index.html`(대시보드), `members.html`, `games.html`, `match.html`, `stats.html`, `analysis.html`, `notices.html`, `notice.html`(상세, `?id=`), `admin.html`. 로그인은 별도 페이지가 아니라 오버레이입니다. 딥링크: `stats.html?tab=pairs`, `games.html?session=<id>`, `notice.html?id=<id>`.
- 로컬 정적 서버(`python -m http.server 8000`)로 열어도 동작해야 합니다. ES 모듈은 `file://` 에서 동작하지 않습니다.
- 코드에 들어가도 되는 키는 Supabase URL과 publishable(anon) key뿐입니다(`assets/js/config.js`). service_role/secret key는 절대 넣지 마세요.

### 기술 스택 (CDN, 정확한 버전 고정)

- `@supabase/supabase-js` v2 ESM: `cdn.jsdelivr.net/npm/@supabase/…/+esm`
- Bootstrap 5.3.3 CSS + bundle JS, Bootstrap Icons 1.11.3 (jsdelivr), Noto Sans KR (Google Fonts).
- Chart.js 4.4.1 (분석 페이지만): `cdn.jsdelivr.net/npm/…/dist/chart.umd.min.js`
- 공지 HTML 렌더링용 DOMPurify 3.1.6.
- 날짜는 항상 Asia/Seoul 기준. `today() = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date())`.
- 테스트: Node 20 내장 러너(`node --test tests/`), 순수 ES 모듈, npm 의존성 없음.

### 저장소 구조

- `/index.html`, `/members.html`, ... (페이지)
- `/assets/css/app.css` — 디자인 토큰, 컴포넌트, 계절 테마, 광고판
- `/assets/js/config.js` — SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, CLUB_EMAIL, ADMIN_EMAIL, APP_TITLE
- `/assets/js/supabase.js` — createClient 싱글턴 (persistSession true)
- `/assets/js/auth.js` — 로그인 오버레이, 동호회/관리자 로그인, isAdmin(), signOut()
- `/assets/js/layout.js` — 내비게이션 바, 리그/시즌 선택기, 테마 토글, 토스트, 공지 팝업, 푸터 삽입
- `/assets/js/data.js` — 페이지네이션 + 메모리 캐시 + 필터(리그, 시즌)를 갖춘 데이터 로더
- `/assets/js/stats.js` — 순수 통계 엔진 (DOM·네트워크 접근 없음) — 단위 테스트 대상
- `/assets/js/parser.js` — 순수 텍스트 일괄 파서 + 중복 시그니처 — 단위 테스트 대상
- `/assets/js/pairing.js` — 순수 셔플/짝 배정/경기 코드 — 단위 테스트 대상
- `/assets/js/util.js` — escapeHtml, dateWithWeekday, copyToClipboard(textarea 대체 방식 포함), progressBar, hearts
- `/assets/js/pages/*.js` — 페이지별 모듈 하나씩
- `/assets/img/` — logo.png, king-left.webp, king-right.webp, winter-wall.webp (내가 교체할 임시 이미지)
- `/assets/data/holidays-kr.json` — `{"2025":["YYYY-MM-DD",...],"2026":[...],"2027":[...]}` 음력 공휴일과 대체공휴일 포함
- `/supabase/schema.sql` — 테이블, 뷰, RLS, RPC, 권한 부여 (여러 번 실행해도 안전하게)
- `/supabase/seed.sql` — 가상의 데모 데이터
- `/tests/*.test.mjs`
- `/.github/workflows/keepalive.yml` — 3일마다 cron: publishable key로 `{SUPABASE_URL}/rest/v1/rpc/ping` 에 curl POST
- `/.github/workflows/test.yml` — push할 때 `node --test` 실행
- `/README.md` — 설치 방법 + 사용자가 Supabase/GitHub에서 직접 할 설정

### 인증 방식 (원본의 Django 관리자 비밀번호를 대체)

- Supabase Auth 사용자 두 개를 직접 만듭니다: CLUB_EMAIL(동호회 공용 비밀번호), ADMIN_EMAIL(관리자 비밀번호). Supabase 설정에서 공개 가입은 꺼 둡니다.
- 로그인 오버레이(세션이 없으면 layout.js가 모든 페이지에 표시): 로고, "🏸 BBC", 입력칸 "동호회 비밀번호", 버튼 "입장" → `supabase.auth.signInWithPassword({email: CLUB_EMAIL, password})`. 실패 시 "비밀번호가 올바르지 않습니다." 세션은 localStorage에 유지됩니다(supabase-js 기본값). 내비게이션 바에 작은 로그아웃 아이콘을 둡니다.
- 관리자 기능은 "관리자 인증" 모달(비밀번호)을 띄워 ADMIN_EMAIL로 로그인합니다(관리자는 동호회 권한도 모두 가짐). 관리자 상태에서는 내비게이션 바에 "👑 관리자 모드" 칩을 표시하고, "관리자 모드 종료"를 누르면 로그아웃 후 동호회 로그인 화면을 보여줍니다.
- SQL의 `isAdmin()`: `exists (select 1 from app_admins where user_id = auth.uid())`.

### 데이터베이스 (supabase/schema.sql)

**테이블** (PK는 bigint identity, 시각 컬럼은 timestamptz default now()):

- `members`: name text not null, nickname text, league smallint check (league in (1,2)) default 1, joined_at date default current_date, is_admin bool default false (배지 표시용), is_guest bool default false, is_active bool default true, created_at. 리그 표시: 1 = "🥇 1부 (고인물)", 2 = "🥉 2부 (깍뚜기)". display_name = 닉네임이 있으면 "이름 (닉네임)", 없으면 "이름".
- `seasons`: year int, kind text check in (spring,summer,autumn,winter), name text (예: "2026 동계"), start_date, end_date, is_active bool. 계절: spring 3~5월, summer 6~8월, autumn 9~11월, winter 12~2월. 이름 접미사 춘계/하계/추계/동계. 아이콘: spring 🌸, summer ☀️, autumn 🍂, winter ❄️.
- `sessions` (모임 = 경기한 하루): date date unique not null, location text, note text, created_at.
- `attendance`: session_id fk cascade, member_id fk, created_at; unique(session_id, member_id).
- `games`: session_id fk cascade, team_a_name text, team_b_name text, team_a_score smallint, team_b_score smallint (check 0..30, team_a_score <> team_b_score), winner_team char(1) 생성 컬럼(a>b면 'A' 아니면 'B') stored, comment text (check 길이 ≤ 200), played_at timestamptz default now().
- `game_players`: game_id fk cascade, member_id fk, team char(1) check in ('A','B'); unique(game_id, member_id).
- `notices`: title, content (HTML), author text, is_pinned bool, is_popup bool, league smallint null (= 전체), created_at.
- `settings`: key text pk, value jsonb. 키: season_teaser_enabled (bool), season_teaser_text (string, 기본값 "❄️ Winter is coming! 12월 동계 시즌 개막 예정 🏸"), extra_holidays (날짜 배열).
- `app_admins`: user_id uuid pk references auth.users.

**뷰** `v_game_players` (security_invoker = on): game_id, session_id, date, played_at, team, member_id, team_a_score, team_b_score, winner_team, team_a_name, team_b_name, comment.

**RLS**: 모든 테이블에서 활성화.

- authenticated: app_admins를 제외한 모든 테이블 SELECT 허용 (app_admins는 자기 행만 조회).
- authenticated: members INSERT/UPDATE (is_active 제외), sessions INSERT 허용. 경기/출석 쓰기는 RPC로만.
- 관리자 전용 (`isAdmin()`): members.is_active 변경, notices·seasons·settings의 모든 쓰기.
- anon: `ping()` EXECUTE 외에는 아무 권한 없음.

**RPC** (plpgsql, 따로 적지 않으면 security invoker, authenticated에게 execute 권한):

- `ping()` returns timestamptz — anon에게도 권한 부여 (keepalive용).
- `ensure_session(p_date date)` returns sessions — insert on conflict do nothing 후 해당 행 반환.
- `set_attendance(p_session_id, p_member_ids bigint[])` returns timestamptz — 빠진 사람 삭제와 새 사람 추가를 한 트랜잭션으로 처리 (기존 행은 created_at 유지 = 출석 체크 순서), max(created_at) 반환.
- `create_game(p_session_id, p_team_a_name, p_team_b_name, p_team_a bigint[2], p_team_b bigint[2], p_score_a, p_score_b, p_comment)` returns json — 4명이 서로 다른지와 점수를 검증하고, game과 game_players 4행을 한 트랜잭션으로 저장.
- `update_game(p_game_id, 같은 필드들)` returns json; `delete_game(p_game_id)`.
- `batch_register(p_session_id, p_games jsonb)` returns json `{message, created_count, skipped_duplicate_count, batch_duplicate_count, error_count}`; 아래 시그니처 규칙으로 같은 모임의 기존 경기 및 같은 배치 안 앞선 항목과 중복이면 건너뜀. message 예: "5건 저장 (중복 1건 제외)".
- `deactivate_member(p_id)` — isAdmin()이 아니면 예외 발생.

### 데이터 계층 (assets/js/data.js)

- Supabase는 요청당 최대 1000행만 돌려주므로, `fetchAll()`이 짧은 페이지가 나올 때까지 `.range(from, from+999)`를 반복합니다.
- `loadAll()`은 페이지 로드마다 한 번, members, seasons, sessions, attendance, v_game_players, settings를 병렬로 가져와 메모리에 캐시합니다. 'statsChanged' 때 캐시를 무효화합니다.
- `filterBy({league, seasonId})` → stats.js가 쓸 필터된 배열 반환. **ASSUMPTION(가정, 리그 필터)**: 4명이 모두 해당 리그인 경기만 남기고, 멤버 목록도 해당 리그로 필터. 시즌 필터: 시즌 기간에 속한 모임만. 빈 값 = 전체 기간("전체(역대)").
- 모든 쓰기 후 `markStatsChanged()`를 호출합니다. 선택 사항: games/attendance에 Supabase Realtime 구독 → markStatsChanged().

### 통계 엔진 (assets/js/stats.js — 순수 함수, 반환 형태 = 원본 API JSON과 동일해서 페이지가 원본과 똑같이 동작)

**공식 (정확히 구현):**

- win_rate(승률) = 승/경기×100 (소수 1자리).
- 개인 보정승률 = (승 + 7.5)/(경기 + 15)×100.
- 복식조 보정승률 = (승 + 2.5)/(경기 + 5)×100.
- **BBC 포인트** = 승×3 + 패×1 (참여가 많을수록 유리).
- 정렬: 보정승률 내림차순 → 승률 → 승수 → 경기수. 개인 랭킹은 15경기 이상, 복식조는 5경기 이상부터 순위 부여. 기준 미만은 순위 없이 순위권 아래에 표시("기록만 표시"). 게스트는 "게스트" 배지.
- 출석률 = 경기를 1번 이상 뛴 날 수 ÷ 평일 수(월~금에서 holidays-kr.json과 settings.extra_holidays 제외), 기간은 max(가입일, 기간 시작일)부터 오늘까지. 전체 / 이번 달 / 이번 주 세 가지.
- B-Love 하트 수 = clamp(round(복식조 보정승률/20), 0, 5): "❤️"×n + 흐린 "❤️"×(5−n). 범례 "90%↑ ❤️5 | 70%↑ ❤️4 | 50%↑ ❤️3 | 30%↑ ❤️2 | 10%↑ ❤️1".

**일자별 하이라이트** (모임 날짜마다, 동점이면 모두 표시):

- BBC Point: 그날 BBC 포인트 최고.
- 어깨 깡패(winner): 그날 동적 보정승률 1위. K = (그날 가장 많이 뛴 사람의 경기수)/2; 보정 = (승 + K/2)/(경기 + K)×100.
- Magic Eraser: 동적 보정승률 최하위. deleted_partners = 그날 함께 진 파트너들.
- Best Couple: 그날 복식조 보정승률(K=5) 1위. Strong Guy: 그날 가장 많이 뛴 사람.
- top_winners / top_erasers: 어깨 깡패 / Magic Eraser에 오른 날 수 순위.

**기간 하이라이트** (시즌 | N주차 | N월): mvp = 개인 보정승률 1위(기간 내 5경기 이상), winner/eraser = 일자별 등극 횟수 최다(highlight_count), bbc = 포인트 최고, strong = 경기수 최다, couple = 복식조 보정승률 최고(동률이면 score_diff). 주차는 시즌 시작일부터 월요일 기준 번호, 월은 1..3. available_weeks / available_months는 내림차순.

**함수와 반환 형태:**

- `dashboardStats()` → `{total_sessions, total_games, total_members, recent_sessions:{id,date,location,game_count,attendee_count}, today_highlights:{bbc_points:[{member_id,member_name,won,lost,bbc_point}], winners:[{member_id,member_name,win_rate,played,won}], best_couples:[{member1_name,member2_name,win_rate,adj_win_rate,played,won}], magic_erasers:[{member_id,member_name,total_games,lost_games,deleted_partners:[str]}], strong_guys:[{member_id,member_name,total_games}]} | null, top_winners:{member_id,member_name,winner_count,total_games,total_won}, top_erasers:{member_id,member_name,eraser_count,total_games,lost_games}}`
- `memberStats()` → `[{id,name,nickname,display_name,joined_at,is_guest, total_sessions,attended,attendance_rate, month_*/week_* (total_sessions, attended, attendance_rate), played,won,lost,win_rate,adj_win_rate,bbc_point, month_played,month_won,month_lost,month_win_rate, week_played,week_won,week_lost,week_win_rate}]`
- `pairStats()` → `[{member1_id,member1_name,member2_id,member2_name,played,won,lost,score_diff,win_rate,adj_win_rate}]`
- `winners()`, `erasers()`, `dailyHighlights()` → `[{date,session_id,bbc_points,winners,best_couples,erasers,strong_guys}]` 최신순
- `seasonStats(season)` → `{summary:{start_date,end_date,total_sessions,total_games,active_members,avg_attendees,avg_games}, highlights:{mvp,winner,bbc,eraser,strong_guy,best_couple}, weekly:[{date,games,attendees}]}`
- `periodHighlight(period, index)` → `{highlights:{mvp,winner,eraser,bbc,strong,couple}: 각각 배열{member_name,member_id,total_games,won_games,lost_games,win_rate,adj_win_rate,bbc_point,highlight_count,score_diff}, available_weeks, available_months, period_summary:{label,start_date,end_date,total_sessions,total_games,active_members}}`
- `analysis(minGames, memberId?)` → `{members:[{id,display_name,played}], heatmap_members (경기수 ≥ minGames), heatmap_cells:{"<작은id>_<큰id>":{played,won,win_rate,adj_win_rate}}, timeline:[{date,win_rate,adj_win_rate,daily_win_rate,cumulative_played,cumulative_won}]}`

### 텍스트 일괄 파서 (assets/js/parser.js, 정규식, AI 사용 안 함)

textarea placeholder (그대로 사용):

```
[홍길동 (닉네임)] 2026-08-07 12:57
민수 지훈 17 25 서연 도윤
하준 지훈 25 20 서연 예준
```

- "[이름 ...] ... YYYY-MM-DD HH:MM" 같은 헤더 줄과 잡음 줄은 무시.
- 경기 줄 = "이름 이름 점수 점수 이름 이름".
- 이름은 활동 중인 멤버와 매칭: 전체 이름 일치 → 전체 이름에서 첫 글자(성)를 뺀 이름 일치 → 닉네임 일치. 애매하거나 없으면 null (미리보기에서 사용자가 고침).
- 출력 `[{team_a_ids:[id|null,id|null], team_b_ids:[...], score_a, score_b, raw_line}]`.
- **중복 시그니처** (JS와 SQL에서 동일): 팀마다 id 정렬, 두 팀도 정렬, 키 = `JSON(teams)|scoreA|scoreB` (A/B가 바뀌어도 같은 경기로 판단).

### 공통 레이아웃 (layout.js가 모든 페이지에 삽입)

- `<html lang="ko">`, 제목 "BBC - {페이지}", 파비콘은 로고. `<head>` 안 인라인 스크립트로 깜빡임(FOUC) 방지: `theme = localStorage.theme || 'dark'` → `<html>`에 `theme-dark` 클래스 추가.
- 상단 고정 그라데이션 내비게이션 바: 로고 + "🏸 BBC"; 리그 선택("전체", 1부, 2부)과 시즌 선택("전체(역대)" + 아이콘 붙은 시즌들)은 데스크톱에서 바에, 모바일에서는 접힌 메뉴 안에 중복 배치하고 값을 동기화.
- 메뉴 (Bootstrap Icons): 대시보드 (speedometer2) index.html, 멤버 (people) members.html, 경기 입력 (controller) games.html, 출석&짝 (clipboard-check) match.html, 통계 (bar-chart) stats.html, 분석 (graph-up) analysis.html, 공지 (megaphone) notices.html, 관리 (gear, 관리자만) admin.html, 테마 토글 (moon-stars-fill / sun-fill), 로그아웃.
- 본문 컨테이너: container-fluid, max-width 1694px.
- 리그: `localStorage.currentLeague`, window 이벤트 'leagueChanged' 발생. 시즌: `localStorage.currentSeason`, 기본값 = 현재 시즌(오늘이 기간 안), body 클래스 `season-<kind>`, 'seasonChanged' 발생.
- `showToast(msg, type)`: 오른쪽 아래에 쌓임, 왼쪽 테두리 색(success #3FB950, danger #F85149, warning #D29922, info #58A6FF), 슬라이드 인, 2.8초 후 사라짐.
- 탭 간 새로고침: `markStatsChanged()` → `localStorage.statsChangedAt = now`; `subscribeStatsChanged(cb)`는 'storage' 이벤트 수신, 5초마다 확인, visibilitychange 때 `window.__statsLoadedAt`과 비교해 오래됐으면 다시 로드.
- 공지 팝업: 로그인 후 800ms 뒤 모든 페이지에서, 현재 리그(또는 전체) 대상 최신 is_popup 공지를 표시. 그라데이션 헤더 "공지사항", 제목, 날짜, DOMPurify로 정리한 본문, 체크박스 "오늘 그만 보기"(`localStorage popup_dismissed_<id>` = YYYY-MM-DD), 링크 "자세히 보기" → `notice.html?id=`, 버튼 "닫기", 배경 클릭 시 닫힘, 배경 블러.
- 보안: 사용자 입력 문자열은 innerHTML에 넣기 전에 모두 `escapeHtml()`. 공지 HTML은 DOMPurify를 거쳐서만 렌더링.
- 로딩 상태: 스피너 자리표시. Supabase/네트워크 오류 → 토스트 "데이터를 불러오지 못했습니다." + 다시 시도 버튼.

### 페이지 (원본과 같은 UI)

#### 1. 대시보드 index.html

**a) 시즌 배너**: 시즌 미선택 → 가운데 로고 + 흐르는 알림 문구; 시즌 선택 → 로고, 이모지, 시즌 이름, "시작일 ~ 종료일 · N모임", 알림 문구. 문구는 settings(season_teaser_enabled/text)에서 가져와 트랙에 3번 반복 배치, `translateX(-33.333%)→0` linear 30s 무한 반복, 마우스 올리면 멈춤, 양 끝 페이드 마스크, 1.6rem/800.

**b) 요약 카드 4개** (col-6 col-md-3): 총 모임, 총 경기, 활동 멤버, 최근 모임 ("YYYY-MM-DD (월)").

**c) "Today's Highlight" + "📋 복사"**. 금색 반짝임 테두리 카드 5개 (row-cols-2 row-cols-lg-5):

- 🏆 BBC Point (이름 + "9P" + "(승: 3, 패: 0)")
- 🥇 어깨 깡패 (The Shoulder Monster) (이름 + 승률% + "N승")
- 👫 Best Couple ("A & B" + 보정승률% + "N승")
- 🧹 Magic Eraser (이름 + "N경기 / N패" + 파트너 칩)
- 💪 Strong Guy ("가장 많이 뛴 선수 💪 (N경기)" + 이름들)

데이터 없음: "오늘 경기가 없습니다 🏸".

복사 형식:

```
🏸 Today's Highlight (YYYY-MM-DD)
━━━━━━━━━━━━━━━━━━
🏆 BBC Point
이름 9P (승:3, 패:0)

(섹션마다 빈 줄로 구분: 🥇 어깨 깡패 "이름 100% (3승)", 👫 Best Couple "A & B 보정승률 80% (3승)",
🧹 Magic Eraser "이름 4경기 / 4패", 💪 Strong Guy (N경기) 이름들)
━━━━━━━━━━━━━━━━━━
🔗 대시보드: {사이트 기본 URL}
📝 경기 입력: {사이트 기본 URL}games.html
```

**d) TOP 5 카드들** (col-lg-6), 각각 아이콘 칩, 제목, (?) 툴팁(기준 설명), "전체 보기 →":

- **BBC 포인트 TOP 5** (#, 이름, 승, 패, "155P") → `stats.html?tab=bbc`
- **개인 승률 TOP 5** (#, 이름, 경기, 승률 막대, 보정 막대) + "랭킹 기준" 펼침 버튼 → `?tab=winrate`
- **복식 조 승률 TOP 5** (#, 복식 조, 경기, 승률, 보정, B-Love; 2경기 이상) → `?tab=pairs`
- **출석률 TOP 5** (토탈/월간/주간 막대 3개)
- **🏆 어깨 깡패 TOP 5** (등극 횟수 "13회", 총 경기, 총 승리, "일자별 등극 횟수 순")
- **🧹 Magic Eraser TOP 5** (등극 횟수, 최근 경기, 최근 패) → `?tab=eraser`
- **최근 모임** (날짜, 장소, 참석 "N명", 경기 "N경기", "상세 →" `games.html?session=id`)

순위 칸은 🥇🥈🥉 다음부터 숫자. "랭킹 기준" 펼침 내용: 개인 랭킹 15경기 이상 (미만은 기록만 표시) / 복식 조 랭킹 5경기 이상 / 순위 기준 보정승률 우선 → 승률 → 승수 → 경기수 / 게스트 별도 표시 (게스트 라벨) / 1~3경기 기록만 표시 (랭킹 제외), 공식 "(실제 승수 + 7.5) / (실제 경기수 + 15) × 100"과 화살표 설명 "50% 기준의 가상 승수", "안정화용 가상 경기수", 주석 "※ 경기 수가 적어도 평균 50%로 수렴하여 과대평가 방지".

**e)** leagueChanged / seasonChanged / statsChanged 때 다시 그림.

#### 2. 멤버 members.html

"멤버 관리" + 인원 수 + "멤버 추가". 표: 이름 (관리자면 👑), 닉네임, 리그 배지, 가입일, 작업 버튼.

모달:

- 멤버 추가 (이름 * placeholder 홍길동, 닉네임 (선택) placeholder 길동이, 리그, 가입일 기본값 오늘; 취소/추가)
- 멤버 수정 (+ "👑 관리자" 체크박스; 취소/저장)
- 멤버 삭제 ("{name}을(를) 삭제하시겠습니까?", "멤버가 비활성화되며, 기존 경기 데이터는 그대로 유지됩니다.", 관리자 비밀번호 → 관리자 로그인 → deactivate_member; 취소/삭제)

#### 3. 경기 입력 games.html (`?session=<id>`)

- "🏸 경기 입력"; 모임 선택 ("날짜 선택..." + "YYYY-MM-DD (요일) (N경기)"); 기본값은 URL의 모임 또는 오늘(ensure_session). 안내 문구 "YYYY-MM-DD (요일) — N경기 기록됨".
- "경기 결과" (오래된 순): 번호, A팀 이름 + "a · b", "25 : 22" (이긴 쪽 굵게 + 🏆), B팀, 수정/삭제(확인 "경기 #N을 삭제할까요?"), 코멘트 줄. 수정 → 기존 값이 채워진 카드 ("수정 중", "수정 저장").
- 입력 카드 "경기 #N": A팀/B팀 라벨은 클릭해서 바로 수정 (Enter 확정 / Esc 취소, 최대 30자); 팀마다 검색형 선택기 2개("이름 검색...", display_name으로 필터, ↑/↓/Enter/Esc 지원, 같은 카드에서 이미 고른 사람은 비활성, "검색 결과 없음"); 점수 0~30; "A승 (25:23)" / "B승 (23:25)"; "💬 코멘트 (선택)" 최대 200자; 4명을 다 고르면 "기록 저장" 활성화. 토스트: "모든 선수를 선택하세요.", "점수를 입력하세요.", "같은 선수를 중복 선택할 수 없습니다.", "경기 #N 저장 완료".
- "텍스트 일괄 등록": textarea + "분석 결과 미리보기" → parser.js (브라우저에서 처리) → 미리보기 "파싱 결과 확인"(A팀 선택 2개 | 점수 입력 2개 | B팀 선택 2개 | 상태). 상태: 빨강 "선수 미선택 또는 중복", 주황 "이미 등록된 경기와 중복", 주황 "입력 내 중복 경기", 초록 "저장 가능"; "중복 경기 N건이 감지되었습니다. (저장 시 자동 제외)". 취소 / "N건 확정 및 저장" → batch_register → 결과 message 토스트.

#### 4. 출석&짝 match.html

"출석&짝", "오늘 출석하는 멤버를 선택하고 짝배를 시작하세요."

**"출석부"**: 날짜 선택 (오늘은 "(오늘)" 표시 + 과거 날짜), 전체 선택 / 전체 해제, "N명 출석". 멤버 카드를 한 줄에 10개씩, 클릭하면 출석 토글 (🏸 + "출석 ✓"). 과거 날짜는 읽기 전용 "과거 출석부는 조회만 가능합니다." 오늘 모임은 자동 생성.

**자동 저장**: 1초 디바운스 → set_attendance; "저장 중..." → "저장됨" (2초 후 숨김) / "저장 실패".

**"오늘 출석자 (N명)"**: 출석 체크한 순서대로 태그 표시, 이모지 = `EMOJIS[id % 15]`, `EMOJIS = ['🏸','🏃','💪','🔥','⭐','🎯','🏆','⚡','🌟','💥','✨','🤾','💨','🦵','🛡️']`. "📋 복사":

```
🏸오늘 출석자 (N명)
(구분선)
🏸 이름 (닉네임)
...
(구분선)
⏰ 최종 입력 시간 : HH:MM
🔗 출석부 링크: {사이트 기본 URL}match.html
```

**짝배**: "코트 수" (기본 2) + "짝배 시작!". 최소 4명 ("최소 4명 이상 선택해야 합니다."), 그리고 코트 수×4명 이상("{c}코트에는 최소 {c*4}명 필요 (현재 {n}명)"). Fisher–Yates 셔플 → 4명씩 묶어 A[p0,p1] vs B[p2,p3]; 남는 사람 = 대기; 코트 수만큼 묶어 라운드 구성; 경기 코드는 첫 라운드 "{코트}", 이후 "{라운드}-{코트}". "짝배 결과 (N경기)" + "📋 복사" + "다시 섞기"; "1라운드" 배지 + "동시 진행 N경기"; 카드에 "코드 X", "코트 N", 수정 가능한 팀 라벨, "VS"; 주황색 "⏳ 대기" 상자. 복사:

```
🏸 짝배 결과
(구분선)
【1라운드】 (2경기 동시 진행)
[코드 1] 코트 1
  A팀: a / b
  B팀: c / d
...
⏳ 대기: x, y
(구분선)
```

#### 5. 통계 stats.html (`?tab=season|attendance|winrate|bbc|pairs|winner|eraser|highlights`)

"전체 통계". 탭: 📊 시즌 통계, 📅 출석률 순, 🏆 승률 순, ⭐ BBC 포인트 순, 👥 복식조 승률 순, 🏆 위너 순, 🧹 지우개 순, ✨ 하이라이트.

- "이름으로 검색..." 필터 + 지우기 버튼; "랭킹 기준" 펼침 (+ B-Love 범례 + "동적 보정승률 사용 (보정경기수 = 당일 최대경기수 ÷ 2)", "※ 시즌/주/월별은 일자별 등극 횟수로 집계"). 표 머리글 클릭 정렬 (오름/내림/해제), 줄무늬 행, 게스트 배지.
- **시즌 통계**: 카드 총 모임, 총 경기, 활동 멤버, 평균 경기/모임; 하이라이트 카드 MVP, 어깨 깡패, BBC Point, Magic Eraser, Strong Guy, Best Couple; 기간 전환 시즌/주간/월간 + 주차·월 버튼; 기간 요약; "📋 복사" ("📊 {시즌} - {기간} 하이라이트" ...).
- **출석률 순** (#, 이름, 가입일, 전체/월간/주간 — "경기 참가 날 수 ÷ 가입 후 평일 수 (주말·공휴일 제외)")
- **승률 순** (#, 이름, 경기, 승, 패, 승률, 보정승률, 월간, 주간)
- **BBC 포인트 순** ("BBC 포인트 = 승×3 + 패×1 (통산 기준)")
- **복식조 승률 순** (#, 복식 조, 경기, 승, 패, 승률, 보정승률, B-Love)
- **위너 순 / 지우개 순** (등극 횟수 ...)
- **하이라이트** (날짜 | 🏆 BBC Point | 🥇 어깨 깡패 | 👫 Best Couple | 🧹 Magic Eraser | 💪 Strong Guy)

#### 6. 분석 analysis.html

"경기 분석".

**"B-Love (궁합도 히트맵)"**: 슬라이더 "최소 경기 수" (기본 10), 설명 "멤버 간 복식조 보정승률 매트릭스 (셀: 보정승률% / 경기수)". 첫 열 고정, 대각선 "-". 셀 색: 50% 이상 → `rgb(255, 255−t·200, 255−t·200)`, t=(rate−50)/50 (흰색→빨강); 50% 미만 → `rgb(255−t·200, 255−t·100, 255)`, t=(50−rate)/50 (흰색→파랑). 범례 낮음…높음 "(0% ~ 50% ~ 100%)".

**"분석 대상:"** 입력 + datalist ("N경기"); 정확히 일치 → 이름 부분 일치 → 포함 순으로 매칭; 실패 시 "❌ 일치하는 멤버 없음".

**"승률 추이"** Chart.js 꺾은선: 승률 (%) #4ADE80 그라데이션 채움, tension .35; 보정승률 (%) #818CF8 점선 [6,4] 채움; 일별 승률 (%) #F59E0B 점선 [2,3] 채움 없음; 툴팁 index 모드 + "누적: N승 N패 / N경기"; 테마에 맞춘 색.

**"B-Love 궁합도 (거미줄)"** — "분석 대상을 중심으로 파트너와의 보정승률을 거미줄로 표현 (❤️ 5개 만점)": SVG 700×600, 가운데 노드 (남색→보라 방사형 그라데이션 + 글로우), 점선 안내 원, 파트너를 원 둘레에 배치하고 중심 거리 = 120 + 보정승률/100×140; 선 색 70 이상 #EF4444, 50 이상 #F59E0B, 30 이상 #6366F1, 그 외 #3B82F6; 선 굵기 2.5+보정승률/100×3; 불투명도 0.6+보정승률/100×0.4; 라벨에 이름, 보정승률%, 하트.

#### 7. 공지 notices.html / notice.html?id=

- "공지사항", "중요한 안내사항을 확인하세요", 톱니 버튼 → "관리자 인증" ("공지사항을 관리하려면 비밀번호를 입력하세요.", 취소/인증).
- "N개의 공지사항"; 카드: 작성자 첫 글자 아바타 (없으면 📢), "📌 고정", "팝업", 제목, 2줄 요약 (HTML 제거), "날짜 · 작성자"; 고정 글 먼저, 그다음 최신순. 관리자: 작성/수정/삭제 (제목, 내용, 고정, 팝업, 대상 리그).

#### 8. 관리 admin.html (관리자 전용; Django 관리 화면이 없어서 새로 추가)

- **시즌 관리**: 시즌 목록/추가/수정/삭제 (연도+계절을 고르면 날짜 자동 입력).
- **시즌 알림 문구**: 켜기/끄기 + 문구 (settings).
- **추가 휴일**: 날짜 목록 (settings.extra_holidays).
- **백업**: "JSON 백업 다운로드" (모든 테이블을 파일 하나로, `bbc-backup-YYYYMMDD.json`)와 "JSON 복원"(같은 형식, 확인 대화상자, id 기준 upsert).

### 디자인 시스템

- 8pt 간격, 글자 크기 12/14/16/20/24/28/36px, 모서리 8/12/16/알약형, ease `cubic-bezier(.4,0,.2,1)`, 터치 영역 44px 이상, 포커스 링 2px primary.
- **라이트**: primary #10B981, primary-dark #059669, secondary #14B8A6; success #2E7D32/#E8F5E9, danger #C62828/#FCE4EC, warning #E65100/#FFF3E0, info #1565C0/#E3F2FD; 배경 #F5F7FA; 카드 #fff. 하이라이트: gold #F57F17/#FFF8E1, green #2E7D32/#E8F5E9, blue #1565C0/#E3F2FD, purple #7B1FA2/#F3E5F5, orange #E65100/#FFF3E0.
- **다크 (기본값, GitHub 다크 스타일)**: primary #3FB950, secondary #2DD4BF, 배경 #0D1117, 카드 #1C2128, 호버 #262B35, 모달 #161B22, 입력 #0D1117/#30363D, 글자 #E6EDF3, 보조 글자 #8B949E, danger #F85149, warning #D29922, info #58A6FF, purple #A371F7; 상태·하이라이트 배경 = 같은 색상의 15% 투명도; 내비게이션 바 단색 #0D1117.
- 카드: 모서리 16 + 부드러운 그림자; 요약 카드 = 대문자 작은 라벨, 굵은 값, 오른쪽 위 흐린 아이콘, 모서리 파스텔 그라데이션.
- 표: 머리글 대문자 12px 보조색, 촘촘한 행, 줄무늬. `.badge-win`/`.badge-lose`. 진행 막대 6px 알약형 그라데이션. 순위 색 1위 #FFB300, 2위 #90A4AE, 3위 #FF8A65. 기간 배지 토탈/월간/주간은 서로 다른 색.
- 모든 곳에서 `prefers-reduced-motion`(움직임 줄이기 설정)을 존중.

### 계절 테마 (`body.season-<kind>`; 겨울은 전부 구현, 나머지 계절은 강조색만)

**겨울 고정 배경 레이어** (z-index −1, pointer-events none):

- 밤하늘 그라데이션 (다크 #03050c→#0d1430→#1b2749→#2c3c6b; 라이트 #35426e→#46568c→#8fa3cf) + 82% 11% 위치에 달빛
- 반짝이는 별 (7초)
- 흐릿한 오로라 띠 2개 (mix-blend screen, 26초/34초 흔들림)
- 전체 화면 사진 `assets/img/winter-wall.webp` 어둡게 + 위쪽 마스크 + 70초 패닝
- 인라인 SVG 육각 눈꽃 타일(300/210/400px) 눈 레이어 3장이 서로 다른 비선형 속도(44/62/54초)로 떨어지고, 돌풍 흔들림과 반짝임(주기 9/13/11초)
- 겨울에는 body 배경 투명

**"KING ZONE" 광고판** (body.season-winter 이고 화면 폭 1400px 이상일 때만; 좌우 여백에 고정, 본문은 좌우 300px 여백 확보):

- 금속 베젤 + 나사 4개, LED 헤더 "👑 KING ZONE" (금색 맥동) + 깜빡이는 초록 점
- 3:4 화면에 사진 (king-left/right.webp, 숨쉬듯 확대, 슬라이드마다 흐림→선명 포커스 인)
- 슬라이드 3장을 5초마다 크로스페이드, 마우스 올리면 멈춤, 클릭 가능한 점, 진행 막대, 하단 명판, 받침대 + 바닥 빛
- 슬라이드 테마 gold / ice / plum (그라데이션 글자 + 글로우)

**왼쪽 (고정 문구)**:

- "👑 KING OF KINGS" / "이번 시즌 왕좌의 주인은"
- "❄️ WINTER SEASON" / "{연도} 동계 시즌 하이라이트"
- "🏸 BBC LEAGUE" / "승부는 기록으로 남는다"
- 명판 "KING OF KINGS"

**오른쪽 (실시간)**:

- "🌟 TODAY'S HIGHLIGHT" → 오늘 BBC 포인트 1위, 보조 문구 "Today's BBC 9P · 승3 패0" (기본 "오늘 경기 준비 중")
- "🏆 WEEKLY MVP" (기본 "이번 주 최고 보정승률")
- "🏆 MONTHLY MVP" (기본 "이번 달 최고 보정승률")
- 보조 문구 "주간 MVP · 보정승률 76.7% · 12경기 · MM-DD ~ MM-DD"; 이름이 8자를 넘으면 글자 축소. 주/월은 `available_*[1]`이 있으면 그것(지난 기간), 없으면 `[0]`. 명판 "SEASON LIVE".
- API: `window.kingBillboard.setToday(names, sub)`, `setMvp('week'|'month', names, sub)`.

### 데모 데이터 (supabase/seed.sql)

- 오늘 전후 시즌 3개, 가상 멤버 24명 (한국 이름, 일부 닉네임, 리그 2개, 게스트 2명, 관리자 배지 1명), 평일 모임 약 40개, 모임마다 출석 6~14명, 경기 4~10개 무작위 (승자 21~25점, 패자 10~23점).
- `random()`을 쓰는 DO 블록으로 작성. 실존 인물 사용 금지.

### 품질

- `node --test` 대상: 보정승률, BBC 포인트, 출석률의 평일/공휴일 계산, 일자별 동적 어깨 깡패/Eraser, 복식조 집계, 기간 주차/월 번호, 파서 이름 매칭 + 중복 시그니처, 짝배 경기 코드.
- schema.sql은 여러 번 실행해도 안전하게 (`create ... if not exists`, `create or replace`, `drop policy if exists`).
- README: 사용자가 GitHub와 Supabase 대시보드에서 해야 할 일 (사용자 생성, 가입 끄기, 관리자 행 추가, URL/키 입력, Pages 켜기, Actions secrets 등록), `python -m http.server 8000`으로 로컬 실행하는 방법.

### 개발 단계

1. **1단계**: 저장소 뼈대, config, schema.sql (테이블, 뷰, RLS, RPC), seed.sql, README 설정 안내.
2. **2단계**: supabase.js, auth.js (로그인 오버레이, 관리자 모달), data.js (페이지네이션, 캐시, 필터), util.js.
3. **3단계**: stats.js, parser.js, pairing.js + 테스트 (`node --test` 실행).
4. **4단계**: layout.js + app.css (토큰, 두 테마, 내비게이션 바, 선택기, 토스트, 공지 팝업).
5. **5단계**: 대시보드, 멤버, 경기 입력, 출석&짝 페이지.
6. **6단계**: 통계, 분석, 공지, 관리 페이지.
7. **7단계**: 겨울 테마 + KING ZONE.
8. **8단계**: GitHub Actions (keepalive, test), 375px 모바일 확인, 움직임 줄이기, XSS 이스케이프, 빈 화면/오류 상태, 이 명세 대비 최종 점검표.

단계마다 동작하는 것과 내가 직접 해야 할 일을 보고하세요.

---

## 단계별 후속 프롬프트 (한 번에 안 될 때)

마스터 프롬프트를 먼저 보낸 뒤, 아래를 순서대로 보내세요.

1. `1단계만 진행하세요. schema.sql과 README의 직접 설정 안내를 보여주고 멈추세요.` → 이때 위의 「직접 해야 할 설정」 1~7번을 진행하세요.
2. `2단계를 진행하세요. Supabase 프로젝트와 사용자는 만들어 두었습니다. 실제로 로그인이 되는지 테스트하세요.`
3. `3단계를 진행하세요. 통계는 명세의 공식대로 정확히 구현하고, 테스트를 작성해서 node --test 결과를 보여주세요.`
4. `4단계와 대시보드 페이지를 진행하세요. 두 테마와 375px 폭에서 확인하세요.`
5. `멤버, 경기 입력, 출석&짝 페이지를 만드세요. 일괄 파싱은 placeholder 예시 문장으로 테스트하세요.`
6. `통계, 분석, 공지, 관리 페이지를 만드세요.`
7. `7단계(겨울 테마 + KING ZONE)를 진행하세요. 이미지는 assets/img에 임시 이미지로 넣어 주세요.`
8. `8단계를 진행한 뒤, GitHub Pages 배포 방법과 명세 대비 최종 점검표를 주세요.`

## (선택) 기존 사이트 기록 옮기기

동호회 동의를 받은 뒤에만 쓰세요. 원본 사이트의 `/api/members/`, `/api/games/seasons/`, 그리고 세션별 `/api/games/sessions/{id}/` JSON을 파일로 저장해 두었다면 아래 프롬프트를 보냅니다.

> admin.html에 "원본 데이터 가져오기" 섹션을 추가하세요. 원본 API 형태의 JSON 파일(멤버 목록, 시즌, games[].players[]와 attendances[]가 들어 있는 모임 상세)을 받아서 id를 매핑하고, 건수를 미리 보여준 뒤 RPC로 저장하세요. 여러 번 실행해도 안전해야 합니다: 이미 있는 모임과 경기(중복 시그니처 기준)는 건너뛰세요.

## 원본에서 확인하지 못한 부분 (ASSUMPTION 목록)

| 항목 | 프롬프트에 넣은 가정 |
|---|---|
| 리그 필터 기준 | 경기 4명이 모두 해당 리그일 때만 집계 |
| 동적 보정승률의 가상 승수 | K/2 (K = 당일 최대 경기수 ÷ 2) |
| Magic Eraser deleted_partners | 그날 함께 져 준 파트너 목록 |
| 기간 MVP 최소 경기수 | 5경기 이상 |
| 주/월 인덱스 | 시즌 시작일 기준 월요일 주차 1..N, 월 1..3 |
| 텍스트 파서 이름 매칭 | 전체 이름 → 성 뺀 이름 → 닉네임 순, 애매하면 미선택 |
| 인증 방식 (신규) | 동호회 공용 계정 1개 + 관리자 계정 1개 (원본은 로그인 없이 사내망에서만 접근) |
| 동점 점수 (신규) | 같은 점수는 저장 거부 (원본은 검증 없음) |

