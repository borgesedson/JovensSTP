import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https"
import { setGlobalOptions } from "firebase-functions/v2"
import { EmailService } from "./services/EmailService"

// Global setup
setGlobalOptions({
  maxInstances: 20,
  region: 'us-central1',
  memory: '512MiB'
})

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp()
}

// Lazy load helpers
let _streamClient: any = null;

function getStreamClient() {
  if (_streamClient) return _streamClient;

  const { StreamChat } = require("stream-chat");
  const envSecret = process.env.STREAM_SECRET;
  let secret = envSecret;

  if (!secret) {
    const configSecretPart1 = functions.config().stream?.secret;
    const configSecretPart2 = functions.config().stream?.suffix || "";
    if (configSecretPart1) {
      secret = configSecretPart1 + configSecretPart2;
    }
  }

  const apiKey = process.env.STREAM_API_KEY || functions.config().stream?.apikey || functions.config().stream?.api_key;

  if (!apiKey || !secret) {
    console.error(`❌ Stream API Key or Secret is missing.`);
    throw new HttpsError('failed-precondition', 'Stream API configuration is missing.');
  }

  try {
    _streamClient = StreamChat.getInstance(apiKey, secret);
  } catch (err: any) {
    console.error('❌ Failed to initialize Stream Client:', err);
    throw new HttpsError('internal', 'Chat service initialization failed.');
  }
  return _streamClient;
}


/**
 * Helper to send FCM Push Notifications
 */
async function sendPushToUser(userId: string, title: string, body: string, data: any = {}, options: { channelId?: string, priority?: 'normal' | 'high' } = {}) {
  console.log(`📤 Starting push process for user: ${userId}`);
  try {
    // 1. Tentar buscar da nova coleção (fcm_tokens)
    const tokenDoc = await admin.firestore().collection('fcm_tokens').doc(userId).get();
    let tokens = tokenDoc.data()?.tokens || [];

    // 2. Fallback para a coleção legada (users) se não houver tokens na nova
    if (tokens.length === 0) {
      const userDoc = await admin.firestore().collection('users').doc(userId).get();
      tokens = userDoc.data()?.fcmTokens || [];
    }

    if (!tokens.length) {
      console.log(`📭 No FCM tokens found for user ${userId} (checked fcm_tokens and users)`);
      return;
    }

    console.log(`📡 Sending push to ${tokens.length} potential tokens for ${userId}`);

    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: { title, body },
      data: {
        title,
        body,
        ...Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
      },
      android: { priority: options.priority || 'high' },
      apns: { payload: { aps: { contentAvailable: true } } },
      webpush: { headers: { Urgency: 'high' } },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // 3. Limpeza Automática de Tokens Inválidos
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          // Códigos de erro que indicam token morto/inválido
          if (errCode === 'messaging/invalid-registration-token' || 
              errCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        console.log(`🧹 Removing ${invalidTokens.length} invalid tokens for ${userId}`);
        
        // Remover da nova coleção
        if (tokenDoc.exists) {
          await admin.firestore().collection('fcm_tokens').doc(userId).update({
            tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
          });
        }
        
        // Também tentar remover da coleção legada para manter tudo limpo
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        }).catch(() => {}); // Ignorar erro se o campo fcmTokens não existir
      }
    }
    console.log(`📲 Pushed to ${response.successCount}/${tokens.length} devices for ${userId}`);
  } catch (error) {
    console.error(`❌ Push failed for ${userId}:`, error);
  }
}

async function sendUserEmailNotification(to: string, subject: string, text: string, html?: string) {
  await EmailService.send({ to, subject, text, html });
}

// --- TRIGGERS ---

export const v4_onJobCreated = onDocumentWritten({
  document: 'jobs/{jobId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const jobData = after.data() as any
  const title = jobData?.title || 'Nova vaga'
  const companyName = jobData?.companyName || 'Uma empresa'

  const youngUsers = await admin.firestore().collection('users').where('type', '==', 'young').limit(500).get();
  const promises = youngUsers.docs.map(async (doc) => {
    await sendPushToUser(doc.id, "Nova Vaga Disponível! 💼", `${companyName} procura por: ${title}`, { type: 'new_job', jobId: event.params.jobId });
    const userData = doc.data();
    if (userData?.email) {
      await sendUserEmailNotification(userData.email, ` Nova Vaga: ${title}`, `Nova oportunidade em ${companyName}.`, `<h3>Nova Vaga!</h3><p>${title}</p>`);
    }
  });
  await Promise.all(promises);
});

