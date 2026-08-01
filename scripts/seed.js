/**
 * 놀발 데이터 관리자 - Firestore 시드 스크립트
 *
 * 프론트에 하드코딩돼 있던 데이터(scripts/seed-data.json)를 Firestore로 이관합니다.
 * 재실행하면 각 컬렉션을 비우고 다시 씁니다(멱등).
 *
 * 사용법:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa-key.json \
 *   node scripts/seed.js
 */
const admin = require('firebase-admin');
const path = require('path');

const PROJECT_ID = 'nolbaldashboard';
const data = require(path.join(__dirname, 'seed-data.json'));

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: PROJECT_ID,
});
const db = admin.firestore();

async function clearCollection(name) {
  const snap = await db.collection(name).get();
  let batch = db.batch();
  let n = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    if (++n % 450 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (n % 450 !== 0) await batch.commit();
  return snap.size;
}

async function writeDocs(name, docs, idFn) {
  let batch = db.batch();
  let n = 0;
  for (const d of docs) {
    const ref = idFn ? db.collection(name).doc(idFn(d)) : db.collection(name).doc();
    batch.set(ref, d);
    if (++n % 450 === 0) { await batch.commit(); batch = db.batch(); }
  }
  if (n % 450 !== 0) await batch.commit();
  return docs.length;
}

(async () => {
  console.log('▶ 시드 시작 (project=' + PROJECT_ID + ')');

  for (const col of ['daily', 'products', 'categoryDaily']) {
    const removed = await clearCollection(col);
    if (removed) console.log(`  · ${col}: 기존 ${removed}건 삭제`);
  }

  // daily: 날짜를 문서 ID로 (업서트 친화적)
  const nDaily = await writeDocs('daily', data.daily, (d) => d.date);
  console.log(`  ✔ daily: ${nDaily}건`);

  // products: autoId
  const nProd = await writeDocs('products', data.products);
  console.log(`  ✔ products: ${nProd}건`);

  // categoryDaily: autoId
  const nCat = await writeDocs('categoryDaily', data.categoryDaily);
  console.log(`  ✔ categoryDaily: ${nCat}건`);

  // meta/config: 설정/정의 단일 문서
  await db.collection('meta').doc('config').set(data.meta || {});
  console.log('  ✔ meta/config');

  console.log('✅ 시드 완료');
  process.exit(0);
})().catch((e) => {
  console.error('❌ 시드 실패:', e);
  process.exit(1);
});
