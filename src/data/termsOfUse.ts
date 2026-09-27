export interface TermClause {
  number: number;
  title: string;
  paragraphs: string[];
  subitems?: {
    letter?: string;
    text: string;
  }[];
}

export const OFFICIAL_TERMS_CLAUSES: TermClause[] = [
  {
    number: 1,
    title: "Sobre a Plataforma",
    paragraphs: [
      "1.1. Este Termo de Uso estabelece as regras para a utilização do Programa Certo, um ambiente online voltado ao aprendizado e prática de programação e tecnologia.",
      "1.2. A plataforma disponibiliza trilhas de aprendizagem, lições práticas, questionários de fixação, projetos e acompanhamento do seu progresso de estudo.",
      "1.3. Ao criar uma conta e acessar a plataforma, você concorda com todas as regras aqui descritas.",
    ],
  },
  {
    number: 2,
    title: "Cadastro e Conta de Acesso",
    paragraphs: [
      "2.1. Para estudar e salvar seu progresso, é necessário criar uma conta informando seu nome, um e-mail válido e uma senha de acesso.",
      "2.2. Cada conta é de uso pessoal. É proibido compartilhar ou ceder seu acesso para terceiros.",
      "2.3. Você é responsável por manter sua senha em segredo e pelas ações realizadas com a sua conta.",
    ],
  },
  {
    number: 3,
    title: "Acesso Gratuito",
    paragraphs: [
      "3.1. O Programa Certo é uma plataforma 100% gratuita. Todo o conteúdo de lições, trilhas e exercícios é disponibilizado sem qualquer cobrança, taxa ou assinatura.",
      "3.2. Não solicitamos dados de pagamento ou cartão de crédito em nenhum momento.",
    ],
  },
  {
    number: 4,
    title: "Proteção do Conteúdo das Aulas",
    paragraphs: [
      "4.1. Todos os textos explicativos das lições, roteiros teóricos, perguntas dos questionários, logotipos e o visual da plataforma foram criados exclusivamente para o Programa Certo.",
      "4.2. É proibido copiar, redistribuir, republicar ou vender os textos das aulas e questionários em outros sites, redes sociais, apostilas ou grupos de mensagens.",
      "4.3. É vedado assumir autoria sobre o material didático desenvolvido pela plataforma.",
    ],
  },
  {
    number: 5,
    title: "Prática com Códigos e Comandos",
    paragraphs: [
      "5.1. Os exemplos de código-fonte, comandos de terminal e exercícios disponibilizados nas lições podem ser livremente copiados e executados no seu computador ou editor de código para fins de aprendizado e treino.",
      "5.2. O objetivo dos códigos fornecidos é desenvolver a sua capacidade prática de programação.",
    ],
  },
  {
    number: 6,
    title: "O que é Proibido",
    paragraphs: [
      "6.1. Ao utilizar a plataforma, o usuário concorda em não realizar as seguintes práticas:",
    ],
    subitems: [
      {
        letter: "a",
        text: "Copiar ou extrair os textos das lições e testes para publicação externa;",
      },
      {
        letter: "b",
        text: "Usar programas automatizados, robôs ou scripts de varredura para capturar o conteúdo da plataforma;",
      },
      {
        letter: "c",
        text: "Tentar burlar travas de proteção ou trapaças para marcar aulas como concluídas sem estudar;",
      },
      {
        letter: "d",
        text: "Tentar invadir sistemas, praticar engenharia reversa ou enviar códigos maliciosos.",
      },
    ],
  },
  {
    number: 7,
    title: "Envio de Projetos",
    paragraphs: [
      "7.1. Ao enviar projetos e links para avaliação, o aluno declara que a atividade foi desenvolvida por ele com base no conteúdo estudado.",
      "7.2. É proibido o envio de links com vírus, conteúdos maliciosos, ofensivos ou propagandas indevidas.",
    ],
  },
  {
    number: 8,
    title: "Suspensão ou Bloqueio de Acesso",
    paragraphs: [
      "8.1. O descumprimento destas regras, como a cópia indevida de aulas, fraudes ou tentativas de invasão, causará o bloqueio temporário ou definitivo da conta.",
      "8.2. Em caso de bloqueio, o usuário poderá solicitar esclarecimentos ou recurso na Central de Atendimento.",
    ],
  },
  {
    number: 9,
    title: "Central de Atendimento",
    paragraphs: [
      "9.1. Em caso de dúvidas sobre o funcionamento da plataforma ou sobre este termo, o usuário pode enviar uma mensagem diretamente pela Central de Atendimento da plataforma.",
    ],
  },
];

