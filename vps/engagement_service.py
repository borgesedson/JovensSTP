import firebase_admin
from firebase_admin import credentials, firestore, messaging
import random
import os
from datetime import datetime, timedelta

# 1. Pool de Conteúdos e Desafios (Sincronizado e Cultural)
CULTURAL_CONTENT = [
    {"id": "connect_1", "text": "Networking é poder! Liga-te a novos talentos hoje e fortalece a tua rede profissional. 🤝"},
    {"id": "share_1", "text": "Tens uma ideia ou recurso importante? O mural da juventude STP está à espera da tua voz. 📣"},
    {"id": "motivation_1", "text": "A persistência é o caminho para o sucesso. Qual é o teu objetivo inspirador para hoje? ✨"},
    {"id": "blog_1", "text": "Cria um blog no Mural sobre a nossa cultura ou crioulos! Partilha o teu conhecimento com a comunidade. ✍️🌴"},
    {"id": "academia_1", "text": "Tiveste um Meet produtivo? Grava e publica na nossa Academia para ensinar e inspirar outros! 🎓"},
    {"id": "chat_multi_1", "text": "Usa o Chat Multilingue para falar com qualquer pessoa! Traduz as conversas para qualquer língua instantaneamente. 🌍"},
    {"id": "share_app", "text": "A JovensSTP cresce contigo! Convida um amigo e divulga o nosso ecossistema de inovação. 🚀"},
    {"id": "innovate_1", "text": "O futuro de STP depende de ti. Grava um vídeo ou áudio no Meet sobre uma ideia inovadora e partilha! 💡"}
]

CHALLENGES_POOL = [
    {"id": "write_reflection", "title": "Reflexão do Dia", "description": "Escreve um pequeno post no blog sobre o que aprendeste hoje.", "xp": 80, "type": "writing"},
    {"id": "share_resource", "title": "Mestre da Partilha", "description": "Partilha um link ou PDF útil na aba de Recursos ou Mural.", "xp": 70},
    {"id": "connect_mentor", "title": "Networking Ativo", "description": "Segue 3 novos perfis de mentores ou embaixadores hoje.", "xp": 100},
    {"id": "translate_chat", "title": "Poliglota Ativo", "description": "Usa a ferramenta de tradução no chat para comunicar numa língua nova.", "xp": 90},
    {"id": "record_idea", "title": "Mente Inovadora", "description": "Grava uma ideia ou aula no Meet e envia para a Academia.", "xp": 200},
    {"id": "platform_ambassador", "title": "Embaixador da Rede", "description": "Divulga a plataforma ou o teu blog nas tuas redes sociais.", "xp": 120}
]

def run_automation():
    print(f"--- 🚀 Iniciando ciclo de engajamento: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} ---")
    
    cred_path = "/root/serviceAccount.json"
    # Fallback para ambiente local se necessário
    if not os.path.exists(cred_path):
        cred_path = "serviceAccount.json" 

    if not os.path.exists(cred_path):
        print("❌ Erro: Credenciais do Firebase (serviceAccount.json) não encontradas.")
        return

    if not firebase_admin._apps:
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred)
    
    db = firestore.client()

    # --- ROTAÇÃO DE DESAFIO GLOBAL ---
    # Só atualizamos o desafio global se o último tiver mais de 1 hora, para não cansar
    settings_ref = db.collection('settings').document('current_challenge')
    current_doc = settings_ref.get()
    
    should_update_challenge = True
    if current_doc.exists:
        last_update = current_doc.to_dict().get('updatedAt')
        if last_update and (datetime.now(last_update.tzinfo) - last_update).total_seconds() < 3600:
            should_update_challenge = False

    if should_update_challenge:
        new_challenge = random.choice(CHALLENGES_POOL)
        settings_ref.set({
            "challengeId": new_challenge['id'],
            "title": new_challenge['title'],
            "description": new_challenge['description'],
            "xp": new_challenge.get('xp', 50),
            "type": new_challenge.get('type', 'action'),
            "updatedAt": firestore.SERVER_TIMESTAMP
        })
        print(f"✅ Desafio Global atualizado: {new_challenge['title']}")

    # --- NOTIFICAÇÕES DE ENGAJAMENTO DIRECIONADAS ---
    content = random.choice(CULTURAL_CONTENT)
    
    # Seleção Flexível: No início, não ordenamos por 'lastSystemEngagement' 
    # porque quase ninguém tem esse campo ainda. Usamos o limite de 500 para encontrar quem tem tokens.
    users = db.collection('users').limit(500).stream()

    notified_count = 0
    # Guardamos os utilizadores com tokens para processar
    eligible_users = []
    
    for user in users:
        u_data = user.to_dict()
        if u_data.get('fcmTokens'):
            eligible_users.append((user.id, u_data))
    
    # Se houver muitos, escolhemos 20 aleatórios ou os que não foram notificados ultimamente
    # Para o teste inicial, vamos processar os primeiros 20 encontrados com tokens
    for user_id, user_data in eligible_users[:20]:
        # SUFIXO DE CHAMADA PARA AÇÃO (FORÇAR ENTRADA)
        cta_suffix = " Entra agora na plataforma! 🚀"

        # 1. Notificação In-App
        db.collection('notifications').document(user_id).collection('items').add({
            "type": "system_engagement",
            "senderName": "JovensSTP Bot 🌴",
            "message": content['text'] + cta_suffix,
            "link": "/chat" if "chat" in content['text'].lower() else "/discover",
            "read": False,
            "timestamp": firestore.SERVER_TIMESTAMP
        })

        # 2. Push Notification (Se tiver tokens)
        tokens = user_data.get('fcmTokens', [])
        if tokens:
            try:
                # Se for um utilizador inativo há muito tempo, mudamos a mensagem para ser mais apelativa de retorno
                last_login = user_data.get('lastLogin')
                push_title = "Novidade na JovensSTP! ✨"
                push_body = content['text'] + cta_suffix

                if last_login:
                    days_inactive = (datetime.now(last_login.tzinfo) - last_login).days
                    if days_inactive > 7:
                        push_title = "Sentimos a tua falta! 🌴"
                        push_body = f"Temos novidades e desafios novos à tua espera.{cta_suffix}"

                message = messaging.MulticastMessage(
                    notification=messaging.Notification(
                        title=push_title,
                        body=push_body
                    ),
                    tokens=tokens,
                    data={"type": "engagement", "link": "/discover"}
                )
                messaging.send_each_for_multicast(message)
                # Mostrar o nome em vez do ID para facilitar a leitura nos logs
                user_name = user_data.get('displayName') or user_data.get('firstName', user_id)
                print(f"  - Notificado: {user_name}")
            except Exception as e:
                print(f"⚠️ Erro ao enviar push para {user_id}: {e}")

        # Atualizar timestamp no user para que ele passe para o 'fim da fila' da rotatividade
        db.collection('users').document(user_id).update({
            "lastSystemEngagement": firestore.SERVER_TIMESTAMP
        })
        
        notified_count += 1
        if notified_count >= 20: # Aumentado para 20 por ciclo para cobrir inativos mais rápido
            break
    
    print(f"✅ Ciclo concluído. Utilizadores impactados: {notified_count}")

if __name__ == "__main__":
    run_automation()
