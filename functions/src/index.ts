import * as functions from "firebase-functions"
import * as admin from "firebase-admin"
import { onDocumentWritten } from "firebase-functions/v2/firestore"
import { onCall, onRequest, HttpsError, CallableRequest } from "firebase-functions/v2/https"
import { setGlobalOptions } from "firebase-functions/v2"
import { findNearbyCandidatesBackend } from "./matching"
// import { EmailService } from "./services/EmailService"

// Global setup
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
  // Stitch secret from two pieces (or use full secret if available)
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
    console.error(`❌ Stream API Key or Secret is missing. API Key: ${!!apiKey}, Secret: ${!!secret}`);
    // Log available keys for debugging (safe)
    console.log('Environment Keys:', Object.keys(process.env).filter(k => k.includes('STREAM')));
    console.log('Config Keys:', functions.config().stream ? Object.keys(functions.config().stream) : 'None');
    throw new HttpsError('failed-precondition', 'Stream API configuration is missing.');
  }

  // Debug secret safety (log only parts)
  console.log(`📡 Using Stream API Key: ${apiKey}`);
  console.log(`🛡️ Secret identifier: ${secret.substring(0, 5)}...${secret.substring(secret.length - 4)} (Length: ${secret.length})`);

  try {
    if (!apiKey || !secret) {
      console.error('❌ Stream API configuration missing at runtime!');
    }
    _streamClient = StreamChat.getInstance(apiKey, secret);
  } catch (err: any) {
    console.error('❌ Failed to initialize Stream Client:', err);
    throw new HttpsError('internal', 'Chat service initialization failed. Check server logs.');
  }
  return _streamClient;
}



function getAppUrl(): string {
  return process.env.APP_URL || functions.config().app?.url || 'https://jovensstp.com/'
}



/**
 * 1. v4_onJobCreated
 */
export const v4_onJobCreated = onDocumentWritten({
  document: 'jobs/{jobId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const jobData = after.data() as any
  const title = jobData?.title || 'Nova vaga'
  const companyName = jobData?.companyName || 'Uma empresa'

  console.log(`🚀 Broadcasting new job: ${title}`);

  // Notify all "young" users about the new job
  const youngUsers = await admin.firestore().collection('users')
    .where('type', '==', 'young')
    .limit(500) // Safety limit for now
    .get();

  const promises = youngUsers.docs.map(async (doc) => {
    // 1. Push Genérico
    await sendPushToUser(
      doc.id,
      "Nova Vaga Disponível! 💼",
      `${companyName} procura por: ${title}`,
      { type: 'new_job', jobId: event.params.jobId }
    );

    // 2. Email Notification (New)
    const userData = doc.data();
    if (userData?.email) {
      await sendUserEmailNotification(
        userData.email,
        ` Nova Vaga: ${title}`,
        `Uma nova oportunidade de emprego foi publicada por ${companyName}. Abra o app para ver mais detalhes.`,
        `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
           <h2 style="color: #16a34a;">Nova Oportunidade! 🚀</h2>
           <p>Olá <b>${userData.displayName || 'Candidato'}</b>,</p>
           <p>A empresa <b>${companyName}</b> acabou de publicar uma vaga que pode ser do teu interesse:</p>
           <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #16a34a;">
             <h3 style="margin: 0; color: #15803d;">${title}</h3>
             <p style="margin: 5px 0 0; color: #666;">${companyName}</p>
           </div>
           <p>Não percas tempo e candidata-te agora!</p>
           <center>
             <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ver Vaga no App</a>
           </center>
         </div>`
      );
    }
  });

  await Promise.all(promises);
});

/**
 * 2. v4_onConnectionRequestCreated
 */