export const v4_onConnectionRequestCreated = onDocumentWritten({
  document: 'connectionRequests/{requestId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const requestData = after.data() as any
  const { fromId, toId } = requestData;
  if (!toId || !fromId) return;

  const [toUserDoc, fromUserDoc] = await Promise.all([
    admin.firestore().collection('users').doc(toId).get(),
    admin.firestore().collection('users').doc(fromId).get()
  ]);

  if (!toUserDoc.exists || !fromUserDoc.exists) return;
  const fromName = fromUserDoc.data()?.displayName || 'Alguém';

  await sendPushToUser(toId, "Novo Pedido de Conexão 🤝", `${fromName} quer conectar-se contigo!`, { type: 'connection_request', requestId: event.params.requestId });
  const toUser = toUserDoc.data();
  if (toUser?.email) {
    await sendUserEmailNotification(toUser.email, `🤝 @${fromName} pedido`, `${fromName} enviou um pedido.`, `<p>${fromName} quer conectar-se.</p>`);
  }
});

export const v4_onStoryUpdated = onDocumentWritten({
  document: 'stories/{storyId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  const before = event.data?.before;
  if (!after?.exists || !before?.exists) return;

  const afterLikes = after.data()?.likes || [];
  const beforeLikes = before.data()?.likes || [];
  if (afterLikes.length <= beforeLikes.length) return;

  const newLikeUid = afterLikes.find((uid: string) => !beforeLikes.includes(uid));
  const authorId = after.data()?.authorId;
  if (!authorId || authorId === newLikeUid) return;

  const [, likerDoc] = await Promise.all([
    admin.firestore().collection('users').doc(authorId).get(),
    admin.firestore().collection('users').doc(newLikeUid).get()
  ]);
  const likerName = likerDoc.data()?.displayName || 'Alguém';

  await admin.firestore().collection('notifications').doc(authorId).collection('items').add({
    type: 'like',
    message: `${likerName} curtiu a tua publicação`,
    link: '/',
    read: false,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
});

export const v4_onCommentCreated = onDocumentWritten({
  document: 'stories/{storyId}/comments/{commentId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const commentData = after.data() as any;
  const storyDoc = await admin.firestore().collection('stories').doc(event.params.storyId).get();
  if (!storyDoc.exists) return;

  const authorId = storyDoc.data()?.authorId;
  const commenterId = commentData.authorId || commentData.userId;
  if (authorId && authorId !== commenterId) {
    const commenterDoc = await admin.firestore().collection('users').doc(commenterId).get();
    const commenterName = commenterDoc.data()?.displayName || 'Alguém';
    await admin.firestore().collection('notifications').doc(authorId).collection('items').add({
      type: 'comment',
      message: `Novo comentário de ${commenterName}`,
      link: '/',
      read: false,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
  }
});

export const v4_onNotificationCreated = onDocumentWritten({
  document: 'notifications/{userId}/items/{notifId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  if (!after?.exists || event.data?.before?.exists) return;

  const userId = event.params.userId;
  const notifData = after.data() as any;
  const type = notifData.type || 'general';
  
  let title = 'JovensSTP';
  if (type === 'chat_message') title = notifData.senderName || 'Nova Mensagem';
  else if (type === 'like') title = 'Nova Interação ❤️';
  else if (type === 'comment') title = 'Comentário 💬';
  else if (type === 'live') title = 'Live a começar! 🔴';

  await sendPushToUser(userId, title, notifData.message || 'Novidade!', { type, url: notifData.link || '/' });
});

export const v4_onStoryCreated = onDocumentWritten({
  document: 'stories/{storyId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  if (!after?.exists || event.data?.before?.exists) return;

  const storyData = after.data() as any;
  const authorId = storyData?.authorId;
  const authorName = storyData?.authorName || 'Alguém';
  
  const authorDoc = await admin.firestore().collection('users').doc(authorId).get();
  const followers = authorDoc.data()?.followers || [];
  const targets = followers.filter((id: string) => id !== authorId).slice(0, 100);

  const promises = targets.map((id: string) => 
    sendPushToUser(id, authorName, `${authorName} publicou algo novo! 🚀`, { type: 'new_post', storyId: event.params.storyId, url: '/' })
  );
  await Promise.all(promises);
});

export const v4_onUserUpdated = onDocumentWritten({
  document: 'users/{userId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  const before = event.data?.before;
  if (!after?.exists) return;

  const userData = after.data() as any;
  const prevData = before?.exists ? before.data() as any : {};

  if (userData.displayName !== prevData.displayName || userData.photoURL !== prevData.photoURL) {
    try {
      const client = getStreamClient();
      await client.upsertUser({ id: event.params.userId, name: userData.displayName, image: userData.photoURL });
    } catch (e) {}
  }
});

// --- CALLABLES ---

export const v4_sendNotification = onCall({ region: 'us-central1', cors: true }, async (req) => {
  const { userId, title, body, extraData } = req.data;
  await sendPushToUser(userId, title, body, extraData || {});
  return { status: 'ok' };
});

export const v4_createUserStreamToken = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const client = getStreamClient();
  const token = client.createToken(req.auth.uid);
  return { token, streamToken: token };
});

export const v4_createDirectChannel = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  const { otherUserId } = req.data;
  const client = getStreamClient();
  const members = [req.auth.uid, otherUserId].sort();
  const channelId = `chat-${members.join('-')}`;
  const channel = client.channel('messaging', channelId, { members, created_by_id: req.auth.uid });
  await channel.create();
  return { success: true, channelId };
});

