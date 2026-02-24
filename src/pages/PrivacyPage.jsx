import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const PrivacyPage = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Política de Privacidade</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">Última atualização: 14 de novembro de 2025</p>
            <p className="text-gray-700 leading-relaxed">
              O <strong>JovensSTP</strong> respeita a tua privacidade. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos as tuas informações pessoais.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Informações que Coletamos</h2>
            <h3 className="font-semibold text-gray-800 mb-2">1.1 Informações Fornecidas por Ti</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3 leading-relaxed">
              <li>Nome, email, senha (criptografada)</li>
              <li>Foto de perfil, bio, localização</li>
              <li>Informações profissionais (educação, skills, experiência)</li>
              <li>Conteúdo que publicas (posts, comentários, mensagens)</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mb-2">1.2 Informações Coletadas Automaticamente</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
              <li>Endereço IP, tipo de dispositivo, navegador</li>
              <li>Dados de uso (páginas visitadas, tempo de sessão)</li>
              <li>Cookies e tecnologias similares para melhorar a experiência</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Como Usamos as Tuas Informações</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
              <li>Para fornecer e melhorar os serviços da plataforma</li>
              <li>Para conectar jovens profissionais com empresas e oportunidades</li>
              <li>Para personalizar a tua experiência (feed, recomendações)</li>
              <li>Para enviar notificações sobre atividades relevantes (mensagens, vagas, conexões)</li>
              <li>Para prevenir fraudes e garantir a segurança da plataforma</li>
              <li>Para cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Compartilhamento de Informações</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Nós <strong>não vendemos</strong> as tuas informações pessoais. Podemos compartilhar informações nas seguintes situações:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
              <li><strong>Com outros usuários:</strong> Informações do teu perfil público (nome, foto, bio) são visíveis para outros membros.</li>
              <li><strong>Com empresas:</strong> Quando te candidatas a vagas, teus dados de perfil são compartilhados com a empresa.</li>
              <li><strong>Com provedores de serviços:</strong> Firebase (Google), GetStream Chat para funcionalidades da plataforma.</li>
              <li><strong>Por obrigação legal:</strong> Se exigido por lei ou autoridades competentes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Segurança dos Dados</h2>
            <p className="text-gray-700 leading-relaxed">
              Implementamos medidas de segurança técnicas e organizacionais para proteger as tuas informações contra acesso não autorizado, perda ou destruição. Isso inclui criptografia de dados sensíveis, autenticação segura e monitoramento de atividades suspeitas.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Os Teus Direitos</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Tens o direito de:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-1 leading-relaxed">
              <li>Acessar e atualizar as tuas informações pessoais</li>
              <li>Solicitar a exclusão da tua conta e dados</li>
              <li>Optar por não receber notificações promocionais</li>
              <li>Solicitar uma cópia dos teus dados</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-3">
              Para exercer esses direitos, contacta-nos em <a href="mailto:privacidade@jovensstp.st" className="text-green-600 hover:underline">privacidade@jovensstp.st</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Retenção de Dados</h2>
            <p className="text-gray-700 leading-relaxed">
              Mantemos as tuas informações enquanto a tua conta estiver ativa ou conforme necessário para fornecer serviços. Quando solicitas a exclusão da conta, removemos os teus dados pessoais, exceto informações que devemos reter por obrigação legal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Cookies</h2>
            <p className="text-gray-700 leading-relaxed">
              Usamos cookies para melhorar a tua experiência, manter a sessão ativa e analisar o uso da plataforma. Podes configurar o teu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Menores de Idade</h2>
            <p className="text-gray-700 leading-relaxed">
              A plataforma é destinada a usuários com pelo menos 16 anos de idade. Não coletamos intencionalmente informações de menores de 16 anos. Se descobrirmos que coletamos dados de um menor, tomaremos medidas para deletá-los imediatamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Alterações a Esta Política</h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre alterações significativas através da plataforma ou por email. Recomendamos que revises esta página regularmente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contato</h2>
            <p className="text-gray-700 leading-relaxed">
              Se tiveres dúvidas sobre esta Política de Privacidade ou sobre como tratamos os teus dados, contacta-nos:
            </p>
            <p className="text-gray-700 mt-2">
              Email: <a href="mailto:privacidade@jovensstp.st" className="text-green-600 hover:underline">privacidade@jovensstp.st</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
