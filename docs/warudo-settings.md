# Warudo 설정 대응표

이 프로그램의 설정을 Warudo와 같은 이름·기본값·단위로 맞춘 기록이에요. 마지막 확인: 2026-11-11 (KST).

**v3**: 실제 Warudo 0.15.1 (Steam 빌드 24066794) 씬 파일 `Avatar_MediaPipe_Reference.json` (VRM 1.0 아바타, MediaPipe 얼굴 추적, 온보딩 기본값, 수동 보정 없음)과 Warudo 화면 캡처 3장으로 확인했어요. 개인 자료라 저장소에는 넣지 않았어요.

## 근거 표시
- **실측**: 실제 Warudo 씬 파일에 저장된 값과 같음을 확인. **값(기본값·범위)만 확인**이고, 계산 방식은 따로 적힌 곳(아래 "확인된 계산")만 확인된 거예요.
- **문서**: Warudo 공식 문서(docs.warudo.app). 원본: https://github.com/HakuyaLabs/warudo-docs
- **SDK 기본값**: HakuyaLabs [Warudo-Mod-Tool](https://github.com/HakuyaLabs/Warudo-Mod-Tool) SDK 스텁의 필드 초기값. 계산 코드는 비어 있음.
- **추정**: 공식이 공개되지 않아 우리가 정한 계산. 실제 Warudo 결과와 다를 수 있어요.
- **우리 전용**: Warudo에 없는 기능.

## 실제 자료로 확인된 것 (v3)
- **트래커 설정 59개**: 모두 SDK 기본값과 같음. 예외 하나: 숨김 항목 `ConvertToVRMEyeBlendShapes`가 켜짐(SDK 기본 꺼짐) → 반영.
- **UI 범위**: Global BlendShape Sensitivity 0.5~2 (step 0.01), Eye Blink Sensitivity 1~3, Body Movement/Rotation 관련 0~1 → 반영. Body Rotation Type이 Inverted면 방향·목/가슴/허리/골반·지연·부드럽게 항목이 숨겨짐 (문서와 같음).
- **MediaPipe 초기 매핑 (52줄)**: eyeBlinkLeft/Right 입력 0.3~0.7 → 출력 0~1, jawOpen·mouthFunnel·mouthPucker 입력 0~1 → 출력 −0.15~1, 나머지 49줄 0~1 → 0~1. (v2의 임시값 eyeBlink 0.25~0.8을 교체)
- **씬 구조**: `{name, appVersion, assets[], graphs[], ...}`, 각 값은 `dataInputs.키.value`에 JSON 문자열. enum은 `{"label":"Inverted","value":2,...}`, 구조체는 다시 JSON 문자열로 중첩. 가져오기를 이 형식에 맞게 고침.
- **얼굴 추적 Blueprint (VRM 매핑, 64개 노드)** — 계산까지 확인:
  - `aa = jawOpen×1.2 − mouthFunnel`, `oh = mouthFunnel×3 + (mouthLowerDownLeft+Right)×0.5`, `ih = (mouthSmileLeft+Right)×2×jawOpen`, `ou = mouthPucker`. **ee는 설정하지 않음.** `blinkLeft/Right = eyeBlinkLeft/Right`, `LookUp/Down/Left/Right` = 트래커가 변환한 값, `Brows up = browInnerUp`, `Brows down = browDownLeft` (그 이름 표정이 있을 때만). 각 값 0~1 제한.
  - 그다음 Constrain BlendShape 4개를 이 순서로: aa→oh, ih→oh, aa→ih, ou→(ih, aa, oh). 값은 모두 0/1/0/1. 노드 내부 계산(“제약값이 1이면 대상 최대 0”)은 **추정**.
  - Smooth BlendShapes 0.2초, Smooth Rotations 0.6초, Smooth Position 0.6초. 부드럽게 하는 방식(SmoothDamp)은 **추정**.
  - 추적이 끊기면: 블렌드쉐이프는 빈 목록·회전은 기본 자세로 0.4초 InOutSine 전환. 대기 동작(Generate Head & Eyes Motion) 가중치 = 1 − Switch(2초 InOutSine). Look At 노드 Weight·몸 위치 가중치 = 같은 Switch 값(추적 중 1).
  - 대기 동작 값: 깜빡임 간격 1~10초, 속도 1, 시선 세기 0.5, 최대 시선각 위4/아래10/왼15/오15, 둘러보기 간격 8~30초, 최대 10°, 머리 기울기 0. 움직임 모양은 **추정**.
  - Look At 노드: 대상 Camera, Head 0.66, Eyes 0.33, 최대 135°, 머리 30°, 눈 (10, 5), Smooth 3.5/2.
  - 립싱크 노드 없음 → 립싱크 기본값을 **끔(Disabled)** 으로 바꿈.
- **표정 23개**: 이름 = VRM 1.0 표정 이름 그대로(happy, angry …, 추가 표정). 레이어: 기본 5개 0, 추가 표정은 파일 순서대로 1~18. 모두 페이드 0.4초, Is Binary 꺼짐, 조건 없음. **Disable Eye Blink/Mouth Tracking = VRM의 overrideBlink/overrideMouth가 none이 아닌 것**(23개 전부 일치), Brow는 항상 꺼짐. 우리 VRM 가져오기 결과와 23×9 항목 모두 같음을 확인.
- **표정 단축키**: Alt+1 … Alt+0, Alt+-, Alt+=, Alt+Q … Alt+P, Alt+[ (표정 순서대로), Alt+Backspace = 모두 끄기. 24개 반영.
- **Character 에셋**: Look At IK 꺼짐(0.5/1/1/1, clamp 0.8/0.7/0.6), 숨쉬기·흔들림 꺼짐(0.1, 0.25, 0.25) — SDK 기본과 같음. **Camera**: 시야각 35, 투명 배경 꺼짐, 크로마키 #00ff00, Vibrance 1, Contrast 1.02, Brightness 1.05 — 같음.

## 확인된 공식 (문서)
- **Configure BlendShapes Mapping**: 왼쪽 두 값 = 추적 입력 범위, 오른쪽 두 값 = 캐릭터 출력 범위. 선형. 예: 입력 0~1, 출력 0~2면 0.40 → 0.80. 출력 최대 0 = 끄기. 출력 최소를 −0.25 같은 음수로 하면 늦게 반응. SDK 기본값 SourceValueMin 0, SourceValueMax 1, TargetValueMin 0, TargetValueMax 1.
  - 우리 계산: `출력 = 출력최소 + clamp((입력−입력최소)/(입력최대−입력최소), 0, 1) × (출력최대−출력최소)`, 그다음 × BlendShape Sensitivity (eyeBlink는 × Eye Blink Sensitivity도), Clamp All BlendShapes면 0~1로 제한. 입력 제한과 곱하는 순서는 **추정**.
  - 초기 매핑은 실제 MediaPipe 값으로 교체했어요 (위 "실제 자료로 확인된 것").
- **Body Rotation Type**: None 회전 없음, Normal 같은 방향, Inverted X·Y 같은 방향 + Z 반대, Custom 축별 방향·크기. 기본 Inverted.
- **표정 (Expressions)**: 같은 Layer는 바뀔 때 페이드아웃, 다른 Layer는 겹침. VRM 기본 클립(Joy, Angry, Sorrow, Fun, Surprised)은 layer 0, 모델러가 추가한 클립은 1, 2, 3…. 기본 0.4초 페이드 인·아웃, Is Binary면 페이드 없음. SDK 기본: Enter 0.4초 OutCubic, Exit 0.4초 Linear, 지연 0.
- **Trigger Conditions**: 예) mouthSmileLeft와 mouthSmileRight가 둘 다 0.5보다 크면 들어감. 여러 항목 중 하나라도 맞으면 들어감. SDK 기본: 조건 값 0.5, 맞으면 Enter(지연 0), 안 맞으면 Exit(지연 2초). 한 항목 안의 조건은 모두 맞아야 한다고 봤어요(문서 예시 기준, **추정**). 비교는 ≥ 또는 ≤.
- **Disable Eye Blink / Mouth / Brow Tracking**: 표정이 켜진 만큼 해당 추적을 끔. (VRM에서 가져올 때 켜짐 여부 = VRM override, 실측)
- **Look At**: 정면을 볼 때 카메라를 봄(기본 켜짐). **Look At IK**: Clamp Weight가 클수록 회전 범위가 작음.
- **Lip Sync**: 추적이 끊겼을 때만 / 항상. 세부 설정(Lip Sync Settings)은 비공개.
- **Camera**: 기본 Vibrance 1, Contrast 1.02, Brightness 1.05 (원래 색을 원하면 0, 1, 1).

## MediaPipe Tracker 에셋 (Warudo: GenericTrackerAsset)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Mirrored Tracking** / 추적 좌우 반전 | 꺼짐 | 켬/끔 | 추적 데이터를 좌우로 뒤집음. 켜면 SDK 좌우 이름표(eyeBlinkLeft↔Right 등)로 맞바꾸고 머리 좌우 회전·기울기·좌우 이동도 반대로 | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Global BlendShape Sensitivity** / 전체 블렌드쉐이프 민감도 | 1 | 0.5 ~ 2 (실제 Warudo UI 범위) | 모든 블렌드쉐이프에 곱함. 곱하는 위치(개별 매핑 뒤)는 추정 | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Clamp All BlendShapes** / 블렌드쉐이프 0~1 제한 | 켜짐 | 켬/끔 | 최종 값을 0~1로 제한. 적용 위치는 추정 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Head Movement Intensity** / 머리 이동 강도 | (2, 2, 2) | 0 ~ 5 (UI 범위) | 머리 이동(cm→m)에 축별로 곱함 | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Maximal Head Translation** / 최대 머리 이동(m) | (0.5, 0.5, 0.5) | 0 ~ 1 (UI 범위) | 머리 이동 최대치(m), 축별 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Head Rotation Intensity** / 머리 회전 강도 | (1, 1, 1) | 0 ~ 3 (UI 범위) | 머리 회전(피치 X, 요 Y, 롤 Z)에 축별로 곱함 | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Head Rotation Offset** / 머리 회전 오프셋(°) | (0, 0, 0) | -45 ~ 45 (UI 범위) | 머리 회전에 더하는 각도(°) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Movement Intensity** / 몸 이동 강도 | 0.5 | 0 ~ 1 (실제 Warudo UI 범위) | 머리 이동 때 몸이 따라 움직이는 정도. 0이면 몸 안 움직임(문서 FAQ). 골반 이동/상체 기울기로 나누는 방식은 추정 | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Type** / 몸 회전 방식 | Inverted | None / Normal / Inverted / Custom | None 몸 회전 없음 / Normal 머리와 같은 방향 / Inverted X·Y는 같은 방향, Z는 반대 / Custom 축별 방향·크기 직접 지정. 기본 Inverted | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/PendulumPhysicsMixin.cs |
| **Body Rotation Intensity** / 몸 회전 강도 | 0.5 | 0 ~ 1 (실제 Warudo UI 범위) | Normal·Inverted일 때 몸 회전 = 머리 회전 × 이 값 (Custom이면 숨겨짐 → 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Direction (Custom)** / 몸 회전 축별 방향·크기 | (0.5, 1, 0.5) | -1 ~ 1 (UI 범위) | Custom일 때 축별 배율(음수면 반대) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Neck Compensation** / 목 보정 | 0.75 | 0 ~ 1 (실제 Warudo UI 범위) | 몸이 돈 만큼 목에서 되돌리는 비율 (공식은 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Spine Rotation Intensity** / 허리(spine) 회전 비율 | 0.5 | 0 ~ 1 (실제 Warudo UI 범위) | 몸 회전을 허리에 나누는 비율 (분배 공식 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Chest Rotation Intensity** / 가슴 회전 비율 | 0.25 | 0 ~ 1 (실제 Warudo UI 범위) | 가슴 비율 (분배 공식 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Hips Rotation Intensity** / 골반 회전 비율 | 0 | 0 ~ 1 (실제 Warudo UI 범위) | 골반 비율 (분배 공식 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Delay Duration** / 몸 회전 지연(초) | 0 | 0 ~ 1 (실제 Warudo UI 범위) | 몸 회전 지연(초) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Smoothing Duration** / 몸 회전 부드럽게(초) | 0 | 0 ~ 1 (실제 Warudo UI 범위) | 몸 회전을 부드럽게(초, 지수 평활로 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Eye Movement Intensity** / 눈동자 움직임 강도 | (1, 1) | 0 ~ 3 (UI 범위) | 눈동자 움직임 X·Y 배율. 트래커별 기준 배율(EyeMovementIntensityBaseMultiplier)은 비공개라 우리 값 70° | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Eye Movement Head Rotation Compensation** / 머리 회전 시선 보정 | (0, 0) | 0 ~ 1 (UI 범위) | 머리 회전만큼 시선을 되돌림 (공식 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Eye Blink Sensitivity** / 눈 깜빡임 민감도 | 1.2 | 1 ~ 3 (실제 Warudo UI 범위) | 눈 깜빡임 배율. 매핑의 eyeBlink 민감도 바로가기(문서) → 매핑 뒤에 곱함(추정) | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Linked Eye Blinking** / 양눈 같이 깜빡임 | 꺼짐 | 켬/끔 | 두 눈을 같이 깜빡임. 둘 중 큰 값 사용(추정) | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Use Bones For Eye Movement** / 눈 뼈로 시선 | 켜짐 | 켬/끔 | 눈 뼈로 시선 | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Use BlendShapes For Eye Movement** / 블렌드쉐이프로 시선 | 꺼짐 | 켬/끔 | lookLeft/Right/Up/Down 표정으로 시선 (환산 각도 추정) | **실측** · 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Calibrate Eye Movement** / 보정 시 시선도 보정 | 켜짐 | 켬/끔 | 정면 보정 때 시선 기준도 저장 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Convert ARKit Look → VRM LookUp/Down/Left/Right (hidden)** / 시선을 VRM Look 표정으로도 보냄 | 켜짐 (SDK 기본은 꺼짐, 숨김 항목) | 켬/끔 | ARKit 시선(eyeLookUp/Down/In/Out)을 VRM LookUp/Down/Left/Right 블렌드쉐이프로도 보냄. 양눈 합치는 법은 추정(평균) | **실측** | 실제 씬 파일 |

## 얼굴 추적 Blueprint 옵션 (온보딩 Customize Face Tracking)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **BlendShape Mapping** / 블렌드쉐이프 매핑 | Auto | Auto / VRM / ARKit | ARKit(Perfect Sync) / VRM / (MMD 미지원). 기본 자동 감지. 감지 기준(ARKit 이름 26개 이상)과 ARKit→VRM(아에이오우) 변환 공식은 추정 | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Enable Head and Body Movements** / 머리·몸 움직임 | 켜짐 | 켬/끔 | 끄면 얼굴(블렌드쉐이프·눈)만 움직임 | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Idle Head Animation: Auto Blinking** / 자동 깜빡임 | 켜짐 | 켬/끔 | 자동 깜빡임. 기본값·작동 조건은 추정(추적이 끊겼을 때) | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Idle Head Animation: Auto Eye Movements** / 자동 눈 움직임 | 켜짐 | 켬/끔 | 자동 눈 움직임 (모양·조건 추정) | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Idle Head Animation: Auto Head Movements** / 자동 머리 움직임 | 켜짐 | 켬/끔 | 자동 머리 움직임 (모양·조건 추정) | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Look At** / 카메라 눈맞춤 | 켜짐 | 켬/끔 | 정면을 볼 때 카메라를 보게 함. 문서상 기본 켜짐 | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking · https://docs.warudo.app/docs/assets/character |
| **Lip Sync** / 립싱크(마이크) | Disabled | Disabled / WhenTrackingLost / Always | 끔 / 추적 끊길 때만 / 항상. 실제 씬 Blueprint에 립싱크 노드가 없어서 기본 끔. 마이크→입 공식은 비공개라 우리 공식 | **실측** · 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Smooth BlendShapes: Smooth Time** / 표정 부드럽게(초) | 0.2 | 0 ~ 1 (UI 범위) | Smooth BlendShapes 노드. 변환된 VRM 블렌드쉐이프를 부드럽게 (SmoothDamp 방식은 추정) | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Smooth Rotations: Smooth Time** / 머리·몸 회전 부드럽게(초) | 0.6 | 0 ~ 2 (UI 범위) | Smooth Rotations 노드. 트래커 뼈 회전(머리·몸·눈)을 부드럽게 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Smooth Position: Smooth Time** / 몸 위치 부드럽게(초) | 0.6 | 0 ~ 2 (UI 범위) | Smooth Position 노드. 몸 위치 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Switch BlendShape List / Rotations: Transition Time** / 추적 끊김·복귀 전환(초) | 0.4 | 0 ~ 2 (UI 범위) | Switch BlendShape List / Switch Rotations: 추적이 끊기면 블렌드쉐이프는 빈 목록, 회전은 기본 자세로 0.4초 InOutSine 전환 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Switch Float (idle / Look At weight): Transition Time** / 대기 동작·눈맞춤 전환(초) | 2 | 0 ~ 5 (UI 범위) | Switch Float: 추적 중 1, 끊기면 0 (2초 InOutSine). 대기 동작 가중치 = 1 − 이 값, Look At 노드 Weight와 몸 위치 가중치 = 이 값 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Generate Head & Eyes Motion: Blink Interval** / 자동 깜빡임 간격(초, 최소·최대) | (1, 10) | 0 ~ 30 (UI 범위) | Generate Head & Eyes Motion: 자동 깜빡임 간격 (초, 무작위) | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Blink Speed** / 자동 깜빡임 속도 | 1 | 0.1 ~ 3 (UI 범위) | 깜빡임 속도 (한 번 깜빡이는 시간 0.15초÷속도는 추정) | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Look Weight** / 대기 시선 세기 | 0.5 | 0 ~ 1 (UI 범위) | 대기 시선 세기 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Max Look Angles** / 대기 시선 최대각(°) | (4, 10, 15, 15) | 0 ~ 30 (UI 범위) | 대기 시선 최대각 위 4 / 아래 10 / 왼 15 / 오 15 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Look Around Interval** / 대기 둘러보기 간격(초) | (8, 30) | 0 ~ 60 (UI 범위) | 대기 중 둘러보기 간격 (초) | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Max Look Around Angle** / 대기 둘러보기 최대각(°) | 10 | 0 ~ 45 (UI 범위) | 대기 중 둘러보기 최대각 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **Head Tilt** / 대기 머리 기울기(°) | (0, 0, 0) | -45 ~ 45 (UI 범위) | 대기 중 머리 기울기 | **실측** (그래프 노드 값) | 실제 씬 파일 |
| **smoothing method** / 부드럽게 방식 | Warudo | Warudo / OneEuro | Warudo = 위 Smooth Time 값 사용, OneEuro = v1·v2 방식(반응 빠름) | 우리 전용 | - |

## Look At (Character Look At Target 노드)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Weight** / 눈맞춤 세기 (실제 씬: 추적 상태에 연결됨 → 추적 중 1) | 1 | 0 ~ 1 (UI 범위) | Look At 전체 세기. 실제 씬: 얼굴 추적 Blueprint에 이 노드가 있고(대상 Camera 1), Weight 입력은 추적 상태 Switch에 연결(추적 중 1, 끊기면 2초에 걸쳐 0). 우리: 이 값 × Switch | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Head Weight** / 머리 비중 | 0.66 | 0 ~ 1 (UI 범위) | 카메라 방향 각도 중 머리로 가는 비율 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Eyes Weight** / 눈 비중 | 0.33 | 0 ~ 1 (UI 범위) | 눈으로 가는 비율 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Maximum Look At Angle** / 최대 눈맞춤 각도(°) | 135 | 0 ~ 180 (UI 범위) | 카메라가 이 각도보다 뒤에 있으면 무시 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Maximal Head Rotation** / 최대 머리 회전(°) | (30, 30, 30) | 0 ~ 90 (UI 범위) | 머리 추가 회전 한도(°) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Maximal Eye Rotation** / 최대 눈 회전(°) | (10, 5) | 0 ~ 45 (UI 범위) | 눈 추가 회전 한도(°) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Smooth Head Time** / 머리 따라가기 속도 | 3.5 | 0 ~ 10 (UI 범위) | 머리 따라가기 (지수 속도로 해석, 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Smooth Eyes Time** / 눈 따라가기 속도 | 2 | 0 ~ 10 (UI 범위) | 눈 따라가기 (추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |

## Character 에셋

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Look At IK** / Look At IK (카메라 보기) | 꺼짐 | 켬/끔 | 캐릭터 Look At IK. 대상은 카메라 고정 | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/character · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Weight** / 전체 세기 | 0.5 | 0 ~ 1 (UI 범위) | IK 전체 세기 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Head Weight** / 머리 | 1 | 0 ~ 1 (UI 범위) | 머리 세기 | **실측** · 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Eyes Weight** / 눈 | 1 | 0 ~ 1 (UI 범위) | 눈 세기 | **실측** · 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Body Weight** / 몸 | 1 | 0 ~ 1 (UI 범위) | 몸 세기 (몸 몫 30%는 추정) | **실측** · 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Clamp Head Weight** / 머리 제한 | 0.7 | 0 ~ 1 (UI 범위) | 클수록 회전 범위가 작음(문서). Final IK clampWeight 공식 사용(추정) | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/character · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Clamp Eyes Weight** / 눈 제한 | 0.8 | 0 ~ 1 (UI 범위) | 같음 | **실측** · 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Clamp Body Weight** / 몸 제한 | 0.6 | 0 ~ 1 (UI 범위) | 같음 | **실측** · 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Breathing Animation** / 숨쉬기 | 꺼짐 | 켬/끔 | 숨쉬기 애니메이션 (움직임 모양 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Breathing Exertion** / 숨 세기 | 0.1 | 0 ~ 1 (UI 범위) | 숨 세기 (0.1 = 우리 기본 크기) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Breathing Rate** / 숨 빠르기(회/초) | 0.25 | 0 ~ 2 (UI 범위) | 초당 숨 횟수로 해석(추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Swaying Animation** / 흔들림 | 꺼짐 | 켬/끔 | 흔들림 애니메이션 (모양 추정) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Swaying Intensity** / 흔들림 세기 | 0.25 | 0 ~ 1 (UI 범위) | 흔들림 세기 | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |

## Camera 에셋

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Field Of View** / 시야각(°) | 35 | 10 ~ 90 (UI 범위) | 세로 시야각(°, Unity와 같음) | **실측** · SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Cinematography/CameraAsset.cs |
| **Transparent Background** / 투명 배경 | 꺼짐 | 켬/끔 | 투명 배경 | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/camera · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Cinematography/CameraAsset.cs |
| **Chroma Key Color** / 크로마키 색 | #00ff00 | 색 | 배경 크로마키 색 | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/camera · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Cinematography/CameraAsset.cs |
| **Brightness** / 밝기(후처리) | 1.05 | 0 ~ 2 (UI 범위) | 밝기 후처리 (CSS brightness로 근사) | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/camera |
| **Contrast** / 대비(후처리) | 1.02 | 0 ~ 2 (UI 범위) | 대비 후처리 (CSS contrast로 근사) | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/camera |
| **Vibrance** / 선명도(후처리, 근사) | 1 | 0 ~ 2 (UI 범위) | 선명도. 0이면 원래 색(문서). saturate(1+0.15×값)으로 근사 | **실측** · 문서+SDK | https://docs.warudo.app/docs/assets/camera |

## 우리 전용 (Warudo에 대응 없음)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **One-Euro smoothing** / 부드러움 (One-Euro 방식일 때) | 0.55 | 0 ~ 1 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **fast-motion response** / 빠른 움직임 반응 | 0.5 | 0 ~ 1 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **idle animation (approx.)** / 숨쉬기 대기 애니메이션 (근사) | 켜짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **arm down** / 팔 내림(°) | 72 | 0 ~ 85 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **auto emotion** / 표정 자동 인식 (Warudo 기본엔 없음) | 꺼짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **emotion sensitivity** / 감정 감도 | 1 | 0 ~ 2 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **excitement sensitivity** / 신남 감도 | 1 | 0.5 ~ 2 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **bounce** / 신나면 통통 튀기 | 켜짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **excited → smile** / 신나면 웃음 | 켜짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **light** / 조명 밝기 | 1 | 0.2 ~ 2 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **light direction** / 조명 방향(°) | -25 | -90 ~ 90 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **camera preview** / 카메라 미리보기 | 꺼짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |

## Warudo 씬 파일 가져오기 결과 (실제 파일)
- 입력값 281개(에셋 6개 + 사용하는 Blueprint 노드 7개) 중: **가져옴 69**, 다른 노드에 연결돼 상수가 아님 9 (예: Look At Weight), 웹에 해당 없음 200 (손 추적, 후처리 효과, Ragdoll, 출력 장치 등), **모름/미구현 3** (`TrackingEnabled`, `LookAtTarget`, `EnablePoseTracking`).
- 그 밖에 블렌드쉐이프 매핑 52줄, 표정 23개, 단축키 24개, 립싱크 유무, 매핑 종류(VRM)를 가져와요. 가져온 뒤 우리 기본값과 다른 값은 BlendShape Mapping(Auto → VRM) 하나뿐이에요 (= 기본값이 실제 Warudo와 같음).

## 아직 확인 못 한 것 (추정으로 남음)
- 트래커 안쪽 계산: 매핑·민감도 적용 순서, 머리 이동/회전 강도 적용 위치, Body Rotation 분배, 눈동자 각도 배율(우리: 휴머노이드 눈 기본 범위 좌우 20°·위 15°·아래 10°), ARKit 시선 → VRM Look 변환 방식(양눈 평균).
- Constrain BlendShape·Smooth 노드 내부 계산, 대기 동작의 움직임 모양, Look At 노드의 Smooth 시간 의미(속도로 처리).
- ARKit(Perfect Sync) 아바타용 Blueprint: 이번 씬은 VRM 매핑이라 확인 못 함.
- VRM 0.x 아바타의 표정 이름(Joy/Sorrow/Fun)과 오버라이드 처리: 이번 아바타는 VRM 1.0.
- 실제 움직임 비교(같은 얼굴 움직임 → 같은 결과)는 아직 안 함. 화면 비교 자료가 필요해요.

## 미구현
- 대기 애니메이션(AGIA Idle), Additional Bone Offsets, Constrained BlendShapes, Material Properties, Toggle GameObjects, Pendulum Physics, Ragdoll, Body IK, 손·자세 추적, 조명(Directional Light) 에셋.
