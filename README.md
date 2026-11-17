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
- 로컬 테스트용 개인 아바타: `assets-local/avatar.vrm`(내 아바타), `assets-local/reference.vrm`(기준 아바타)에 넣으면 그 파일이 있을 때만 버튼이 생기고, 기억한 아바타가 없으면 `avatar.vrm`을 먼저 열어요. 이 폴더는 `.gitignore`로 저장소·배포에서 빠져요. 휴대폰·Pages에서는 **📂 VRM 불러오기**로 한 번 고르면 기억해요.

## v4: 입 따라하기 · OBS 출력 · 아바타 기억
v3은 git 태그 `v3`. Warudo 그래프 값은 그대로 두고 그 위에 더했어요.
- **입 따라하기 (설정 "입 따라하기")**: Warudo 공식(aa/ih/ou/oh)에 ee(에), 입 다물기, **한쪽 입꼬리**(미소·찡그림 좌우 따로)를 더함. 입만 따로 짧은 부드럽게(기본 0.06초), 입 반응 크기·입 모양 다양성 조절. "입 방식 = Warudo"면 Warudo와 같음.
- ARKit(Perfect Sync) 입 셰이프가 있는 아바타는 1:1로 연결. 없으면 VRM 입 표정 + 입 미소/찡그림 표정을 실행 중에 좌우로 나눠 씀(파일은 안 바뀜).
- 표정이 많은 아바타: 단축키를 Alt+] A…L ; Z…M , . 까지 늘림(40개).
- **OBS**: 배경(투명/초록/설정 색)과 해상도(1920×1080, 1280×720, 1080×1920, 창 크기)를 골라 주소 복사 → `?obs=1&res=1920x1080&bg=00ff00` (UI 숨김, 캔버스 고정 크기).
- **마지막 아바타 기억**: 불러온 VRM 파일은 이 기기 브라우저(IndexedDB)에 저장돼 다음에 자동으로 열려요(서버로 안 보냄). 로컬 버튼으로 연 파일도 기억.
- 테스트: `node --test tests/warudo.test.mjs`, `python3 tools/tools_v4.py` (가짜 블렌드쉐이프로 아·이·우·에·오·한쪽 미소·입 다물기 스크린샷, OBS 고정 해상도)

