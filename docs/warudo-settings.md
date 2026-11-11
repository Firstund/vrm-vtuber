# Warudo 설정 대응표

이 프로그램의 설정을 Warudo와 같은 이름·기본값·단위로 맞춘 기록이에요. 마지막 확인: 2026-11-11 (KST).

## 근거 표시
- **문서**: Warudo 공식 문서(docs.warudo.app)에 적힌 내용. 문서 원본: https://github.com/HakuyaLabs/warudo-docs
- **SDK 기본값**: HakuyaLabs 공식 [Warudo-Mod-Tool](https://github.com/HakuyaLabs/Warudo-Mod-Tool) 안의 SDK 스텁 코드에 적힌 필드 초기값. 계산 코드는 비어 있어서(NotImplemented) **값만 확실하고 공식은 모름**.
- **추정**: 공식 자료에 공식이 없어서 우리가 정한 계산. 실제 Warudo 결과와 다를 수 있어요.
- **우리 전용**: Warudo에 없는 기능.

## 확인된 공식 (문서)
- **Configure BlendShapes Mapping**: 왼쪽 두 값 = 추적 입력 범위, 오른쪽 두 값 = 캐릭터 출력 범위. 선형. 예: 입력 0~1, 출력 0~2면 0.40 → 0.80. 출력 최대 0 = 끄기. 출력 최소를 −0.25 같은 음수로 하면 늦게 반응. SDK 기본값 SourceValueMin 0, SourceValueMax 1, TargetValueMin 0, TargetValueMax 1.
  - 우리 계산: `출력 = 출력최소 + clamp((입력−입력최소)/(입력최대−입력최소), 0, 1) × (출력최대−출력최소)`, 그다음 × BlendShape Sensitivity (eyeBlink는 × Eye Blink Sensitivity도), Clamp All BlendShapes면 0~1로 제한. 입력 제한과 곱하는 순서는 **추정**.
  - **임시값**: Warudo는 트래커마다 초기 매핑을 따로 넣는데(SDK `Initialize`), MediaPipe 값은 공개되지 않았어요. MediaPipe는 눈을 떠도 eyeBlink가 0.2 안팎이라 eyeBlinkLeft/Right만 입력 0.25~0.8로 임시 설정했어요. Warudo 스크린샷을 받으면 바꿀 값이에요.
- **Body Rotation Type**: None 회전 없음, Normal 같은 방향, Inverted X·Y 같은 방향 + Z 반대, Custom 축별 방향·크기. 기본 Inverted.
- **표정 (Expressions)**: 같은 Layer는 바뀔 때 페이드아웃, 다른 Layer는 겹침. VRM 기본 클립(Joy, Angry, Sorrow, Fun, Surprised)은 layer 0, 모델러가 추가한 클립은 1, 2, 3…. 기본 0.4초 페이드 인·아웃, Is Binary면 페이드 없음. SDK 기본: Enter 0.4초 OutCubic, Exit 0.4초 Linear, 지연 0.
- **Trigger Conditions**: 예) mouthSmileLeft와 mouthSmileRight가 둘 다 0.5보다 크면 들어감. 여러 항목 중 하나라도 맞으면 들어감. SDK 기본: 조건 값 0.5, 맞으면 Enter(지연 0), 안 맞으면 Exit(지연 2초). 한 항목 안의 조건은 모두 맞아야 한다고 봤어요(문서 예시 기준, **추정**). 비교는 ≥ 또는 ≤.
- **Disable Eye Blink / Mouth / Brow Tracking**: 표정이 켜진 만큼 해당 추적을 끔.
- **Look At**: 정면을 볼 때 카메라를 봄(기본 켜짐). **Look At IK**: Clamp Weight가 클수록 회전 범위가 작음.
- **Lip Sync**: 추적이 끊겼을 때만 / 항상. 세부 설정(Lip Sync Settings)은 비공개.
- **Camera**: 기본 Vibrance 1, Contrast 1.02, Brightness 1.05 (원래 색을 원하면 0, 1, 1).