export const v4_onConnectionRequestCreated = onDocumentWritten({
  document: 'connectionRequests/{requestId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const requestData = after.data() as any

  // Quem enviou (sender)
  const fromId = requestData.fromId;
  const toId = requestData.toId;

  if (!toId || !fromId) return;

  console.log(`🔗 New Connection Request: ${fromId} -> ${toId}`)

  try {
    // Buscar dados dos usuários
    const [toUserDoc, fromUserDoc] = await Promise.all([
      admin.firestore().collection('users').doc(toId).get(),
      admin.firestore().collection('users').doc(fromId).get()
    ]);

    if (!toUserDoc.exists || !fromUserDoc.exists) return;

    const toUser = toUserDoc.data();
    const fromUser = fromUserDoc.data();
    const fromName = fromUser?.displayName || 'Alguém';

    // 1. Send Push
    await sendPushToUser(
      toId,
      "Novo Pedido de Conexão 🤝",
      `${fromName} quer conectar-se contigo!`,
      { type: 'connection_request', requestId: event.params.requestId }
    );

    // 2. Send Email
    if (toUser?.email) {
      await sendUserEmailNotification(
        toUser.email,
        `🤝 ${fromName} quer conectar-se contigo`,
        `${fromName} enviou um pedido de conexão. Aceita agora para expandir tua rede.`,
        `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
               <h2 style="color: #16a34a;">Networking JovensSTP</h2>
               <div style="text-align: center; margin: 20px 0;">
                  ${fromUser?.photoURL ? `<img src="${fromUser.photoURL}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #16a34a;">` : ''}
                  <h3 style="margin-top: 10px;">${fromName}</h3>
                  <p style="color: #666;">quer fazer parte da tua rede.</p>
               </div>
               <center>
                 <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ver Pedido</a>
               </center>
             </div>`
      );
    }

  } catch (error) {
    console.error("Error processing connection request:", error);
  }
});

/**
 * 2.1. v4_onStoryUpdated (Likes)
 * Detects when 'likes' array changes in a story
 */
export const v4_onStoryUpdated = onDocumentWritten({
  document: 'stories/{storyId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  const before = event.data?.before;

  if (!after?.exists || !before?.exists) return;

  const afterData = after.data() as any;
  const beforeData = before.data() as any;

  const afterLikes = afterData.likes || [];
  const beforeLikes = beforeData.likes || [];

  // Check if a NEW like was added
  if (afterLikes.length > beforeLikes.length) {
    // Find who liked (exists in after but not before)
    const newLikeUid = afterLikes.find((uid: string) => !beforeLikes.includes(uid));

    if (newLikeUid) {
      const authorId = afterData.authorId;
      // Don't notify if user liked their own post
      if (authorId && authorId !== newLikeUid) {
        console.log(`❤️ New Like detected: ${newLikeUid} on post ${event.params.storyId}`);

        try {
          const [authorDoc, likerDoc] = await Promise.all([
            admin.firestore().collection('users').doc(authorId).get(),
            admin.firestore().collection('users').doc(newLikeUid).get()
          ]);

          const author = authorDoc.data();
          const liker = likerDoc.data();
          const likerName = liker?.displayName || 'Alguém';

          // 1. Email Notification (Priority for engagement)
          if (author?.email) {
            await sendUserEmailNotification(
              author.email,
              `❤️ ${likerName} gostou da tua publicação`,
              `${likerName} curtiu o que publicaste. Abre o app para ver!`,
              `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                               <h2 style="color: #ef4444;">Novo Like! ❤️</h2>
                               <p>A tua publicação está a fazer sucesso!</p>
                               <p><b>${likerName}</b> acabou de curtir.</p>
                               <center>
                                 <a href="${getAppUrl()}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ver Publicação</a>
                               </center>
                             </div>`
            );
          }

          // Push Notification allows realtime feedback
          await sendPushToUser(
            authorId,
            "Novo Like! ❤️",
            `${likerName} curtiu a tua publicação`,
            { type: 'like', storyId: event.params.storyId }
          );

        } catch (e) {
          console.error("Error sending like notification:", e);
        }
      }
    }
  }
});

/**
 * 2.2. v4_onCommentCreated
 * Listen to subcollection 'comments'
 */