## v3: 실제 Warudo 자료로 맞춤
실제 Warudo 0.15.1 씬 파일(VRM 1.0 아바타 + MediaPipe, 온보딩 기본값)로 확인한 값으로 바꿨어요. v2는 git 태그 `v2`.
- MediaPipe 초기 매핑: eyeBlink 입력 0.3~0.7, jawOpen·mouthFunnel·mouthPucker 출력 −0.15~1 (실측)
- VRM 입 모양·깜빡임·시선: 실제 Warudo Blueprint 공식 그대로 (aa = jaw×1.2 − funnel, oh = funnel×3 + lowerDown×0.5, ih = smile×2×jaw, ou = pucker, ee 안 씀, 제약 4개)
- 부드럽게: Warudo 그래프 값(표정 0.2초, 회전·위치 0.6초) 기본, 이전 방식은 "부드럽게 방식"에서 선택
- 추적이 끊기면 0.4초/2초 InOutSine 전환, 대기 동작(깜빡임 1~10초 등) 실측 값
- 표정: VRM 1.0 이름 그대로, override로 Disable 플래그, 단축키 Alt+1…0 - = Q…P [ / Alt+Backspace (Warudo 온보딩과 같음)
- 립싱크 기본 끔 (실제 씬에 립싱크 노드 없음)
- Warudo 씬 가져오기: 실제 형식(enum 객체, 중첩 JSON, 노드 연결) 지원, 가져온 수 / 해당 없음 / 모름 보고
- 설정 옆 표시 **실측** = 실제 Warudo 씬 값과 같음. 남은 추정 항목은 [`docs/warudo-settings.md`](docs/warudo-settings.md) 끝에 정리
- 테스트: `python3 tools/tools_v3.py` (실제 씬 파일 `WARUDO_SCENE` 경로가 있으면 가져오기도 검사)

## v2: Warudo 설정 호환
설정 이름·기본값·단위를 3D 버튜버 프로그램 **Warudo**에 맞췄어요(설정마다 한국어 + 작은 영어 Warudo 이름, 근거 표시: 문서 / SDK / 추정 / 전용).
자세한 대응표와 근거: [`docs/warudo-settings.md`](docs/warudo-settings.md). v1은 git 태그 `v1`에 그대로 있어요.
- **얼굴 추적 에셋 (MediaPipe Tracker)**: Mirrored Tracking, BlendShape Sensitivity, 개별 블렌드쉐이프 매핑(입력 범위 → 출력 범위), Head Movement/Rotation Intensity, Body Movement Intensity, Body Rotation Type(None/Normal/Inverted/Custom), Eye Movement Intensity, Eye Blink Sensitivity, Linked Eye Blinking 등
- **얼굴 추적 Blueprint 옵션**: BlendShape Mapping(자동/VRM/ARKit), 머리·몸 움직임, Idle Head Animation(자동 깜빡임·눈·머리), Look At, Lip Sync(끔/추적 끊길 때만/항상)
- **Character**: 표정(레이어, 0.4초 페이드, Is Binary, Trigger Conditions, Disable Eye Blink/Mouth/Brow Tracking), Look At IK, Breathing/Swaying
- **Camera**: Field Of View 35, 투명 배경, 크로마키, Brightness/Contrast/Vibrance
- **설정 파일**: 💾 내보내기(JSON) · 📥 가져오기(우리 JSON 또는 Warudo 씬 .json)
- Warudo에 없는 기능(One-Euro 부드러움, 표정 자동 인식, 신남 감지, 팔 내림, 조명, 카메라 구도)은 "우리 전용"으로 따로 둠. 표정 자동 인식은 Warudo 기본에 없어서 기본 꺼짐.
- 테스트: `node --test tests/warudo.test.mjs` (매핑 공식 등 단위 테스트), `python3 tools/tools_v2.py` (헤드리스 브라우저)

## 마이크 (선택)
**🎤 마이크 켜기**: 픽셀 버전과 같은 신남 감지(음량·음높이·변동) + 음량 립싱크.
- 립싱크 (Warudo Lip Sync): 끔(기본, 실제 Warudo 씬과 같음) / 추적 끊길 때만 / 항상
- 신나면 통통 튀기, 신나면 웃음 표정

## 단축키 · 주소 옵션
- 표정: Alt+1…0, Alt+- = Q W E R T Y U I O P [ 그 뒤 ] A…L ; Z…M , . (숫자·-·=는 Alt 없이도) · Backspace 모두 끄기 · h 클린 뷰 · Esc/더블탭 해제
- 마우스 휠/두 손가락으로 확대, 휴대폰은 ⚙ 버튼으로 설정 창 접기
- `?demo=1` 카메라 없이 동작 순환 · `?clean=1` 클린 뷰 · `?bg=00ff00` 배경색(크로마키) · `?bg=transparent` 투명 · `?mirror=1` Mirrored Tracking 켜기 · `?ws=…` 설정 묶음(OBS 주소 복사 시 자동) · `?frame=full` 전신 · `?zoom=1.3&y=0.1&x=0&rot=10` 카메라 · `?autostart=1` 카메라 자동 시작 · `?obs=1` OBS용(클린+투명) · `?res=1920x1080` 캔버스 고정 해상도

## OBS에서 쓰기
1. 위처럼 로컬 서버를 켜고 브라우저에서 화면·카메라 설정을 맞춘 뒤 **📋 OBS 브라우저 소스 주소 복사**
2. OBS → 소스 추가 → **브라우저** → URL 붙여넣기, 폭/높이 1920×1080 등. 배경은 투명으로 나옵니다.
3. OBS 브라우저 소스 안에서 카메라를 직접 쓰려면 OBS를 `--enable-media-stream` 옵션으로 실행해야 해요. 더 간단한 방법: 크롬 창에서 추적을 돌리고 OBS **창 캡처** + 크로마키(`?bg=00ff00&clean=1`)로 쓰기.
※ 다른 프로그램(OBS 등)이 카메라를 쓰고 있으면 브라우저에서 카메라가 안 열릴 수 있어요.

## 구성
- `index.html`, `style.css`, `js/app.js`(아바타·추적·UI), `js/warudo.js`(Warudo 호환 공식·설정 스키마·씬 가져오기), `js/tracker.js`(MediaPipe), `js/filter.js`(One-Euro), `js/mic.js`(픽셀 버전 기반 + 립싱크 음량)
- `lib/` three.js 0.187.0, @pixiv/three-vrm 3.5.5, @mediapipe/tasks-vision 0.10.14 (각 라이선스 포함) · `models/face_landmarker.task`
- `tools/` 헤드리스 테스트 스크립트(playwright) · `tests/` 단위 테스트 · `screens/` 확인용 스크린샷(v1은 `screens/v1/`) · `docs/` Warudo 대응표
