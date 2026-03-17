# HandFit - 치매 예방 손 협응 체조 앱

## 프로젝트 소개
매일 두 번, 손 협응 체조를 통해 치매를 예방하는 모바일 앱입니다.

## 기술 스택
- React Native (Expo)
- Firebase (Auth, Firestore)
- FastAPI (모델 서버)

---

## 초기 환경 세팅

### 1. 레포 클론
\`\`\`bash
git clone [레포 주소]
cd dementia_app
\`\`\`

### 2. 필수 파일 추가
팀장에게 아래 파일을 받아서 루트 폴더에 넣어주세요.
- \`GoogleService-Info.plist\`

### 3. 패키지 설치
\`\`\`bash
npm install
\`\`\`

### 4. 개발 서버 실행
\`\`\`bash
npx expo start --tunnel
\`\`\`

### 5. 앱 실행
- 아이폰에 HandFit 앱 설치 (팀장에게 링크 받기)
- 터미널에 뜨는 QR 코드 스캔

---

## 주의사항
- \`GoogleService-Info.plist\` 는 절대 깃에 올리지 마세요
- \`node_modules\` 는 깃에 올리지 마세요
