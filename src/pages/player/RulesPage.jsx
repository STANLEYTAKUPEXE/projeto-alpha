export default function RulesPage() {
  const sections = [
    {
      title: '⚽ Como funciona',
      content: 'O Futsal Manager gerencia os jogos semanais automaticamente. Você confirma presença pelo app e o sistema cuida do resto.',
    },
    {
      title: '🏆 Sistema de Pontos',
      items: [
        { label: 'Presença confirmada e realizada', value: '+5 pts', color: 'text-accent' },
        { label: 'Cancelamento com aviso (>24h antes)', value: '+1 pt', color: 'text-accent' },
        { label: 'Falta sem aviso ou cancelamento tardio (<24h)', value: '-8 pts', color: 'text-danger' },
      ],
    },
    {
      title: '🎖️ Níveis de Jogador',
      items: [
        { label: '🔰 Candidato', value: 'Novo jogador. Precisa de aprovação do admin para entrar nos jogos.', color: 'text-text-muted' },
        { label: '✅ Verificado', value: 'Jogador confiável. Entra automaticamente nos jogos.', color: 'text-accent' },
        { label: '⭐ Admin (Core)', value: 'Fundadores/admins. Acesso total ao sistema.', color: 'text-warning' },
      ],
    },
    {
      title: '📈 Como subir de nível',
      content: 'Candidatos são promovidos a Verificado após 3 jogos consecutivos sem incidentes (sem faltas ou cancelamentos tardios). A promoção é feita pelo admin.',
    },
    {
      title: '⚠️ Baixa Prioridade',
      content: 'Jogadores com pontuação NEGATIVA entram em "Baixa Prioridade". Isso significa que você pode se inscrever nos jogos, mas só entra se sobrar vaga após todos os jogadores com pontos positivos serem alocados.',
    },
    {
      title: '🚫 Política de Cancelamento',
      content: 'Se precisar cancelar, faça com mais de 24 horas de antecedência para não perder pontos. Cancelamentos tardios prejudicam o grupo e resultam em -8 pontos. Faltas sem aviso têm a mesma penalidade.',
    },
    {
      title: '📋 Fluxo de Convocação',
      items: [
        { label: '1.', value: 'Admin cria o jogo', color: 'text-text-muted' },
        { label: '2.', value: 'Sistema notifica jogadores Verificados e Admins', color: 'text-text-muted' },
        { label: '3.', value: 'Candidatos marcam "Tenho Interesse"', color: 'text-text-muted' },
        { label: '4.', value: 'Admin aprova candidatos manualmente', color: 'text-text-muted' },
        { label: '5.', value: '24h antes: convocações encerradas', color: 'text-text-muted' },
        { label: '6.', value: 'Se alguém cancelar, próximo da fila entra automaticamente', color: 'text-text-muted' },
      ],
    },
  ]

  return (
    <div className="px-4 pt-6 pb-4">
      <h1 className="text-2xl font-bold text-text mb-6">Regras do Jogo</h1>
      <div className="flex flex-col gap-4">
        {sections.map((section, i) => (
          <div key={i} className="card">
            <h2 className="font-bold text-text mb-3">{section.title}</h2>
            {section.content && (
              <p className="text-text-muted text-sm leading-relaxed">{section.content}</p>
            )}
            {section.items && (
              <div className="flex flex-col gap-2">
                {section.items.map((item, j) => (
                  <div key={j} className="flex items-start gap-3">
                    <span className="text-sm font-semibold text-text shrink-0">{item.label}</span>
                    <span className={`text-sm ${item.color}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
