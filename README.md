# 3D VTuber (VRM) — 웹페이지 버튜버
픽셀 VTuber(퇴근여우)의 3D 버전입니다. 브라우저만으로 VRM 아바타를 웹캠 얼굴 추적으로 움직입니다.
설치·빌드 없이 정적 파일만으로 동작하고, 라이브러리와 얼굴 인식 모델을 폴더 안에 넣어 두어 **인터넷 없이도** 돌아갑니다(GitHub Pages에도 그대로 올릴 수 있음).
카메라 영상·마이크 소리·VRM 파일은 **브라우저 밖으로 전송되지 않습니다**.

## 실행
```
cd vrm-vtuber
python3 -m http.server 8765
```
→ http://localhost:8765 접속 → **▶ 카메라 시작**
- 카메라는 `localhost` 또는 **HTTPS** 주소에서만 켜집니다. 휴대폰(안드로이드 크롬)에서는 GitHub Pages 같은 HTTPS 주소로 여세요.
- 처음 켜고 1.5초 뒤 자동으로 **정면 보정**합니다. 정면을 보고 무표정으로 있다가, 어긋나면 **🎯 정면 보정**을 다시 누르세요(저장됨).

## 아바타
- 기본: `assets/FirstundHoodieBoy_v2_VRM0.vrm` (VRM 0.x)
- **📂 VRM 불러오기** 또는 화면에 `.vrm` 파일을 끌어다 놓기 → VRM 0.x / 1.0 모두 지원. 마지막으로 고른 아바타는 기기 안(IndexedDB)에 기억합니다. **기본 아바타** 버튼으로 되돌리기.
- 주소에 `?vrm=경로.vrm` 로 같은 폴더의 다른 파일을 열 수도 있어요. `?default=1` 은 기억한 아바타 무시.

## v2: Warudo 설정 호환
설정 이름·기본값·단위를 3D 버튜버 프로그램 **Warudo**에 맞췄어요(설정마다 한국어 + 작은 영어 Warudo 이름, 근거 표시: 문서 / SDK / 추정 / 전용).
자세한 대응표와 근거: [`docs/warudo-settings.md`](docs/warudo-settings.md). v1은 git 태그 `v1`에 그대로 있어요.
- **얼굴 추적 에셋 (MediaPipe Tracker)**: Mirrored Tracking, BlendShape Sensitivity, 개별 블렌드쉐이프 매핑(입력 범위 → 출력 범위), Head Movement/Rotation Intensity, Body Movement Intensity, Body Rotation Type(None/Normal/Inverted/Custom), Eye Movement Intensity, Eye Blink Sensitivity, Linked Eye Blinking 등
- **얼굴 추적 Blueprint 옵션**: BlendShape Mapping(자동/VRM/ARKit), 머리·몸 움직임, Idle Head Animation(자동 깜빡임·눈·머리), Look At, Lip Sync(끔/추적 끊길 때만/항상)
- **Character**: 표정(레이어, 0.4초 페이드, Is Binary, Trigger Conditions, Disable Eye Blink/Mouth/Brow Tracking), Look At IK, Breathing/Swaying
- **Camera**: Field Of View 35, 투명 배경, 크로마키, Brightness/Contrast/Vibrance
- **설정 파일**: 💾 내보내기(JSON) · 📥 가져오기(우리 JSON 또는 Warudo 씬 .json — 같은 이름의 값을 찾아서 가져옴, 실제 씬 파일 검증 전)
- 표정 단축키: 1 모두 끄기 · 2~9 표정 켜기/끄기 (Alt+숫자도 됨)
- Warudo에 없는 기능(One-Euro 부드러움, 표정 자동 인식, 신남 감지, 팔 내림, 조명, 카메라 구도)은 "우리 전용"으로 따로 둠. 표정 자동 인식은 Warudo 기본에 없어서 기본 꺼짐.
- 테스트: `node --test tests/warudo.test.mjs` (매핑 공식 등 단위 테스트), `python3 tools/tools_v2.py` (헤드리스 브라우저)

## 마이크 (선택)
**🎤 마이크 켜기**: 픽셀 버전과 같은 신남 감지(음량·음높이·변동) + 음량 립싱크.
- 립싱크 (Warudo Lip Sync): 끔 / 추적 끊길 때만(기본) / 항상
- 신나면 통통 튀기, 신나면 웃음 표정

## 단축키 · 주소 옵션
- 1 표정 끄기 · 2~9 표정 · h 클린 뷰 · Esc/더블탭 해제
- 마우스 휠/두 손가락으로 확대, 휴대폰은 ⚙ 버튼으로 설정 창 접기
- `?demo=1` 카메라 없이 동작 순환 · `?clean=1` 클린 뷰 · `?bg=00ff00` 배경색(크로마키) · `?bg=transparent` 투명 · `?mirror=1` Mirrored Tracking 켜기 · `?ws=…` 설정 묶음(OBS 주소 복사 시 자동) · `?frame=full` 전신 · `?zoom=1.3&y=0.1&x=0&rot=10` 카메라 · `?autostart=1` 카메라 자동 시작 · `?obs=1` OBS용(클린+투명)

## OBS에서 쓰기
1. 위처럼 로컬 서버를 켜고 브라우저에서 화면·카메라 설정을 맞춘 뒤 **📋 OBS 브라우저 소스 주소 복사**
2. OBS → 소스 추가 → **브라우저** → URL 붙여넣기, 폭/높이 1920×1080 등. 배경은 투명으로 나옵니다.
3. OBS 브라우저 소스 안에서 카메라를 직접 쓰려면 OBS를 `--enable-media-stream` 옵션으로 실행해야 해요. 더 간단한 방법: 크롬 창에서 추적을 돌리고 OBS **창 캡처** + 크로마키(`?bg=00ff00&clean=1`)로 쓰기.
※ 다른 프로그램(OBS 등)이 카메라를 쓰고 있으면 브라우저에서 카메라가 안 열릴 수 있어요.

## 구성
- `index.html`, `style.css`, `js/app.js`(아바타·추적·UI), `js/warudo.js`(Warudo 호환 공식·설정 스키마·씬 가져오기), `js/tracker.js`(MediaPipe), `js/filter.js`(One-Euro), `js/mic.js`(픽셀 버전 기반 + 립싱크 음량)
- `lib/` three.js 0.187.0, @pixiv/three-vrm 3.5.5, @mediapipe/tasks-vision 0.10.14 (각 라이선스 포함) · `models/face_landmarker.task`
- `tools/` 헤드리스 테스트 스크립트(playwright) · `tests/` 단위 테스트 · `screens/` 확인용 스크린샷(v1은 `screens/v1/`) · `docs/` Warudo 대응표