export const v4_testPushPing = onCall({ region: 'us-central1', cors: true }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Login required');
  await sendPushToUser(req.auth.uid, "Teste JovensSTP 🏓", "As tuas notificações estão a funcionar!", { type: 'ping' });
  return { success: true };
});

// --- REQUESTS ---

export const v4renderblogseo = onRequest(async (req, res) => {
  const postId = req.path.split('/').filter(p => !!p && p !== 'blog').pop();
  console.log(`🔍 [SEO] Request for path: ${req.path}, Extracted postId: ${postId}`);
  
  if (!postId) {
     res.redirect('/');
     return;
  }

  const ua = req.headers['user-agent'] || '';
  const isBot = /bot|facebook|whatsapp|twitter|slack|linkedin|google|bing|bingbot/i.test(ua);

  if (!isBot) {
    res.send(`
      <html>
        <head>
          <script>
            window.location.href = '/?from_seo=${postId}';
          </script>
        </head>
        <body>Redirecionando...</body>
      </html>
    `);
    return;
  }

  try {
    const postDoc = await admin.firestore().collection('blog_posts').doc(postId).get();
    if (!postDoc.exists) return res.redirect('/');

    const post = postDoc.data() as any;
    const title = post.title || "JovensSTP Blog";
    const titleClean = title.replace(/"/g, '&quot;');
    const coverImage = post.coverImage || "https://jovensstp.com/icon-512.png";
    const excerpt = post.excerpt || "Descobre mais no blog da JovensSTP!";
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${titleClean}</title>
          <meta name="description" content="${excerpt}">
          
          <!-- Open Graph / Facebook -->
          <meta property="og:type" content="article">
          <meta property="og:url" content="https://jovensstp.com/blog/${postId}">
          <meta property="og:title" content="${titleClean}">
          <meta property="og:description" content="${excerpt}">
          <meta property="og:image" content="${coverImage}">

          <!-- Twitter -->
          <meta property="twitter:card" content="summary_large_image">
          <meta property="twitter:title" content="${titleClean}">
          <meta property="twitter:description" content="${excerpt}">
          <meta property="twitter:image" content="${coverImage}">
        </head>
        <body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f9f9f9;">
          <div style="text-align: center; padding: 20px;">
            <h1>${titleClean}</h1>
            <p>Redirecionando para o artigo completo...</p>
            <script>window.location.href = '/blog/${postId}';</script>
          </div>
        </body>
      </html>
    `;
    res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);
  } catch (error) {
    console.error("SEO Renderer error:", error);
    res.redirect('/');
  }
});

// --- ROBUST BLOG TRIGGER (NEW) ---

export const v4_onBlogPostCreated = onDocumentWritten({
  document: 'blog_posts/{postId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  const before = event.data?.before;
  const afterData = after?.data() as any;
  const beforeData = before?.data() as any;

  if (afterData?.status !== 'published' || beforeData?.status === 'published') return;

  const title = afterData.title || 'Novo Artigo';
  console.log(`📝 [BLOG] Publishing notification for: ${title}`);

  try {
    // Buscar todos os utilizadores que têm tokens na nova coleção
    const tokensSnap = await admin.firestore().collection('fcm_tokens').get();
    const targets = tokensSnap.docs;
    
    console.log(`📣 Broadcasting to ${targets.length} users via fcm_tokens`);

    for (let i = 0; i < targets.length; i += 50) {
      const chunk = targets.slice(i, i + 50);
      await Promise.all(chunk.map(d => sendPushToUser(d.id, `Novo Artigo: ${title} 📖`, "Vem ver o que há de novo!", { type: 'blog', postId: event.params.postId, url: `/blog/${event.params.postId}` })));
    }
  } catch (e) {
    console.error("Blog broadcast failed", e);
  }
});