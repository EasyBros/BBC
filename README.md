# BBC 불광 배드민턴 클럽

배드민턴 복식 리그 기록 대시보드입니다. 프런트엔드는 GitHub Pages 정적 사이트로, 인증과 데이터베이스는 Supabase로 운영합니다.

GitHub 저장소: [EasyBros/BBC](https://github.com/EasyBros/BBC)  
Pages 주소: `https://easybros.github.io/BBC/`

## Supabase 준비

1. Supabase 프로젝트를 만들고 SQL Editor에서 `supabase/schema.sql`을 실행합니다.
2. 필요하면 데모 데이터 `supabase/seed.sql`을 실행합니다. 실사용 DB에서는 실행하지 않아도 됩니다.
3. Authentication → Users에서 `club@bbc.local`, `admin@bbc.local` 사용자를 만들고 Auto Confirm을 켭니다. 실제 비밀번호는 안전하게 보관하고 공유 범위를 제한하세요.
4. 아래 SQL로 관리자 사용자를 지정합니다.

```sql
insert into public.app_admins(user_id)
select id from auth.users where email = 'admin@bbc.local'
on conflict do nothing;
```

5. Authentication → Sign In / Providers에서 새 사용자 가입을 끕니다.
6. Project Settings → API에서 Project URL과 Publishable key(구 anon key)를 확인합니다. service_role/secret key는 사용하지 마세요.
7. `assets/js/config.js`의 `SUPABASE_URL`과 `SUPABASE_PUBLISHABLE_KEY`를 설정합니다.

## GitHub Pages 배포

1. `EasyBros/BBC` 저장소의 `main` 브랜치에 push합니다.
2. Settings → Pages에서 Deploy from a branch, `main` / `(root)`를 선택합니다.
3. 사이트 주소는 `https://<사용자>.github.io/<저장소>/` 형식입니다.
4. 권장: 저장소 Actions secrets에 `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`를 등록해 keepalive 워크플로에서 사용합니다.

GitHub Pages 저장소는 공개될 수 있습니다. 프런트엔드의 Supabase publishable key는 공개용이며, 실제 데이터 권한은 RLS와 Auth로 제한해야 합니다.

## 로컬 실행

저장소 루트에서 다음 명령을 실행하고 `http://localhost:8000/`으로 접속합니다. ES 모듈은 `file://` 주소에서 실행되지 않습니다.

```bash
python -m http.server 8000
```

## 백업과 보안

관리자 화면의 JSON 백업을 주기적으로 내려받으세요. 브라우저 코드, 커밋, 이슈에 service_role/secret key나 실제 비밀번호를 넣지 마세요. `BBC_site_prompt.md`에는 전체 화면 및 동작 명세가 있습니다.

