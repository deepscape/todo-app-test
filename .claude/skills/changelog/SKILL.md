---
name: "changelog"
description: "Record this session's work (prompt, changed files, test results) into CHANGELOG.md and refresh the recent-changes summary in CLAUDE.md. Use when the user runs /changelog or explicitly asks to log/record this work."
argument-hint: "\"짧은 작업 요약\" (예: /changelog \"reorder API 구현\")"
metadata:
  author: "project"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

이 값이 이번 항목의 한 줄 요약이다. 비어 있으면 방금까지의 대화에서 스스로
요약 문구를 만들어라 (예: "GET /api/tickets/:id 상세 조회 구현").

## 목적

이 skill은 사용자가 명시적으로 `/changelog`를 실행했을 때만 동작한다. hook이
아니므로 코드를 수정할 때마다 자동으로 실행되지 않는다 — 매 커밋마다 자동
기록을 원한다면 이 skill이 아니라 git hook을 별도로 구성해야 한다는 점을
사용자가 물으면 안내한다.

## 실행 절차

### 1. 현재 컨텍스트 수집

다음을 순서대로, 병렬로 실행 가능한 것은 한 번에 실행해 수집한다:

```bash
git branch --show-current
git status --porcelain=v1
git diff --stat
git diff --stat --staged
```

- **브랜치명**: `git branch --show-current` 결과. 빈 문자열이면(detached
  HEAD) `(no branch)`로 표기한다.
- **날짜/시간**: 시스템 프롬프트의 `currentDate`(또는 `date '+%Y-%m-%d %H:%M'`
  실행 결과)를 사용한다. 절대 임의로 지어내지 않는다.
- **변경 파일**: `git diff --stat`(unstaged)과 `git diff --stat --staged`
  결과를 합쳐 파일별 `+added, -removed` 라인 수를 얻는다. 같은 파일이 양쪽에
  모두 있으면 합산한다. 신규 파일(untracked)은 `git status --porcelain=v1`의
  `??` 항목으로 찾아 `git diff --stat -- <file>`이 0을 보고하면
  `wc -l < <file>`로 전체 라인 수를 `+N`으로 표기한다.
- 커밋되지 않은 변경이 전혀 없다면(작업 트리가 clean) 사용자에게 알리고
  "그래도 이번 대화 내용만으로 기록할지" 확인한다 — 그 경우 Files
  Modified 섹션은 생략한다.

### 2. 변경 분류 (Added / Modified / Removed)

파일별 diff 요약과 지금까지의 대화 맥락을 근거로 각 파일을 다음 중 하나로
분류한다:
- **Added**: 새로 생성된 파일 (untracked, 또는 `git diff --staged
  --diff-filter=A`)
- **Modified**: 기존 파일의 내용 변경
- **Removed**: 삭제된 파일 (`git diff --diff-filter=D`)

