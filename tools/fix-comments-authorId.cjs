// Script para corrigir comentários antigos sem o campo authorId
// Execute localmente com Node.js após configurar credenciais do Firebase Admin SDK

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../serviceAccountKey.json');

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

async function fixComments() {
  const storiesSnap = await db.collection('stories').get();
  for (const storyDoc of storiesSnap.docs) {
    const storyId = storyDoc.id;
    const commentsSnap = await db.collection('stories').doc(storyId).collection('comments').get();
    for (const commentDoc of commentsSnap.docs) {
      const data = commentDoc.data();
      // Se já tem authorId, não faz nada
      if (data.authorId) continue;
      // Tenta usar userId, uid, ou ignora se não encontrar
      const authorId = data.userId || data.uid || null;
      if (!authorId) {
        console.log(`Comentário ${commentDoc.id} em story ${storyId} sem authorId, pulando.`);
        continue;
      }
      await commentDoc.ref.update({ authorId });
      console.log(`Corrigido comentário ${commentDoc.id} em story ${storyId} com authorId: ${authorId}`);
    }
  }
  console.log('Correção concluída!');
}

fixComments().catch(console.error);