export const OFFICIAL_PRIVACY_CLAUSES: TermClause[] = [
  {
    number: 1,
    title: "Compromisso e Transparência",
    paragraphs: [
      "1.1. Este documento explica de forma clara como o Programa Certo cuida das informações da sua conta e do seu progresso de estudos.",
      "1.2. Nosso compromisso é coletar somente o que for indispensável para você estudar com tranquilidade e manter seu acesso protegido.",
    ],
  },
  {
    number: 2,
    title: "Quais Dados São Coletados",
    paragraphs: [
      "2.1. Guardamos apenas informações necessárias para a sua experiência de aprendizado:",
    ],
    subitems: [
      {
        letter: "a",
        text: "Nome e E-mail: Utilizados para identificar seu perfil e permitir a recuperação de acesso;",
      },
      {
        letter: "b",
        text: "Senha de Acesso: A sua senha não fica salva em texto limpo. Ela passa por processo de criptografia e embaralhamento de caracteres antes de ser enviada ao banco de dados, impedindo que qualquer pessoa que veja as tabelas descubra a sua senha;",
      },
      {
        letter: "c",
        text: "Progresso de Estudo: Registro das aulas concluídas, testes respondidos e links de projetos enviados, para você continuar seus estudos de onde parou;",
      },
      {
        letter: "d",
        text: "Mensagens de Suporte: Mensagens e protocolos abertos por você na Central de Atendimento para que possamos prestar auxílio.",
      },
    ],
  },
  {
    number: 3,
    title: "O que NÃO Coletamos",
    paragraphs: [
      "3.1. Não coletamos dados bancários, números de cartão de crédito ou informações financeiras, visto que a plataforma é totalmente gratuita.",
      "3.2. Não coletamos dados pessoais sensíveis, como biometria, informações médicas ou convicções políticas e religiosas.",
      "3.3. Não rastreamos sua navegação externa nem vendemos seus hábitos para empresas de publicidade.",
    ],
  },
  {
    number: 4,
    title: "Para que Usamos Seus Dados",
    paragraphs: [
      "4.1. As informações que você fornece são utilizadas unicamente para:",
    ],
    subitems: [
      {
        letter: "a",
        text: "Manter o seu login ativo e seguro nos seus aparelhos;",
      },
      {
        letter: "b",
        text: "Salvar o seu histórico de aulas assistidas e projetos concluídos;",
      },
      {
        letter: "c",
        text: "Enviar códigos de recuperação caso você esqueça a sua senha;",
      },
      {
        letter: "d",
        text: "Responder suas dúvidas ou solicitações enviadas na Central de Atendimento.",
      },
    ],
  },
  {
    number: 5,
    title: "Não Venda de Dados",
    paragraphs: [
      "5.1. O Programa Certo não vende, não aluga e não repassa seus dados pessoais para terceiros ou empresas de marketing.",
      "5.2. As informações ficam armazenadas de forma segura e restrita unicamente à infraestrutura necessária para o funcionamento do site.",
    ],
  },
  {
    number: 6,
    title: "Segurança do Acesso",
    paragraphs: [
      "6.1. Adotamos medidas de proteção na comunicação do sistema com o seu navegador, incluindo conexão segura com certificado digital.",
      "6.2. As senhas dos usuários recebem proteção criptografada e embaralhamento com cifras de substituição, garantindo que mesmo os registros internos do sistema não contenham senhas em texto puro legível.",
    ],
  },
  {
    number: 7,
    title: "Seus Direitos",
    paragraphs: [
      "7.1. Você tem total liberdade sobre as informações da sua conta:",
    ],
    subitems: [
      {
        letter: "a",
        text: "Visualizar seus dados e histórico de aprendizado a qualquer momento;",
      },
      {
        letter: "b",
        text: "Atualizar seu nome ou alterar sua senha na aba 'Meu Perfil';",
      },
      {
        letter: "c",
        text: "Solicitar a exclusão permanente e definitiva de sua conta quando desejar.",
      },
    ],
  },
  {
    number: 8,
    title: "Exclusão Definitiva da Conta",
    paragraphs: [
      "8.1. Se decidir não utilizar mais o Programa Certo, você pode apagar sua conta permanentemente acessando a aba 'Meu Perfil' e clicando na opção de excluir conta.",
      "8.2. Para a sua segurança, a exclusão exige a digitação de um código de verificação enviado ao seu e-mail. Após confirmado, todos os seus dados e histórico são removidos permanentemente.",
    ],
  },
  {
    number: 9,
    title: "Contato e Dúvidas",
    paragraphs: [
      "9.1. Se tiver qualquer dúvida sobre o uso de suas informações ou quiser conversar sobre a proteção de seus dados, utilize a Central de Atendimento da própria plataforma.",
    ],
  },
];