각 항목은 "무엇을 했는지"를 한 줄로 설명한다 (예: "**Added**: 티켓 완료
처리 API (`app/api/tickets/[id]/complete/route.ts`)"). 파일 경로는 반드시
백틱으로 감싼다. 단순 포맷팅/공백 변경만 있는 파일은 굳이 나열하지 않아도
된다 — 의미 있는 변경에 집중한다.

### 3. 사용자 프롬프트 재구성

"@ Prompt" 절에는 이번 작업을 촉발한 **사용자의 실제 요청**을 요약해서
인용한다. `$ARGUMENTS`가 있으면 그것을 요약 힌트로 우선 쓰되, 실제 인용문은
대화 맥락에서 사용자가 입력한 문장(들)을 재구성한다 — 지어내지 말고, 이번
대화 턴들 중 이 코드 변경을 요청한 실제 발화를 근거로 한다. 여러 프롬프트가
누적된 세션이면 핵심 요청 1~2개로 압축한다.

### 4. 테스트 결과 수집 (실행하지 않음)

`npm run test`를 직접 실행하지 않는다. 대신 이번 대화에서 이미 테스트를
실행한 기록이 있으면 그 결과(통과/실패 개수, 실패 시 케이스명)를 요약해
반영한다. 이번 세션에 테스트 실행 기록이 전혀 없으면 `테스트: 실행 기록 없음
(N/A)`로 표기한다 — 이 skill이 임의로 테스트를 돌려서 시간을 쓰지 않는다.

### 5. CHANGELOG.md에 항목 추가

`CHANGELOG.md`를 읽고, 상단의 안내 주석(`<!-- 새 항목은 이 줄 아래에
추가한다 -->`) 바로 다음에 새 항목을 **삽입**한다 (파일 맨 앞, 최신순).
기존 항목은 건드리지 않는다. 형식은 정확히 다음을 따른다:

```markdown
## [브랜치명] - YYYY-MM-DD HH:MM

### @ Prompt
> "사용자가 입력한 요청 요약"

### ✅ Changes
- **Added**: 새 기능 설명 (`파일경로`)
- **Modified**: 수정 내용 설명 (`파일경로`)
- **Removed**: 삭제 내용 설명 (`파일경로`)

### Files Modified
- `파일경로1` (+12, -3 lines)
- `파일경로2` (+40, -0 lines)

### 테스트
- ✅ 통과 42/42 (또는) ❌ 실패 2건: `케이스명` (또는) 실행 기록 없음 (N/A)

---
```

Added/Modified/Removed 중 해당 사항이 없는 항목은 줄 자체를 생략한다.
Files Modified가 비어 있으면(작업 트리 clean) 그 섹션 전체를 생략한다.

### 6. CLAUDE.md의 "최근 변경사항" 섹션 갱신

`CLAUDE.md`에서 `<!-- CHANGELOG-RECENT:START -->`와
`<!-- CHANGELOG-RECENT:END -->` 사이 블록을 찾는다. 이 마커가 없으면
"## 최근 변경사항 (최근 7-14일)" 섹션과 마커 블록을 "## Git 워크플로우"
섹션 바로 다음, 문서 끝의 `---` 구분선 앞에 새로 만든다 (기존 섹션 구조를
보존하며 삽입 — 다른 내용을 지우지 않는다).

이제 막 CHANGELOG.md에 추가한 항목을 포함해, `CHANGELOG.md`의 항목들 중
**날짜가 오늘 기준 14일 이내인 것만** 골라 간결한 불릿 목록으로 그 블록
안쪽을 교체한다. 형식:

```markdown
<!-- CHANGELOG-RECENT:START -->
<!-- /changelog 명령이 이 블록 안쪽만 자동으로 갱신한다. 직접 수정해도
     다음 /changelog 실행 시 덮어써진다. 전체 이력은 CHANGELOG.md 참조. -->
- **YYYY-MM-DD** [브랜치명] 한 줄 요약 — 주요 변경 파일 1~2개
- **YYYY-MM-DD** [브랜치명] 한 줄 요약
<!-- CHANGELOG-RECENT:END -->
```

- 최신순으로 정렬한다.
- 14일을 넘긴 CHANGELOG.md의 과거 항목은 이 블록에서 자연히 빠진다(삭제되는
  것이 아니라 CHANGELOG.md에는 계속 남아있고, 이 요약 블록에서만 제외).
- 이 블록 바깥의 CLAUDE.md 나머지 내용은 절대 수정하지 않는다.

### 7. 완료 보고

사용자에게 다음을 짧게 보고한다:
- CHANGELOG.md에 추가된 항목의 제목 줄(`## [브랜치명] - 날짜`)
- CLAUDE.md 최근 변경사항 블록이 몇 개 항목으로 갱신됐는지
- Files Modified로 집계된 파일 수와 총 +added/-removed 라인 수

## 주의사항

- 이 skill은 git 커밋을 만들지 않는다 — CHANGELOG.md/CLAUDE.md 파일만
  수정한다. 커밋은 사용자가 별도로 요청할 때 진행한다.
- `.env`, 비밀키 등 민감 파일이 diff에 포함되어 있어도 파일 경로만
  기록하고 내용은 인용하지 않는다.
- 한 세션에서 여러 번 `/changelog`가 실행되면 매번 새 항목을 추가한다 —
  기존 항목을 합치거나 덮어쓰지 않는다.