export const v4_onCommentCreated = onDocumentWritten({
  document: 'stories/{storyId}/comments/{commentId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return; // Only notify on creation

  const commentData = after.data() as any;
  const storyId = event.params.storyId;

  try {
    // Fetch parent story to get author
    const storyDoc = await admin.firestore().collection('stories').doc(storyId).get();
    if (!storyDoc.exists) return;

    const storyData = storyDoc.data() as any;
    const authorId = storyData.authorId;
    const commenterId = commentData.authorId || commentData.userId; // Adjust field name based on schema

    // Don't notify self
    if (authorId && authorId !== commenterId) {
      console.log(`💬 New Comment detected on ${storyId}`);

      const [authorDoc, commenterDoc] = await Promise.all([
        admin.firestore().collection('users').doc(authorId).get(),
        admin.firestore().collection('users').doc(commenterId).get()
      ]);

      const author = authorDoc.data();
      const commenter = commenterDoc.data();
      const commenterName = commenter?.displayName || commentData.authorName || 'Alguém';
      const commentText = commentData.text || '';

      // 1. Email
      if (author?.email) {
        await sendUserEmailNotification(
          author.email,
          `💬 Novo comentário de ${commenterName}`,
          `${commenterName} comentou: "${commentText}"`,
          `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                       <h2 style="color: #16a34a;">Novo Comentário 💬</h2>
                       <p><b>${commenterName}</b> comentou na tua publicação:</p>
                       <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #16a34a; font-style: italic;">
                         "${commentText}"
                       </blockquote>
                       <center>
                         <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Responder Agora</a>
                       </center>
                     </div>`
        );
      }

      // 2. Push
      await sendPushToUser(
        authorId,
        `Novo comentário de ${commenterName}`,
        commentText,
        { type: 'comment', storyId: storyId, commentId: event.params.commentId }
      );
    }
  } catch (e) {
    console.error("Error sending comment notification:", e);
  }
});

/**
 * 3. v4_onStoryCreated
 */
export const v4_onStoryCreated = onDocumentWritten({
  document: 'stories/{storyId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after
  if (!after?.exists) return
  const storyData = after.data() as any
  const userName = storyData?.userName || 'Alguém'

  console.log("🎬 Broadcasting new story");

  // Broadcast story to a sample of users (could be followers in future)
  const users = await admin.firestore().collection('users')
    .limit(200)
    .get();

  const promises = users.docs.map(async (doc) => {
    // 1. Push
    await sendPushToUser(
      doc.id,
      "Nova Story! 🎬",
      `${userName} partilhou uma nova story.`,
      { type: 'new_story', storyId: event.params.storyId }
    );

    // 2. Email
    const userData = doc.data();
    if (userData?.email) {
      await sendUserEmailNotification(
        userData.email,
        `🎬 Nova Story de ${userName}`,
        `${userName} acabou de publicar uma nova story.`,
        `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                   <h2 style="color: #16a34a;">Nova Publicação! 🎬</h2>
                   <div style="text-align: center; margin: 20px 0;">
                      <h3 style="margin-top: 10px;">${userName}</h3>
                      <p style="color: #666;">partilhou algo novo na rede.</p>
                   </div>
                   <center>
                     <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Ver Story</a>
                   </center>
                 </div>`
      );
    }
  });

  await Promise.all(promises);
});

/**
 * 4. v4_onCommunityUpdated
 */
export const v4_onCommunityUpdated = onDocumentWritten({
  document: 'communities/{communityId}',
  region: 'us-central1'
}, async (event) => {
  console.log("Community updated");
});

/**
 * Helper to send FCM Push Notifications
 */
async function sendPushToUser(userId: string, title: string, body: string, data: any = {}, options: { channelId?: string, priority?: 'normal' | 'high' } = {}) {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens || [];

    if (!tokens.length) {
      console.log(`📭 No FCM tokens for user ${userId}`);
      return;
    }

    // Default sound/priority
    const message: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK', // Standard for many apps, or handle in SW
      },
      android: {
        priority: options.priority || 'high',
        notification: {
          sound: 'default',
          channelId: options.channelId || 'jovens_messages',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            contentAvailable: true,
          },
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    // Cleanup invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errCode = resp.error?.code;
          if (errCode === 'messaging/invalid-registration-token' ||
            errCode === 'messaging/registration-token-not-registered') {
            invalidTokens.push(tokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await admin.firestore().collection('users').doc(userId).update({
          fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
        });
        console.log(`🧹 Removed ${invalidTokens.length} invalid tokens for ${userId}`);
      }
    }

    console.log(`📲 Pushed to ${response.successCount}/${tokens.length} devices for ${userId}`);
  } catch (error) {
    console.error(`❌ Push failed for ${userId}:`, error);
  }
}

/**
 * 5. v4_handleMessageWebhook (Stream Webhook)
 * Sends Push Notification + Email Backup
 */
