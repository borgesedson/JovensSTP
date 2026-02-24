/**
 * Orientation Service
 * Gerencia a lógica do Teste Vocacional e Materiais de Apoio
 */

export const VOCATIONAL_TEST = {
    id: 'vocational-1',
    title: 'Teste Vocacional: Qual o seu perfil?',
    questions: [
        {
            text: "Em um projeto de grupo, qual papel você prefere?",
            options: [
                { text: "Liderar a estratégia e os objetivos", type: "business" },
                { text: "Criar a identidade visual e o design", type: "creative" },
                { text: "Resolver problemas lógicos e técnicos", type: "tech" },
                { text: "Organizar as pessoas e a comunicação", type: "social" }
            ]
        },
        {
            text: "O que mais te atrai em uma tecnologia nova?",
            options: [
                { text: "O potencial de lucro e mercado", type: "business" },
                { text: "A beleza e a experiência de uso", type: "creative" },
                { text: "Como ela funciona por dentro", type: "tech" },
                { text: "Como ela ajuda as pessoas no dia a dia", type: "social" }
            ]
        },
        {
            text: "Como você prefere passar seu tempo livre?",
            options: [
                { text: "Lendo sobre negócios ou investimentos", type: "business" },
                { text: "Desenhando, escrevendo ou criando", type: "creative" },
                { text: "Desmontando eletrônicos ou programando", type: "tech" },
                { text: "Vocalizando causas ou ajudando amigos", type: "social" }
            ]
        },
        {
            text: "Ao resolver um problema, você costuma:",
            options: [
                { text: "Analisar o custo-benefício", type: "business" },
                { text: "Buscar uma solução inovadora/diferente", type: "creative" },
                { text: "Seguir um método lógico e estruturado", type: "tech" },
                { text: "Considerar o impacto nas pessoas", type: "social" }
            ]
        },
        {
            text: "Qual dessas carreiras mais te desperta curiosidade?",
            options: [
                { text: "Gestor de Empresas / CEO", type: "business" },
                { text: "Designer / Diretor de Arte", type: "creative" },
                { text: "Engenheiro de Software / Cientista", type: "tech" },
                { text: "Psicólogo / Gestor de RH", type: "social" }
            ]
        }
    ]
};

export const CAREER_RESOURCES = [
    {
        title: "Manual do Jovem Empreendedor",
        description: "Guia completo do Sebrae para quem quer abrir o seu primeiro negócio.",
        url: "https://www.sebrae.com.br/Sebrae/Portal%20Sebrae/UFs/AP/Anexos/Manual_do_Jovem_Empreendedor.pdf",
        type: "PDF",
        category: "business"
    },
    {
        title: "Guia: Currículo Vencedor 2025",
        description: "Modelos e dicas para criar um CV que as empresas de STP valorizam.",
        url: "https://zety.com/br/blog/como-fazer-um-curriculum-vitae",
        type: "Guia",
        category: "career"
    },
    {
        title: "Hortas Pedagógicas e Agricultura",
        description: "Manual da FAO para criar hortas escolares e comunitárias produtivas.",
        url: "https://www.fao.org/3/a0218p/a0218p.pdf",
        type: "PDF",
        category: "agriculture"
    },
    {
        title: "Marketing Digital para Pequenos Negócios",
        description: "Como usar o Facebook e WhatsApp para vender mais.",
        url: "https://bibliotecas.sebrae.com.br/cronus/idc/digital/v2/doc/pdf/00000000-0000-0000-0000-000000000000/17066.pdf",
        type: "PDF",
        category: "business"
    },
    {
        title: "Boas Práticas de Turismo e Hospitalidade",
        description: "Guia de excelência no atendimento ao turista.",
        url: "https://www.turismo.gov.br/images/pdf/Qualidade_atendimento.pdf",
        type: "PDF",
        category: "tourism"
    },
    {
        title: "Processamento de Frutas Tropicais",
        description: "Aprenda a fazer doces, geleias e conservas para vender.",
        url: "https://www.embrapa.br/busca-de-publicacoes/-/publicacao/1098675/processamento-de-frutas-em-pequena-escala",
        type: "Link",
        category: "agriculture"
    }
];
export const SCHOOL_RESOURCES = [
    {
        title: "Repositório MESTP: Programas 10º-12º",
        description: "Programas oficiais das disciplinas do ensino secundário de STP.",
        url: "https://me.gov.st/repositorio/ensino-secundario",
        category: "10-12",
        type: "Portal"
    },
    {
        title: "Matemática: Preparação 12º Ano",
        description: "Exercícios e exames resolvidos para o final do secundário.",
        url: "https://www.matematica.pt/ensino-secundario/12-ano.php",
        category: "10-12",
        type: "Fichas"
    },
    {
        title: "Português: Textos de Apoio 11º Ano",
        description: "Análise de obras e gramática para o 11º ano.",
        url: "https://me.gov.st/repositorio/textos-apoio-portugues-11",
        category: "10-12",
        type: "PDF"
    },
    {
        title: "USTP: Biblioteca Digital Universitária",
        description: "Recursos académicos da Universidade de São Tomé e Príncipe.",
        url: "https://ustp.gov.st/biblioteca/",
        category: "Superior",
        type: "Portal"
    },
    {
        title: "Metodologia de Investigação Científica",
        description: "Guia para teses e trabalhos universitários.",
        url: "https://www.ispgaya.pt/sites/default/files/documentos/Guia_Metodol_V1_2018.pdf",
        category: "Superior",
        type: "PDF"
    },
    {
        title: "Base de Dados: Portal de Periódicos",
        description: "Acesse artigos científicos gratuitos em português.",
        url: "https://www.periodicos.capes.gov.br/",
        category: "Superior",
        type: "Link"
    }
];

class OrientationService {
    static calculateResult(answers) {
        if (!answers || !Array.isArray(answers)) return null;
        const counts = { business: 0, creative: 0, tech: 0, social: 0 };
        answers.forEach(type => {
            if (counts[type] !== undefined) counts[type]++;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        const primary = sorted[0][0];

        const profiles = {
            business: {
                title: "Empreendedor / Gestor",
                description: "Tens um perfil excelente para detetar oportunidades, liderar equipas e criar o teu próprio negócio em STP.",
                recommendations: ["Empreendedorismo", "Vendas", "Gestão de Projetos", "Finanças"]
            },
            creative: {
                title: "Criativo / Designer",
                description: "O teu ponto forte é a inovação, o design e a comunicação visual. O mundo digital espera por ti.",
                recommendations: ["Design Gráfico", "Marketing Digital", "Criação de Conteúdo", "Artes"]
            },
            tech: {
                title: "Tecnológico / Programador",
                description: "És ótimo a resolver problemas lógicos e a construir ferramentas digitais úteis.",
                recommendations: ["Programação", "Análise de Sistemas", "Segurança Digital", "Hardware"]
            },
            social: {
                title: "Social / Líder Comunitário",
                description: "Tens grande empatia e vocação para ajudar o próximo e desenvolver a comunidade santomense.",
                recommendations: ["Educação", "Psicologia", "Assistência Social", "Liderança"]
            }
        };

        return profiles[primary] || profiles.social;
    }
}

export default OrientationService;
