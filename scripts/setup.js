/**
 * 놀발 데이터 관리자 - 일회성 셋업 스크립트
 *
 *  1) 이메일/비밀번호 로그인 provider 활성화 (Identity Toolkit Admin API)
 *  2) 관리자 계정 생성/보장 (ADMIN_EMAIL / ADMIN_PASSWORD)
 *  3) 웹앱(Web App) 확인/생성 후 firebaseConfig 조회 → 출력
 *
 * 사용법:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/sa-key.json \
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='...' \
 *   node scripts/setup.js
 */
const admin = require('firebase-admin');
const { GoogleAuth } = require('google-auth-library');

const PROJECT_ID = 'nolbaldashboard';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});

const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });

async function enableEmailPassword(client) {
  const url = `https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`;
  const res = await client.request({
    url,
    method: 'PATCH',
    data: { signIn: { email: { enabled: true, passwordRequired: true } } },
  });
  console.log('  ✔ 이메일/비밀번호 로그인 활성화:', res.data?.signIn?.email || '(ok)');
}

async function ensureAdminUser() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('  ⚠ ADMIN_EMAIL/ADMIN_PASSWORD 미지정 → 관리자 계정 생성 생략');
    return;
  }
  try {
    const u = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    await admin.auth().updateUser(u.uid, { password: ADMIN_PASSWORD, emailVerified: true });
    console.log('  ✔ 관리자 계정 갱신:', ADMIN_EMAIL);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      await admin.auth().createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, emailVerified: true });
      console.log('  ✔ 관리자 계정 생성:', ADMIN_EMAIL);
    } else {
      throw e;
    }
  }
}

async function ensureWebApp(client) {
  const base = `https://firebase.googleapis.com/v1beta1/projects/${PROJECT_ID}`;
  let list = await client.request({ url: `${base}/webApps` });
  let apps = list.data.apps || [];
  if (apps.length === 0) {
    console.log('  · 웹앱이 없어 새로 생성합니다…');
    const op = await client.request({
      url: `${base}/webApps`,
      method: 'POST',
      data: { displayName: '놀발 데이터 관리자' },
    });
    // operation may be async; poll until done
    let name = op.data.name;
    for (let i = 0; i < 20 && op.data.done !== true; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const chk = await client.request({ url: `https://firebase.googleapis.com/v1beta1/${name}` });
      if (chk.data.done) break;
    }
    list = await client.request({ url: `${base}/webApps` });
    apps = list.data.apps || [];
  }
  const appId = apps[0].appId;
  const cfg = await client.request({ url: `${base}/webApps/${appId}/config` });
  return cfg.data;
}

(async () => {
  console.log('▶ 셋업 시작 (project=' + PROJECT_ID + ')');
  const client = await auth.getClient();

  await enableEmailPassword(client);
  await ensureAdminUser();
  const webConfig = await ensureWebApp(client);

  console.log('\n===FIREBASE_WEB_CONFIG_BEGIN===');
  console.log(JSON.stringify(webConfig));
  console.log('===FIREBASE_WEB_CONFIG_END===');
  console.log('\n✅ 셋업 완료');
  process.exit(0);
})().catch((e) => {
  console.error('❌ 셋업 실패:', e.response?.data || e.message || e);
  process.exit(1);
});
