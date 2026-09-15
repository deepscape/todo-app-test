# Changelog

이 문서는 `/changelog` 명령으로 기록되는 작업 이력이다. 각 항목은 하나의
프롬프트 기반 작업 세션에 대응하며, 최신 항목이 파일 맨 위에 온다.

<!-- 새 항목은 이 줄 아래에 추가한다. 형식은 .claude/skills/changelog/SKILL.md 참조. -->

## [feat/changelog-skill] - 2026-09-15 18:19

### @ Prompt
> "매번 프롬프트 입력 후 코드를 수정하고 git에 반영할 때, 프롬프트 내용/변경
> 파일/날짜/브랜치/테스트 결과를 자동으로 기록하는 시스템을 만들어줘.
> CHANGELOG.md에 상세 이력, CLAUDE.md에 최근 7-14일 요약, /changelog "요약"
> 명령어로 실행, hook이 아닌 Skill 방식으로 구현."

### ✅ Changes
- **Added**: `/changelog` 명령 skill — 작업 이력을 CHANGELOG.md에 기록하고
  CLAUDE.md 최근 변경사항 블록을 갱신 (`.claude/skills/changelog/SKILL.md`)
- **Added**: 작업 이력 전체를 누적하는 changelog 파일 (`CHANGELOG.md`)
- **Modified**: "최근 변경사항" 섹션과 자동 갱신 마커 블록 추가 (`CLAUDE.md`)

### Files Modified
- `.claude/skills/changelog/SKILL.md` (+152, -0 lines)
- `CHANGELOG.md` (+6, -0 lines)
- `CLAUDE.md` (+8, -0 lines)

### 테스트
- 실행 기록 없음 (N/A) — 문서/skill 정의 변경으로 코드 테스트 대상 없음

---