## MediaPipe Tracker 에셋 (Warudo: GenericTrackerAsset)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Mirrored Tracking** / 추적 좌우 반전 | 꺼짐 | 켬/끔 | 추적 데이터를 좌우로 뒤집음. 켜면 SDK 좌우 이름표(eyeBlinkLeft↔Right 등)로 맞바꾸고 머리 좌우 회전·기울기·좌우 이동도 반대로 | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **BlendShape Sensitivity** / 블렌드쉐이프 민감도 | 1 | 0 ~ 3 (UI 범위) | 모든 블렌드쉐이프에 곱함. 곱하는 위치(개별 매핑 뒤)는 추정 | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Clamp All BlendShapes** / 블렌드쉐이프 0~1 제한 | 켜짐 | 켬/끔 | 최종 값을 0~1로 제한. 적용 위치는 추정 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Head Movement Intensity** / 머리 이동 강도 | (2, 2, 2) | 0 ~ 5 (UI 범위) | 머리 이동(cm→m)에 축별로 곱함 | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Maximal Head Translation** / 최대 머리 이동(m) | (0.5, 0.5, 0.5) | 0 ~ 1 (UI 범위) | 머리 이동 최대치(m), 축별 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Head Rotation Intensity** / 머리 회전 강도 | (1, 1, 1) | 0 ~ 3 (UI 범위) | 머리 회전(피치 X, 요 Y, 롤 Z)에 축별로 곱함 | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Head Rotation Offset** / 머리 회전 오프셋(°) | (0, 0, 0) | -45 ~ 45 (UI 범위) | 머리 회전에 더하는 각도(°) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Movement Intensity** / 몸 이동 강도 | 0.5 | 0 ~ 1 (UI 범위) | 머리 이동 때 몸이 따라 움직이는 정도. 0이면 몸 안 움직임(문서 FAQ). 골반 이동/상체 기울기로 나누는 방식은 추정 | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Type** / 몸 회전 방식 | Inverted | None / Normal / Inverted / Custom | None 몸 회전 없음 / Normal 머리와 같은 방향 / Inverted X·Y는 같은 방향, Z는 반대 / Custom 축별 방향·크기 직접 지정. 기본 Inverted | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/PendulumPhysicsMixin.cs |
| **Body Rotation Intensity** / 몸 회전 강도 | 0.5 | 0 ~ 1 (UI 범위) | Normal·Inverted일 때 몸 회전 = 머리 회전 × 이 값 (Custom이면 숨겨짐 → 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Direction (Custom)** / 몸 회전 축별 방향·크기 | (0.5, 1, 0.5) | -1 ~ 1 (UI 범위) | Custom일 때 축별 배율(음수면 반대) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Neck Compensation** / 목 보정 | 0.75 | 0 ~ 1 (UI 범위) | 몸이 돈 만큼 목에서 되돌리는 비율 (공식은 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Spine Rotation Intensity** / 허리(spine) 회전 비율 | 0.5 | 0 ~ 1 (UI 범위) | 몸 회전을 허리에 나누는 비율 (분배 공식 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Chest Rotation Intensity** / 가슴 회전 비율 | 0.25 | 0 ~ 1 (UI 범위) | 가슴 비율 (분배 공식 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Hips Rotation Intensity** / 골반 회전 비율 | 0 | 0 ~ 1 (UI 범위) | 골반 비율 (분배 공식 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Delay Duration** / 몸 회전 지연(초) | 0 | 0 ~ 1 (UI 범위) | 몸 회전 지연(초) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Body Rotation Smoothing Duration** / 몸 회전 부드럽게(초) | 0 | 0 ~ 1 (UI 범위) | 몸 회전을 부드럽게(초, 지수 평활로 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Eye Movement Intensity** / 눈동자 움직임 강도 | (1, 1) | 0 ~ 3 (UI 범위) | 눈동자 움직임 X·Y 배율. 트래커별 기준 배율(EyeMovementIntensityBaseMultiplier)은 비공개라 우리 값 70° | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Eye Movement Head Rotation Compensation** / 머리 회전 시선 보정 | (0, 0) | 0 ~ 1 (UI 범위) | 머리 회전만큼 시선을 되돌림 (공식 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Eye Blink Sensitivity** / 눈 깜빡임 민감도 | 1.2 | 0 ~ 3 (UI 범위) | 눈 깜빡임 배율. 매핑의 eyeBlink 민감도 바로가기(문서) → 매핑 뒤에 곱함(추정) | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Linked Eye Blinking** / 양눈 같이 깜빡임 | 꺼짐 | 켬/끔 | 두 눈을 같이 깜빡임. 둘 중 큰 값 사용(추정) | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Use Bones For Eye Movement** / 눈 뼈로 시선 | 켜짐 | 켬/끔 | 눈 뼈로 시선 | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Use BlendShapes For Eye Movement** / 블렌드쉐이프로 시선 | 꺼짐 | 켬/끔 | lookLeft/Right/Up/Down 표정으로 시선 (환산 각도 추정) | 문서+SDK | https://docs.warudo.app/docs/mocap/face-tracking · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |
| **Calibrate Eye Movement** / 보정 시 시선도 보정 | 켜짐 | 켬/끔 | 정면 보정 때 시선 기준도 저장 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/MotionCapture/GenericTrackerAsset.cs |

## 얼굴 추적 Blueprint 옵션 (온보딩 Customize Face Tracking)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **BlendShape Mapping** / 블렌드쉐이프 매핑 | Auto | Auto / VRM / ARKit | ARKit(Perfect Sync) / VRM / (MMD 미지원). 기본 자동 감지. 감지 기준(ARKit 이름 26개 이상)과 ARKit→VRM(아에이오우) 변환 공식은 추정 | 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Enable Head and Body Movements** / 머리·몸 움직임 | 켜짐 | 켬/끔 | 끄면 얼굴(블렌드쉐이프·눈)만 움직임 | 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Idle Head Animation: Auto Blinking** / 자동 깜빡임 | 켜짐 | 켬/끔 | 자동 깜빡임. 기본값·작동 조건은 추정(추적이 끊겼을 때) | 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Idle Head Animation: Auto Eye Movements** / 자동 눈 움직임 | 켜짐 | 켬/끔 | 자동 눈 움직임 (모양·조건 추정) | 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Idle Head Animation: Auto Head Movements** / 자동 머리 움직임 | 켜짐 | 켬/끔 | 자동 머리 움직임 (모양·조건 추정) | 문서 | https://docs.warudo.app/docs/mocap/face-tracking |
| **Look At** / 카메라 눈맞춤 | 켜짐 | 켬/끔 | 정면을 볼 때 카메라를 보게 함. 문서상 기본 켜짐 | 문서 | https://docs.warudo.app/docs/mocap/face-tracking · https://docs.warudo.app/docs/assets/character |
| **Lip Sync** / 립싱크(마이크) | WhenTrackingLost | Disabled / WhenTrackingLost / Always | 끔 / 추적 끊길 때만 / 항상. 마이크→입 공식과 Lip Sync Settings 세부값은 비공개라 우리 공식 | 문서 | https://docs.warudo.app/docs/mocap/face-tracking |

## Look At (Character Look At Target 노드)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Weight** / 눈맞춤 세기 | 1 | 0 ~ 1 (UI 범위) | Look At 전체 세기. 얼굴 추적 Look At이 이 노드를 쓴다는 건 추정 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Head Weight** / 머리 비중 | 0.66 | 0 ~ 1 (UI 범위) | 카메라 방향 각도 중 머리로 가는 비율 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Eyes Weight** / 눈 비중 | 0.33 | 0 ~ 1 (UI 범위) | 눈으로 가는 비율 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Maximum Look At Angle** / 최대 눈맞춤 각도(°) | 135 | 0 ~ 180 (UI 범위) | 카메라가 이 각도보다 뒤에 있으면 무시 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Maximal Head Rotation** / 최대 머리 회전(°) | (30, 30, 30) | 0 ~ 90 (UI 범위) | 머리 추가 회전 한도(°) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Maximal Eye Rotation** / 최대 눈 회전(°) | (10, 5) | 0 ~ 45 (UI 범위) | 눈 추가 회전 한도(°) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Smooth Head Time** / 머리 따라가기 속도 | 3.5 | 0 ~ 10 (UI 범위) | 머리 따라가기 (지수 속도로 해석, 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |
| **Smooth Eyes Time** / 눈 따라가기 속도 | 2 | 0 ~ 10 (UI 범위) | 눈 따라가기 (추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Nodes/Character/CharacterLookAtTargetNode.cs |

## Character 에셋

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Look At IK** / Look At IK (카메라 보기) | 꺼짐 | 켬/끔 | 캐릭터 Look At IK. 대상은 카메라 고정 | 문서+SDK | https://docs.warudo.app/docs/assets/character · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Weight** / 전체 세기 | 0.5 | 0 ~ 1 (UI 범위) | IK 전체 세기 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Head Weight** / 머리 | 1 | 0 ~ 1 (UI 범위) | 머리 세기 | 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Eyes Weight** / 눈 | 1 | 0 ~ 1 (UI 범위) | 눈 세기 | 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Body Weight** / 몸 | 1 | 0 ~ 1 (UI 범위) | 몸 세기 (몸 몫 30%는 추정) | 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Clamp Head Weight** / 머리 제한 | 0.7 | 0 ~ 1 (UI 범위) | 클수록 회전 범위가 작음(문서). Final IK clampWeight 공식 사용(추정) | 문서+SDK | https://docs.warudo.app/docs/assets/character · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Clamp Eyes Weight** / 눈 제한 | 0.8 | 0 ~ 1 (UI 범위) | 같음 | 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Clamp Body Weight** / 몸 제한 | 0.6 | 0 ~ 1 (UI 범위) | 같음 | 문서+SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Breathing Animation** / 숨쉬기 | 꺼짐 | 켬/끔 | 숨쉬기 애니메이션 (움직임 모양 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Breathing Exertion** / 숨 세기 | 0.1 | 0 ~ 1 (UI 범위) | 숨 세기 (0.1 = 우리 기본 크기) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Breathing Rate** / 숨 빠르기(회/초) | 0.25 | 0 ~ 2 (UI 범위) | 초당 숨 횟수로 해석(추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Swaying Animation** / 흔들림 | 꺼짐 | 켬/끔 | 흔들림 애니메이션 (모양 추정) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |
| **Swaying Intensity** / 흔들림 세기 | 0.25 | 0 ~ 1 (UI 범위) | 흔들림 세기 | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Character/CharacterAsset.cs |

## Camera 에셋

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **Field Of View** / 시야각(°) | 35 | 10 ~ 90 (UI 범위) | 세로 시야각(°, Unity와 같음) | SDK | https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Cinematography/CameraAsset.cs |
| **Transparent Background** / 투명 배경 | 꺼짐 | 켬/끔 | 투명 배경 | 문서+SDK | https://docs.warudo.app/docs/assets/camera · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Cinematography/CameraAsset.cs |
| **Chroma Key Color** / 크로마키 색 | #00ff00 | 색 | 배경 크로마키 색 | 문서+SDK | https://docs.warudo.app/docs/assets/camera · https://github.com/HakuyaLabs/Warudo-Mod-Tool/blob/master/Warudo/Scripts/Warudo/Plugins/Core/Assets/Cinematography/CameraAsset.cs |
| **Brightness** / 밝기(후처리) | 1.05 | 0 ~ 2 (UI 범위) | 밝기 후처리 (CSS brightness로 근사) | 문서+SDK | https://docs.warudo.app/docs/assets/camera |
| **Contrast** / 대비(후처리) | 1.02 | 0 ~ 2 (UI 범위) | 대비 후처리 (CSS contrast로 근사) | 문서+SDK | https://docs.warudo.app/docs/assets/camera |
| **Vibrance** / 선명도(후처리, 근사) | 1 | 0 ~ 2 (UI 범위) | 선명도. 0이면 원래 색(문서). saturate(1+0.15×값)으로 근사 | 문서+SDK | https://docs.warudo.app/docs/assets/camera |

## 우리 전용 (Warudo에 대응 없음)

| 설정 (Warudo 이름 / 한국어) | 기본값 | 범위 | 뜻 · 우리 계산 | 근거 | 출처 |
|---|---|---|---|---|---|
| **One-Euro smoothing** / 부드러움 | 0.55 | 0 ~ 1 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **fast-motion response** / 빠른 움직임 반응 | 0.5 | 0 ~ 1 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **idle animation (approx.)** / 대기 애니메이션 (근사) | 켜짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **arm down** / 팔 내림(°) | 72 | 0 ~ 85 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **auto emotion** / 표정 자동 인식 (Warudo 기본엔 없음) | 꺼짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **emotion sensitivity** / 감정 감도 | 1 | 0 ~ 2 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **excitement sensitivity** / 신남 감도 | 1 | 0.5 ~ 2 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **bounce** / 신나면 통통 튀기 | 켜짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **excited → smile** / 신나면 웃음 | 켜짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **light** / 조명 밝기 | 1 | 0.2 ~ 2 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **light direction** / 조명 방향(°) | -25 | -90 ~ 90 (UI 범위) | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |
| **camera preview** / 카메라 미리보기 | 꺼짐 | 켬/끔 | Warudo에 없음, v1 동작 유지 | 우리 전용 | - |

## Warudo 씬 파일 형식 (SDK 직렬화 클래스 기준)

SDK의 `SerializedScene`: `{ name, appVersion, assets: [ { id, typeId, name, active, dataInputs: { 설정이름: { value, ... } } } ], graphs: [ { name, nodes: { id: { typeId, name, dataInputs } } } ], plugins }`.
`dataInputs`의 키는 C# 필드 이름(예: `BlendShapeSensitivity`)이고 `value`는 문자열(JSON)로 보여요. 실제 씬 파일 예시는 공개된 곳에서 찾지 못해서, 가져오기는 이 구조를 기준으로 **같은 이름을 찾아 넣는 관대한 방식**이에요. 실제 파일로 확인이 필요해요.

## 맞추지 못한 것
- MediaPipe 트래커의 초기 매핑값, 눈동자 기준 배율, 필터(부드러움) 방식: 비공개
- ARKit → VRM(아에이오우·깜빡임) 변환 공식, 립싱크 공식, Idle Head Animation의 움직임 모양: 비공개 (우리 공식 사용)
- 대기 애니메이션(AGIA Idle), Additional Bone Offsets, Constrained BlendShapes, Target Material Properties, Toggle GameObjects, Pendulum Physics, Ragdoll, Body IK, MMD 매핑, 손 추적: 미구현
- 조명(Directional Light 에셋): 미대응 (우리 조명 유지)