export const TERMS_PLAIN_TEXT_FOR_CLIPBOARD = `TERMO DE USO - PROGRAMA CERTO
Plataforma Educacional Programa Certo
Última Atualização: 2026

1. SOBRE A PLATAFORMA
1.1. Este Termo de Uso estabelece as regras para a utilização do Programa Certo, um ambiente online voltado ao aprendizado e prática de programação e tecnologia.
1.2. A plataforma disponibiliza trilhas de aprendizagem, lições práticas, questionários de fixação, projetos e acompanhamento do seu progresso de estudo.
1.3. Ao criar uma conta e acessar a plataforma, você concorda com todas as regras aqui descritas.

2. CADASTRO E CONTA DE ACESSO
2.1. Para estudar e salvar seu progresso, é necessário criar uma conta informando seu nome, um e-mail válido e uma senha de acesso.
2.2. Cada conta é de uso pessoal. É proibido compartilhar ou ceder seu acesso para terceiros.
2.3. Você é responsável por manter sua senha em segredo e pelas ações realizadas com a sua conta.

3. ACESSO GRATUITO
3.1. O Programa Certo é uma plataforma 100% gratuita. Todo o conteúdo de lições, trilhas e exercícios é disponibilizado sem qualquer cobrança, taxa ou assinatura.
3.2. Não solicitamos dados de pagamento ou cartão de crédito em nenhum momento.

4. PROTEÇÃO DO CONTEÚDO DAS AULAS
4.1. Todos os textos explicativos das lições, roteiros teóricos, perguntas dos questionários, logotipos e o visual da plataforma foram criados exclusivamente para o Programa Certo.
4.2. É proibido copiar, redistribuir, republicar ou vender os textos das aulas e questionários em outros sites, redes sociais, apostilas ou grupos de mensagens.
4.3. É vedado assumir autoria sobre o material didático desenvolvido pela plataforma.

5. PRÁTICA COM CÓDIGOS E COMANDOS
5.1. Os exemplos de código-fonte, comandos de terminal e exercícios disponibilizados nas lições podem ser livremente copiados e executados no seu computador ou editor de código para fins de aprendizado e treino.
5.2. O objetivo dos códigos fornecidos é desenvolver a sua capacidade prática de programação.

6. O QUE É PROIBIDO
6.1. Ao utilizar a plataforma, o usuário concorda em não realizar as seguintes práticas:
a) Copiar ou extrair os textos das lições e testes para publicação externa;
b) Usar programas automatizados, robôs ou scripts de varredura para capturar o conteúdo da plataforma;
c) Tentar burlar travas de proteção ou trapaças para marcar aulas como concluídas sem estudar;
d) Tentar invadir sistemas, praticar engenharia reversa ou enviar códigos maliciosos.

7. ENVIO DE PROJETOS
7.1. Ao enviar projetos e links para avaliação, o aluno declara que a atividade foi desenvolvida por ele com base no conteúdo estudado.
7.2. É proibido o envio de links com vírus, conteúdos maliciosos, ofensivos ou propagandas indevidas.

8. SUSPENSÃO OU BLOQUEIO DE ACESSO
8.1. O descumprimento destas regras, como a cópia indevida de aulas, fraudes ou tentativas de invasão, causará o bloqueio temporário ou definitivo da conta.
8.2. Em caso de bloqueio, o usuário poderá solicitar esclarecimentos ou recurso na Central de Atendimento.

9. CENTRAL DE ATENDIMENTO
9.1. Em caso de dúvidas sobre o funcionamento da plataforma ou sobre este termo, o usuário pode enviar uma mensagem diretamente pela Central de Atendimento da plataforma.`;

