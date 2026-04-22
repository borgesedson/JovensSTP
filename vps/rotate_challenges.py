import firebase_admin
from firebase_admin import credentials, firestore
import random
import os

# 1. Configuração do Desafios (Sincronizado com o Pool do Frontend)
CHALLENGES_POOL = [
    {"id": "forro_greeting", "title": "Saudação Forro"},
    {"id": "lunguiie_thanks", "title": "Gratidão Lungui'ie"},
    {"id": "stp_history_quiz", "title": "Mestre da História"},
    {"id": "share_resource", "title": "Partilha um Recurso"},
    {"id": "connect_mentor", "title": "Networking Ativo"}
]

def rotate():
    # 2. Inicializar Firebase
    # Nota: Precisas de colocar o ficheiro serviceAccount.json no mesmo diretório
    cred_path = "/root/serviceAccount.json"
    
    if not os.path.exists(cred_path):
        print(f"❌ Erro: Ficheiro {cred_path} não encontrado!")
        print("Gera um em: Firebase Console > Project Settings > Service Accounts")
        return

    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    # 3. Escolher novo desafio
    new_challenge = random.choice(CHALLENGES_POOL)
    
    # 4. Atualizar settings/current_challenge
    db.collection('settings').document('current_challenge').set({
        "challengeId": new_challenge['id'],
        "updatedAt": firestore.SERVER_TIMESTAMP
    })

    print(f"✅ Desafio do dia atualizado para: {new_challenge['title']}")

if __name__ == "__main__":
    rotate()