export const v4_handleMessageWebhook = onRequest(async (req, res) => {
  console.log("📨 Webhook Triggered!");
  const event = req.body;

  if (!event || !event.type) {
    console.log("❌ Invalid Webhook Payload", JSON.stringify(req.body));
    res.status(400).send("Invalid payload");
    return;
  }

  console.log(`🔹 Event Type: ${event.type}`);

  if (event.type === 'message.new') {
    const { message, channel, user: sender } = event;
    // Members who should receive notification
    const members = channel.members || [];
    console.log(`👥 Channel Members: ${members.length}`);

    for (const member of members) {
      // Don't notify sender
      if (member.user_id === sender.id) continue;

      console.log(`👉 Processing member: ${member.user_id}`);
      if (member.user_id !== sender.id) {
        // 1. Send Push Notification (Fallback/Manual)
        // Stream Native Push is preferred, this acts as secondary backup.
        await sendPushToUser(
          member.user_id,
          `${sender.name || 'Alguém'} enviou uma mensagem`,
          message.text || '📷 (Foto/Arquivo)',
          { type: 'chat_message', channelId: channel.id, senderId: sender.id }
        );

        // 2. Send Email (Backup)
        try {
          const userDoc = await admin.firestore().collection('users').doc(member.user_id).get();
          if (!userDoc.exists) continue;

          const userData = userDoc.data();
          if (userData?.email) {
            console.log(`📧 Sending email to ${userData.email}`);
            await sendUserEmailNotification(
              userData.email,
              `Nova mensagem de ${sender.name || 'JovensSTP'}`,
              `${message.text}`,
              `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
                <h2 style="color: #16a34a;">JovensSTP</h2>
                <p>Você recebeu uma nova mensagem de <b>${sender.name || sender.id}</b>:</p>
                <blockquote style="background: #f9f9f9; padding: 15px; border-left: 5px solid #16a34a;">
                  ${message.text || '<i>(Conteúdo multimídia)</i>'}
                </blockquote>
                <p style="margin-top: 20px;">
                  <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Responder agora</a>
                </p>
              </div>`
            );
          } else {
            console.log(`⚠️ User ${member.user_id} has no email configured.`);
          }
        } catch (e) {
          console.error(`❌ Error processing email for ${member.user_id}:`, e);
        }
      }
    }
  }

  res.status(200).send({ status: 'ok' });
});

// ... (v4_createUserStreamToken, v4_setupCommunityChannel, etc. remain unchanged)

// ...

/**
 * 9. v4_sendNotification (Push + Email)
 */
export const v4_sendNotification = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  const data = request.data || {};
  const { userId, title, body, extraData } = data;
  console.log(`Sending notification to ${userId}: ${title}`);

  // 1. Send Push
  await sendPushToUser(userId, title, body, extraData || {});

  // 2. Send Email Backup (if available)
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (userData?.email) {
      await sendUserEmailNotification(
        userData.email,
        title || 'Nova Notificação - JovensSTP',
        body || 'Você recebeu uma nova mensagem no App.',
        `<h3>${title}</h3><p>${body}</p><p><a href="${getAppUrl()}">Abrir App</a></p>`
      );
    }
  } catch (err) {
    console.error('Error in sendNotification (Email part):', err);
  }

  return { status: 'processed' };
});

/**
 * 10. v4_notifyIncomingCall
 * Triggered when a user initiates a call logic from client
 */
export const v4_notifyIncomingCall = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  const data = request.data || {};
  const { targetUserId, callerName, callType, callId } = data; // callType: 'audio' | 'video'

  console.log(`📞 Incoming call from ${callerName} to ${targetUserId}`);

  await sendPushToUser(
    targetUserId,
    `Chamada de ${callType === 'video' ? 'Vídeo' : 'Áudio'}`,
    `${callerName} está a ligar...`,
    {
      type: 'incoming_call',
      callId,
      callType,
      callerName,
      click_action: 'FLUTTER_NOTIFICATION_CLICK'
    },
    {
      channelId: 'jovens_messages', // Reverting to standard channel to ensure delivery
      priority: 'high'
    }
  );

  return { status: 'notified' };
});

/**
 * 6. v4_createUserStreamToken
 * Generates token and ensures user exists in Stream
 */
