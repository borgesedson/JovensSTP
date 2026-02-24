# 🇸🇹 JovensSTP — A Maior Rede Profissional de São Tomé e Príncipe

JovensSTP é uma plataforma digital inovadora desenhada para capacitar a juventude de São Tomé e Príncipe. Combina redes sociais, academia de aprendizagem, portal de emprego e um mentor inteligente baseado em IA para conectar talentos a oportunidades.

## 🚀 Funcionalidades Principais

-   **💬 Chat & Comunidades**: Comunicação em tempo real alimentada por GetStream.
-   **🎓 Academia (Cursos & Quizzes)**: Integração com YouTube API para cursos e quizzes interativos.
-   **💼 Portal de Emprego**: Listagem de vagas e recursos de carreira para jovens.
-   **🧠 Sebê-Non (Mentor Digital)**: Assistente IA inteligente (OpenAI) para consultoria de negócios e carreira.
-   **🎙️ Live Audio Rooms**: Salas de conversa ao vivo para partilha de conhecimento.

## 🛠️ Tech Stack

-   **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
-   **Backend**: Firebase (Auth, Firestore, Cloud Functions, Storage).
-   **Comunicação**: Stream Chat & Video SDKs.
-   **IA**: OpenAI API (GPT-4o-mini).

## 📦 Instalação e Configuração

### Pré-requisitos
-   Node.js (v18+)
-   Firebase CLI

### Passos
1.  **Clonar o repositório**:
    ```bash
    git clone [URL_DO_REPOSITORIO]
    cd jovensstp_app-main
    ```

2.  **Instalar dependências**:
    ```bash
    npm install
    cd functions && npm install && cd ..
    ```

3.  **Variáveis de Ambiente**:
    Cria um ficheiro `.env` na raiz conforme o `.env.example` e adiciona as tuas chaves:
    - `VITE_STREAM_API_KEY`
    - `VITE_STREAM_VIDEO_API_KEY`
    - `VITE_OPENAI_API_KEY`
    - Configurações do Firebase.

4.  **Executar o projeto**:
    ```bash
    npm run dev
    ```

## 📜 Licença

Propriedade de JovensSTP. Todos os direitos reservados.

---
*Construído com ❤️ para o futuro de São Tomé e Príncipe.*