export const PRIVACY_PLAIN_TEXT_FOR_CLIPBOARD = `TERMO DE PRIVACIDADE E PROTEÇÃO DE DADOS
Plataforma Educacional Programa Certo
Última Atualização: 2026

1. COMPROMISSO E TRANSPARÊNCIA
1.1. Este documento explica de forma clara como o Programa Certo cuida das informações da sua conta e do seu progresso de estudos.
1.2. Nosso compromisso é coletar somente o que for indispensável para você estudar com tranquilidade e manter seu acesso protegido.

2. QUAIS DADOS SÃO COLETADOS
2.1. Guardamos apenas informações necessárias para a sua experiência de aprendizado:
a) Nome e E-mail: Utilizados para identificar seu perfil e permitir a recuperação de acesso;
b) Senha de Acesso: A sua senha não fica salva em texto limpo. Ela passa por processo de criptografia e embaralhamento de caracteres antes de ser enviada ao banco de dados, impedindo que qualquer pessoa que veja as tabelas descubra a sua senha;
c) Progresso de Estudo: Registro das aulas concluídas, testes respondidos e links de projetos enviados, para você continuar seus estudos de onde parou;
d) Mensagens de Suporte: Mensagens e protocolos abertos por você na Central de Atendimento para que possamos prestar auxílio.

3. O QUE NÃO COLETAMOS
3.1. Não coletamos dados bancários, números de cartão de crédito ou informações financeiras, visto que a plataforma é totalmente gratuita.
3.2. Não coletamos dados pessoais sensíveis, como biometria, informações médicas ou convicções políticas e religiosas.
3.3. Não rastreamos sua navegação externa nem vendemos seus hábitos para empresas de publicidade.

4. PARA QUE USAMOS SEUS DADOS
4.1. As informações que você fornece são utilizadas unicamente para:
a) Manter o seu login ativo e seguro nos seus aparelhos;
b) Salvar o seu histórico de aulas assistidas e projetos concluídos;
c) Enviar códigos de recuperação caso você esqueça a sua senha;
d) Responder suas dúvidas ou solicitações enviadas na Central de Atendimento.

5. NÃO VENDA DE DADOS
5.1. O Programa Certo não vende, não aluga e não repassa seus dados pessoais para terceiros ou empresas de marketing.
5.2. As informações ficam armazenadas de forma segura e restrita unicamente à infraestrutura necessária para o funcionamento do site.

6. SEGURANÇA DO ACESSO
6.1. Adotamos medidas de proteção na comunicação do sistema com o seu navegador, incluindo conexão segura com certificado digital.
6.2. As senhas dos usuários recebem proteção criptografada e embaralhamento com cifras de substituição, garantindo que mesmo os registros internos do sistema não contenham senhas em texto puro legível.

7. SEUS DIREITOS
7.1. Você tem total liberdade sobre as informações da sua conta:
a) Visualizar seus dados e histórico de aprendizado a qualquer momento;
b) Atualizar seu nome ou alterar sua senha na aba 'Meu Perfil';
c) Solicitar a exclusão permanente e definitiva de sua conta quando desejar.

8. EXCLUSÃO DEFINITIVA DA CONTA
8.1. Se decidir não utilizar mais o Programa Certo, você pode apagar sua conta permanentemente acessando a aba 'Meu Perfil' e clicando na opção de excluir conta.
8.2. Para a sua segurança, a exclusão exige a digitação de um código de verificação enviado ao seu e-mail. Após confirmado, todos os seus dados e histórico são removidos permanentemente.

9. CONTATO E DÚVIDAS
9.1. Se tiver qualquer dúvida sobre o uso de suas informações ou quiser conversar sobre a proteção de seus dados, utilize a Central de Atendimento da própria plataforma.`;

// Aliases para compatibilidade reversa
export const OFFICIAL_LGPD_CLAUSES = OFFICIAL_PRIVACY_CLAUSES;
export const LGPD_PLAIN_TEXT_FOR_CLIPBOARD = PRIVACY_PLAIN_TEXT_FOR_CLIPBOARD;
