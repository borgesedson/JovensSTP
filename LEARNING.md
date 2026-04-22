# 📚 Diário de Aprendizado - JovensSTP

Este documento serve para explicar os conceitos técnicos aplicados no projeto, do básico ao avançado, para que possas dominar a stack.

---

## 🟢 1. JavaScript (A Base)
*   **O que é:** A linguagem que dá vida ao site.
*   **No JovensSTP:** Usado em quase todos os componentes (Botões, formulários, curtidas).

---

## 🟡 2. Node.js & Ambiente (O Motor)
*   **O que é:** O ambiente que permite rodar JavaScript fora do navegador (no servidor).
*   **No JovensSTP:** O seu arquivo `.env` e as `Cloud Functions` do Firebase dependem do Node.js.

---

## 🔵 3. TypeScript (O Porto Seguro) 🚀
> **Este é o ponto que vamos focar agora para o seu aprendizado sênior.**

### O que é o TypeScript?
Pensa no TypeScript como o JavaScript com um "corretor ortográfico" inteligente. No JS comum, podes escrever qualquer coisa e o erro só aparece quando o usuário clica no botão. No TypeScript, o erro aparece **enquanto estás a escrever**.

### Por que estamos a usar no JovensSTP?
No arquivo `functions/src/index.ts`, tínhamos muito código com `: any`. O `any` diz ao computador: *"Ignora este erro, eu sei o que estou a fazer"*. Isso é perigoso em apps grandes.

**Exemplo Prático:**
Se definirmos que um usuário no JovensSTP tem:
```typescript
interface User {
  id: string;
  nome: string;
  email: string;
  isMentor: boolean;
}
```
Se tentares escrever `user.idade`, o TypeScript vai avisar imediatamente: **"Erro! A propriedade 'idade' não existe no Usuário"**. Isso evita bugs antes de o app ir para a Google Play.

---

## 🟣 4. Next.js & Frameworks (A Estrutura)
*   *Em breve...


Hoje eu vou começar dedicar acerca do que eu estou aprendendo no freecodecamp :

