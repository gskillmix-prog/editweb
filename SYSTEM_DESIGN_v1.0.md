# SYSTEM_DESIGN_v1.0 — MetaLayout 문서 시각화 엔진

## 1. 목적
이 문서는 MetaLayout 레포의 1차 시스템 설계 문서다. 설계 기준은
- 마인드맵 원본: [`MetaLayout/1_mindmaps`](MetaLayout/1_mindmaps/)
- 정책 문서: [`MetaLayout/0_docs/ROJECT_RULES_SUMMARY.md`](MetaLayout/0_docs/ROJECT_RULES_SUMMARY.md), [`MetaLayout/0_docs/ENGINE_CONCEPTS_OVERVIEW.md`](MetaLayout/0_docs/ENGINE_CONCEPTS_OVERVIEW.md)

## 2. 아키텍처 레이어 (정의 및 책임)
1. Client App (SPA)
   - 역할: 에디터 UI(좌측 패널/중앙 캔버스/우측 속성 패널), 미리보기 토글, 단축키/드래그 이벤트
2. State & Editor Engine
   - 역할: 전역 상태(Store), Undo/Redo, 선택·그룹 관리
3. Layout Engine
   - 역할: Section / Container / Grid/Flex 렌더링 규칙, Spacing 충돌 해소
4. Module Engine
   - 역할: Text/Image/Video/Table/Composite 렌더러 및 속성 적용
5. Storage & Versioning
   - 역할: JSON 스키마 기반 저장, 스냅샷(시간+메모), Draft/Published 관리
6. Exporter
   - 역할: JSON → 배포용 HTML/CSS 변환

(각 레이어는 `layout-schema.json`과 명확한 인터페이스로 연결)

## 3. 데이터 모델(요약)
page: {
  id: string,
  sections: [
    {
      id: string,
      width: "100%" | "NNNpx",
      align: "center"|"left"|"right",
      padding?: {top,right,bottom,left},
      margin?: {...},
      containers: [
        {
          id: string,
          type: "container"|"grid"|"flex",
          props: { maxWidth?: number, gap?: number, cols?: number, direction?: "row"|"column" },
          cells?: [ { id: string, modules: Module[] } ],
          modules?: Module[]
        }
      ]
    }
  ]
}
Module 예시: { id, type: "text"|"image"|..., props: { text?, src?, ratio?, align? } }

정식 스키마는 `/layout-schema.json`로 추가.

## 4. 스냅샷·버전 전략
- 스냅샷 위치: `MetaLayout/2_snapshots/` (파일명: YYYYMMDD_HHMMSS__desc.json)
- 스냅샷 내용: 전체 page JSON + 메타(작성자, 메모, 변경요약)
- 브랜치 전략: master(안정) / snapshot / test

## 5. 초기 구현 목표 (MVP)
1. parser: 텍스트/Markdown → 섹션/모듈 분해 (단위: paragraphs, headings, images)
2. layout renderer: JSON → DOM 미리보기(에디터 캔버스)
   - 참조 프로토타입: [`MetaLayout/3_projects/engine_v0/src/editor.html`](MetaLayout/3_projects/engine_v0/src/editor.html)
3. 저장/로드: 로컬 파일(JSON)과 스냅샷 저장
4. 기본 모듈: Heading, Paragraph, Image
5. Spacing 규칙: 상위 우선(Section 기준) 구현

## 6. 인터페이스(간단)
- API: 
  - loadPage(json) -> renders canvas
  - exportPage() -> JSON
  - snapshot(name, note) -> saves JSON + meta
- Events:
  - onSelectionChanged(elemId)
  - onPropertyChange(elemId, prop, value)

## 7. 로드맵 & 우선 작업 항목
- A. layout-schema.json 스펙 작성 (우선)
- B. 기본 parser 구현 + unit tests
- C. canvas renderer(v0) — drag/select 기본
- D. snapshot 시스템 구현
- E. 속성 패널 기본 UI

## 8. 참조 파일
- 설계 가이드: [`MetaLayout/0_docs/ENGINE_CONCEPTS_OVERVIEW.md`](MetaLayout/0_docs/ENGINE_CONCEPTS_OVERVIEW.md)
- 규칙 요약: [`MetaLayout/0_docs/ROJECT_RULES_SUMMARY.md`](MetaLayout/0_docs/ROJECT_RULES_SUMMARY.md)
- 프로토타입: [`MetaLayout/3_projects/engine_v0/src/editor.html`](MetaLayout/3_projects/engine_v0/src/editor.html)

## 9. 다음 단계 (B단계 제안)
- B1: `layout-schema.json` 작성 및 커밋
- B2: parser 유닛 테스트 추가 (tests/parser.test.js)
- B3: 초기 renderer에 모듈 바인딩(Heading/Paragraph/Image) 적용