export const v4_createUserStreamToken = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
  const data = request.data || {};
  const { userName } = data;
  const uid = request.auth.uid;

  const serverClient = getStreamClient();

  // Upsert user to ensure they exist in Stream
  try {
    await serverClient.upsertUser({
      id: uid,
      name: userName || request.auth.token.name || 'Usuário',
      image: request.auth.token.picture || undefined
    });
  } catch (err) {
    console.warn(`⚠️ Erro ao upsertUser no Chat: ${uid}`, err);
  }

  const token = serverClient.createToken(uid);
  console.log(`✅ Token gerado e usuário sincronizado para UID: ${uid}`);
  return { token, streamToken: token };
});

/**
 * 7. v4_setupCommunityChannel
 */
export const v4_setupCommunityChannel = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
  const data = request.data || {};
  const { communityId, communityName, imageUrl } = data;
  if (!communityId) throw new HttpsError('invalid-argument', 'Missing communityId');

  const serverClient = getStreamClient();
  const channelId = communityId.startsWith('community-') ? communityId : `community-${communityId}`;

  try {
    const channel = serverClient.channel('messaging', channelId, {
      name: communityName || 'Community',
      image: imageUrl || undefined,
      members: [request.auth.uid],
      created_by_id: request.auth.uid,
    });

    await channel.create();
    // Ensure the calling user is added as a member
    await channel.addMembers([request.auth.uid]);

    return { success: true, channelId };
  } catch (error: any) {
    console.error('Error setting up community channel:', error);
    throw new HttpsError('internal', error.message || 'Failed to setup channel');
  }
});

export const v4_createVideoToken = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
  const uid = request.auth.uid;
  const serverClient = getStreamClient();

  // For video, we might use the same client or a specific one, but upsertUser is common
  try {
    await serverClient.upsertUser({
      id: uid,
      name: request.auth.token.name || 'Usuário',
      image: request.auth.token.picture || undefined
    });
  } catch (err) {
    console.warn(`⚠️ Erro ao upsertUser no Video: ${uid}`, err);
  }

  const token = serverClient.createToken(uid);
  return { token };
});

/**
 * 10. v4_ensureStreamUsers
 * On-demand synchronization of users to Stream
 */
export const v4_ensureStreamUsers = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
  const data = request.data || {};
  const { userIds } = data;
  if (!userIds || !Array.isArray(userIds)) throw new HttpsError('invalid-argument', 'userIds must be an array');

  const serverClient = getStreamClient();
  const usersToUpsert: any[] = [];

  for (const uid of userIds) {
    try {
      const userDoc = await admin.firestore().doc(`users/${uid}`).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        usersToUpsert.push({
          id: uid,
          name: userData?.displayName || 'Usuário',
          image: userData?.photoURL || undefined
        });
      }
    } catch (err) {
      console.warn(`⚠️ Falha ao buscar dados para sync do usuário ${uid}:`, err);
    }
  }

  if (usersToUpsert.length > 0) {
    try {
      await serverClient.upsertUsers(usersToUpsert);
      console.log(`✅ ${usersToUpsert.length} usuários sincronizados com Stream.`);
      return { success: true, count: usersToUpsert.length };
    } catch (error: any) {
      console.error('❌ Erro no upsertUsers do Stream:', error);
      throw new HttpsError('internal', 'Falha na sincronização de usuários.');
    }
  }

  return { success: true, count: 0 };
});

export const v4_debugPush = onRequest(async (req, res) => {
  console.log("🐛 v4_debugPush HIT!");
  console.log("Body:", req.body);
  console.log("Query:", req.query);
  res.status(200).send("Debug Push OK - Check Logs");
});

