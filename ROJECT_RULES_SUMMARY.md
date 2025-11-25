# Project Rules Summary — Document Visualization Engine (Phase 1)

## 1. 프로젝트 개요
문서 시각화 엔진은 텍스트 기반 원본 문서(보고서, 제안서, 교육자료 등)를 구조화(섹션/컨테이너/모듈)하고 WYSIWYG 레이아웃으로 자동 제안하여 사용자가 손쉽게 편집·배포할 수 있게 하는 도구이다. 입력: 텍스트/마크다운/HTML/기존 문서. 출력: 편집 가능한 레이아웃(브라우저 기반 SPA) 및 배포용 HTML/CSS.

## 2. 목표 / 비목표
목표:
- 자동 레이아웃 제안(자동 초안) + 사람이 편집하는 워크플로우
- 에디트 가능성 우선 (모든 자동배치는 수정 가능)
- Living Grid: 섹션/컨테이너/셀 기반의 재배치 가능한 그리드
- 섹션(폭/정렬)과 컨테이너(중첩/반응형) 규칙 구현
- JSON 기반 저장 및 전체 복원(스냅샷/버전)
- 마인드맵(.mm)을 설계 원본으로 사용

비목표(1차):
- 완전한 상업용 WYSIWYG 에디터의 모든 UX 디테일 구현(일부 간소화)
- 고도화된 서버사이드 렌더링 최적화(초기에는 클라이언트 SPA 우선)
- 모든 문서 포맷 완전 지원(우선 텍스트/MD/간단 HTML 중심)

## 3. 핵심 개념 & 용어 정리
- Section
  - 정의: 페이지 상의 최상위 블록(100% 폭 또는 고정폭)
  - 예시: hero 섹션, 본문 섹션(500px center)
  - 주의: 내부 컨테이너 여백과 외부 여백 충돌 시 상위 기준 적용

- Container
  - 정의: 폭 제어 및 그룹화 단위(max-width, 반응형)
  - 예: article container, two-column container
  - 주의: 중첩 규칙(부모-자식 우선순위) 명시 필요

- Grid / Cell / Flex
  - 정의: 가로 분할(Grid) 또는 방향 기반 정렬(Flex) 단위
  - 예: 3-column grid, flex row with gaps
  - 주의: Cell 비율 자동조정, gap 관리 필요

- Module
  - 정의: 재사용 가능한 콘텐츠 블록 (text/image/video/card/table)
  - 예: Title(Heading), Paragraph, Image(cover)
  - 주의: 모듈별 사이즈 제약/비율 유지 규칙 명시

- Card / Template / Composition
  - Card: 반복 가능한 모듈 묶음(리스트, 갤러리)
  - Template: 미리 정의된 레이아웃 조합
  - 조합: 템플릿으로부터 섹션/컨테이너 생성

- Living Grid
  - 정의: 사용자가 실시간으로 조정 가능한 그리드. 자동/수동 혼합 제어.
  - 주의: 자동 배치와 수동 조작의 충돌 해결 규칙 필요

- Auto Layout
  - 정의: 콘텐츠 속성(텍스트 길이, 이미지 비율)에 따라 자동 크기/정렬을 결정하는 알고리즘
  - 주의: 우선순위 규칙(상위 여백 우선 등) 필요

## 4. UI/UX 원칙
- 직관성 우선: 드래그/드롭과 속성 패널의 역할을 명확히 구분
- 모드 분리: Edit Mode(편집) vs View Mode(미리보기)
- 직접 조작은 빠르게, 세부 설정은 속성 패널에서
- 편집 인터랙션: 추가/삭제/분할/병합/이동 (컨테이너·섹션 단위)
- 복구 가능성: 작업 전후 스냅샷, 되돌리기(Undo/Redo), 버전화

## 5. 데이터/레이아웃 구조 개요
추천 구조(개략):
{
  "page": {
    "id": "page-1",
    "sections": [
      {
        "id":"sec-1",
        "width": "100% | 800px",
        "align": "center|left|right",
        "containers":[
          {
            "id":"c-1",
            "type":"grid|flex|container",
            "props": { "maxWidth": 800, "gap": 16 },
            "rows": [ /* optional */ ],
            "cells":[ { "id":"cell-1", "modules":[ ... ] } ]
          }
        ]
      }
    ]
  }
}
- 방향성: page → sections[] → containers[] → rows/cells[] → modules[]
- layout-schema.json으로 세부 스키마 정의(타입, 제약, defaults 포함)

## 6. 작업 플로우(Workflow)
1. 입력: 원본 문서(텍스트/MD/HTML)
2. 분석(Parser): 문단·제목·이미지·테이블 등 의미 블록 추출
3. 구조화: 섹션/컨테이너/모듈 매핑(규칙 기반 + AI 보조)
4. 시각화 초안: Layout Engine이 자동 제안
5. 편집: 사용자가 WYSIWYG 에디터에서 수정(속성 패널/직접 조작)
6. 검증: 스냅샷/테스트, 충돌 해결
7. 저장/배포: JSON 저장 → HTML/CSS 익스포트

AI 역할 예시:
- 자동 초안 생성(레이아웃 제안)
- 모듈 분류(텍스트/이미지/표 판별)
- 제안 랭킹(여러 레이아웃 후보 제시)
사람의 역할: 검토·수정·최종 디자인 결정

## 7. 코드 작성 시 규칙
- 네이밍: 영어 파일/디렉토리명 사용 (e.g., src/, layout/, docs/)
- 버전 관리: semantic-ish tagging (v0.1, v0.2), 스냅샷은 2_snapshots/{timestamp}.json
- 실험/프로토타입 분리: 3_projects/{engine_v0, engine_experiment}
  - engine_experiment: 빠른 PoC
  - engine_v0: 안정화된 코드
- 주석: 모듈 헤더에 목적/입력/출력/제약 간단 명시
- 테스트: 각 모듈은 단위 테스트(파서, 레이아웃 규칙, 직렬화)
- 문서화: docs/ARCHITECTURE.md, docs/API.md 유지