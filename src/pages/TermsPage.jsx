import { ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export const TermsPage = () => {
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
          <h1 className="text-lg font-bold">Termos de Uso</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div>
            <p className="text-sm text-gray-500 mb-4">Última atualização: 14 de novembro de 2025</p>
            <p className="text-gray-700 leading-relaxed">
              Bem-vindo ao <strong>JovensSTP</strong>! Ao criar uma conta e usar nossa plataforma, você concorda com os seguintes termos e condições.
            </p>
          </div>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Aceitação dos Termos</h2>
            <p className="text-gray-700 leading-relaxed">
              Ao acessar e usar o JovensSTP, você concorda em cumprir estes Termos de Uso e todas as leis e regulamentos aplicáveis em São Tomé e Príncipe. Se não concordar com algum destes termos, você não está autorizado a usar esta plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Uso da Plataforma</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 leading-relaxed">
              <li>Você deve ter pelo menos 16 anos de idade para se cadastrar.</li>
              <li>Você é responsável por manter a confidencialidade da sua conta e senha.</li>
              <li>Você concorda em fornecer informações verdadeiras, precisas e atualizadas.</li>
              <li>Você não pode usar a plataforma para atividades ilegais, fraudulentas ou prejudiciais.</li>
              <li>Você não pode criar múltiplas contas ou se passar por outra pessoa ou entidade.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Conteúdo do Usuário</h2>
            <p className="text-gray-700 leading-relaxed mb-2">
              Você mantém todos os direitos sobre o conteúdo que publica na plataforma (posts, comentários, fotos, etc.). No entanto, ao publicar conteúdo, você nos concede uma licença não exclusiva para exibir, distribuir e promover esse conteúdo na plataforma.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Você concorda em não publicar conteúdo que seja ofensivo, difamatório, obsceno, que viole direitos de terceiros ou que infrinja leis aplicáveis.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Vagas e Oportunidades</h2>
            <p className="text-gray-700 leading-relaxed">
              As empresas são responsáveis pela veracidade e legalidade das vagas publicadas. O JovensSTP não garante a disponibilidade, adequação ou legitimidade de qualquer vaga publicada. Os candidatos devem realizar sua própria verificação antes de se candidatar.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Comunidades e Moderação</h2>
            <p className="text-gray-700 leading-relaxed">
              Cada comunidade tem suas próprias regras (guidelines). Moderadores e administradores podem remover conteúdo ou membros que violem as regras. Reservamo-nos o direito de suspender ou encerrar contas que violem estes termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Propriedade Intelectual</h2>
            <p className="text-gray-700 leading-relaxed">
              O design, código, marca e conteúdo da plataforma JovensSTP são protegidos por direitos autorais e outras leis de propriedade intelectual. Você não pode copiar, modificar ou distribuir nosso conteúdo sem permissão.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Limitação de Responsabilidade</h2>
            <p className="text-gray-700 leading-relaxed">
              O JovensSTP é fornecido "como está". Não garantimos que a plataforma esteja sempre disponível, segura ou livre de erros. Não somos responsáveis por danos diretos, indiretos, incidentais ou consequenciais decorrentes do uso da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Alterações aos Termos</h2>
            <p className="text-gray-700 leading-relaxed">
              Podemos atualizar estes Termos de Uso periodicamente. Notificaremos os usuários sobre mudanças significativas. O uso continuado da plataforma após alterações constitui aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Encerramento de Conta</h2>
            <p className="text-gray-700 leading-relaxed">
              Você pode encerrar sua conta a qualquer momento através das configurações. Podemos suspender ou encerrar contas que violem estes termos ou representem risco à segurança da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Contato</h2>
            <p className="text-gray-700 leading-relaxed">
              Se tiver dúvidas sobre estes Termos de Uso, entre em contato: <a href="mailto:suporte@jovensstp.st" className="text-green-600 hover:underline">suporte@jovensstp.st</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