export const v4_diagnoseUser = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  // Set CORS headers manually as extra safety for 2nd gen
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  const userId = req.query.userId as string || req.body.userId;
  if (!userId) {
    res.status(400).json({ error: 'Missing userId parameter' });
    return;
  }

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens || [];

    // Attempt Force Push
    let pushResult = null;
    if (tokens.length > 0) {
      console.log(`🔫 Forcing push to ${userId} with ${tokens.length} tokens`);
      await sendPushToUser(userId, "Teste Diagnóstico", "Se recebeste isto, o problema é o Webhook!", { type: 'test_diagnosis' });
      pushResult = "Attempted send";
    }

    res.status(200).json({
      userId,
      hasEmail: !!userData?.email,
      tokenCount: tokens.length,
      tokens: tokens, // BE CAREFUL: viewing tokens is sensitive, but ok for debug
      pushResult
    });

  } catch (error: any) {
    console.error('Diagnosis failed:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper to send email notifications via SendGrid
 */
async function sendUserEmailNotification(to: string, subject: string, text: string, html?: string) {
  // Swapped to use centralized EmailService
  await EmailService.send({ to, subject, text, html });
}

/**
 * 12. v4_onUserUpdated
 * Syncs user profile changes to Stream Chat
 */
export const v4_onUserUpdated = onDocumentWritten({
  document: 'users/{userId}',
  region: 'us-central1'
}, async (event) => {
  const after = event.data?.after;
  const before = event.data?.before;

  if (!after?.exists) return; // User deleted (handle if needed)

  const userData = after.data() as any;
  const previousData = before?.exists ? before.data() as any : {};

  // Check if relevant fields changed
  const nameChanged = userData.displayName !== previousData.displayName;
  const imageChanged = userData.photoURL !== previousData.photoURL;

  if (nameChanged || imageChanged) {
    console.log(`🔄 Syncing user ${event.params.userId} to Stream Chat (Profile Update)`);
    try {
      const serverClient = getStreamClient();
      await serverClient.upsertUser({
        id: event.params.userId,
        name: userData.displayName || 'Usuário',
        image: userData.photoURL || undefined
      });
      console.log(`✅ User ${event.params.userId} synced to Stream.`);
    } catch (error) {
      console.error(`❌ Failed to sync user ${event.params.userId} to Stream:`, error);
    }
  }
});

/**
 * 13. v4_sendNotificationEmail
 * Bypasses Stream Webhooks entirely
 */
export const v4_sendNotificationEmail = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  console.log('🚀 [v4_sendNotificationEmail] Function called!', {
    hasAuth: !!request.auth,
    authUid: request.auth?.uid,
    dataKeys: Object.keys(request.data || {})
  });

  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const data = request.data || {};
  const { recipientIds, type, messageText, senderName } = data;

  if (!recipientIds || !Array.isArray(recipientIds)) {
    throw new HttpsError('invalid-argument', 'recipientIds must be an array');
  }

  console.log(`📧 Direct email notification: ${type} from ${senderName} to ${recipientIds.length} recipients`);

  const emailPromises = recipientIds.map(async (recipientId: string) => {
    try {
      const userDoc = await admin.firestore().collection('users').doc(recipientId).get();
      if (!userDoc.exists) return;

      const userData = userDoc.data();
      if (!userData?.email) return;

      let subject = `Novidades de ${senderName || 'JovensSTP'}`;
      let title = "Notificação";
      let icon = "🔔";

      switch (type) {
        case 'message':
          subject = `💬 Mensagem de ${senderName}`;
          title = "Nova Mensagem";
          icon = "💬";
          break;
        case 'story':
        case 'post':
          subject = `🎬 Publicação de ${senderName}`;
          title = "Nova Publicação";
          icon = "🎬";
          break;
        case 'job':
          subject = `💼 Nova Vaga: ${senderName}`;
          title = "Oportunidade";
          icon = "💼";
          break;
        case 'connection':
          subject = `🤝 Convite de ${senderName}`;
          title = "Conexão";
          icon = "🤝";
          break;
      }

      const html = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #f0f0f0; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #16a34a; margin: 0; font-size: 24px;">${icon} ${title}</h1>
          </div>
          <p>Olá, <b>${userData.displayName || 'Jovem'}</b>!</p>
          <p>Temos novidades para ti. <b>${senderName || 'Alguém'}</b> realizou uma ação que precisas de ver:</p>
          
          <div style="background: #f8fafc; padding: 16px; border-left: 4px solid #16a34a; border-radius: 4px; margin: 20px 0; font-style: italic;">
            "${messageText || '(Sem detalhes adicionais)'}"
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">Abrir JovensSTP</a>
          </div>
          
          <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">
            Recebeste este email porque estás registado na JovensSTP.<br>
            © 2026 JovensSTP - São Tomé e Príncipe
          </p>
        </div>
      `;

      await EmailService.send({ to: userData.email, subject, text: messageText || subject, html });
    } catch (e) {
      console.error(`❌ Error notifying ${recipientId}:`, e);
    }
  });

  await Promise.all(emailPromises);
  return { success: true };
});


/**
 * 12. v4_getMatches
 */
export const v4_getMatches = onCall({ region: 'us-central1', cors: true }, async (request: CallableRequest) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');

  const userId = request.auth.uid;
  const data = request.data || {};
  const userDoc = await admin.firestore().collection('users').doc(userId).get();
  const userProfile = userDoc.data() as any;

  const limit = data.limit || 200;
  const suggestions = await findNearbyCandidatesBackend(userId, userProfile, limit);

  return { success: true, suggestions };
});

/**
 * 13. v4_getLandingStats
 * Public endpoint for landing page statistics
 */
export const v4_getLandingStats = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  // Set CORS headers manually as extra safety for 2nd gen
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  try {
    const usersRef = admin.firestore().collection('users');
    const jobsRef = admin.firestore().collection('jobs');

    const [youngSnap, jobSnap, companySnap] = await Promise.all([
      usersRef.where('type', '==', 'young').count().get(),
      jobsRef.where('status', '==', 'active').count().get(),
      usersRef.where('type', '==', 'company').count().get()
    ]);

    res.status(200).json({
      youngCount: youngSnap.data().count,
      jobCount: jobSnap.data().count,
      companyCount: companySnap.data().count,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error in v4_getLandingStats:', error);
    res.status(500).json({ error: 'Internal error', message: error.message });
  }
});


/**
 * 14. v4_scheduledReengagement
 * Runs DAILY at 18:00 to check for inactive users (1 day inactivity)
 */
import { onSchedule } from "firebase-functions/v2/scheduler";

export const v4_scheduledReengagement = onSchedule({
  schedule: "0 18 * * *", // Every day at 6 PM
  timeZone: "America/Sao_Paulo", // Correction: Ensure user timezone overlap
  region: 'us-central1'
}, async (event) => {
  console.log("⏰ Running Scheduled Re-engagement Job");

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000); // Cooldown (Optional)

  try {
    // Find users active > 24h ago
    // Note: Firestore strictly requires composite index for 'lastActive' < X.

    const snapshot = await admin.firestore().collection('users')
      .where('lastActive', '<', oneDayAgo)
      .limit(50) // Batch processing
      .get();

    const promises = snapshot.docs.map(async (doc) => {
      const userData = doc.data();
      if (!userData.email) return;

      // Check Cooldown: Don't spam if we sent an email recently (e.g., 2 days)
      const lastEmail = userData.lastReengagementEmail ? userData.lastReengagementEmail.toDate() : new Date(0);
      if (now.getTime() - lastEmail.getTime() < 48 * 60 * 60 * 1000) {
        return;
      }

      console.log(`📧 Sending re-engagement to ${userData.email}`);

      await sendUserEmailNotification(
        userData.email,
        `Vê o que perdeste hoje no JovensSTP! 👀`,
        `Olá ${userData.displayName}, tens novidades à tua espera no app.`,
        `<div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 600px;">
                   <h2 style="color: #16a34a;">Sentimos a tua falta! 👋</h2>
                   <p>Olá <b>${userData.displayName || 'Jovem'}</b>,</p>
                   <p>Há muita coisa a acontecer na rede hoje:</p>
                   <ul style="color: #555;">
                     <li>🔥 Novas oportunidades de emprego publicadas</li>
                     <li>💬 Conversas interessantes na comunidade</li>
                     <li>🚀 Conexões novas para fazer</li>
                   </ul>
                   <p>Não fiques de fora!</p>
                   <center>
                     <a href="${getAppUrl()}" style="background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Entrar no App</a>
                   </center>
                   <p style="font-size: 12px; color: #999; margin-top: 20px;">Recebeste este email porque estás inativo há mais de 24h.</p>
                 </div>`
      );

      // Update cooldown
      await doc.ref.update({ lastReengagementEmail: now });
    });

    await Promise.all(promises);
    console.log(`✅ Processed ${promises.length} potential re-engagement targets.`);

  } catch (e) {
    console.error("❌ Re-engagement job failed:", e);
  }
});

