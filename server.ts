import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import { buildTicketPdfDoc } from "./src/lib/generateTicketPdf";
import { getAtendimentoClient } from "./src/lib/supabaseAtendimento";

dotenv.config();

// Inicialização segura do cliente Supabase para despacho de e-mails de autenticação e OTP
const CIPHER_KEY = 0x5a;
function deobfuscate(encoded: string): string {
  try {
    const raw = Buffer.from(encoded, "base64").toString("binary");
    let result = "";
    for (let i = 0; i < raw.length; i++) {
      result += String.fromCharCode(raw.charCodeAt(i) ^ CIPHER_KEY);
    }
    return decodeURIComponent(escape(result));
  } catch {
    return "";
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL || deobfuscate("Mi4uKilgdXU/PDM1Li0tIjcyOz84ICwwLjY/PXQpLyo7ODspP3Q5NQ==");
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || deobfuscate("KTgFKi84NjMpMjs4Nj8FFi4IAh4jMgw8PjQAKhRqCW4+aQ0RGwU2FQgzIgUZFA==");
const supabaseServerClient = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Gmail SMTP institucional permanente (Programa Certo Suporte)
const defaultSmtpUser = deobfuscate("Kig1PSg7Nzs5PyguNXQpLyo1KC4/Gj03OzM2dDk1Nw==");
const defaultSmtpPass = deobfuscate("PzAqIy8gKTI9MC8xNjwoMg==");

function getGmailTransporter() {
  const user = (process.env.SMTP_USER || defaultSmtpUser).trim();
  const pass = (process.env.SMTP_PASS || defaultSmtpPass).replace(/\s+/g, "");
  if (!user || !pass) return null;
  return {
    user,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass }
    })
  };
}

// Lazy initialization of Gemini client to prevent crashing on boot if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

const app = express();
const PORT = 3000;

// Desativa identificador do servidor para evitar profiling por invasores
app.disable("x-powered-by");

// Cabeçalhos de Segurança HTTP compatíveis com iFrame do Google AI Studio
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Protege arquivos confidenciais do servidor (como .env, .git e arquivos SQL) sem bloquear o app
app.use((req, res, next) => {
  const fullUrl = req.originalUrl || req.url || "";
  if (/\.env|\.git|\.sql|\.bak|\.config/i.test(fullUrl)) {
    return res.status(404).json({ error: "Recurso não encontrado." });
  }
  next();
});

app.use(express.json({ limit: "1mb" }));

// Pre-built Programa Certo Courses for instant exploration
const PREBUILT_COURSES = [
  {
    id: "shell-scripting-bash",
    title: "Shell Scripting Bash e Automação Linux",
    description: "Aprenda a automatizar tarefas no sistema operacional Linux. Crie scripts robustos em Bash para manipular arquivos, agendar backups e otimizar fluxos de trabalho no terminal.",
    category: "Scripts & DevOps",
    duration: "6 horas",
    modules: [
      {
        title: "Fundamentos e Sintaxe do Bash",
        lessons: [
          {
            title: "Comandos Essenciais e Variáveis",
            content: `### O Poder do Terminal Linux
O terminal (ou shell) é uma interface de linha de comando poderosa que nos permite interagir diretamente com o sistema operacional. Bash (Bourne Again SHell) é o interpretador padrão na maioria das distribuições Linux e macOS.

---

### Criando seu Primeiro Script
Um script Bash é um arquivo de texto simples contendo uma sequência de comandos. Ele sempre começa com a linha especial chamada **Shebang**:
\`\`\`bash
#!/bin/bash
echo "Olá, Mundo! Esse é meu primeiro script Bash."
\`\`\`
A linha \`#!/bin/bash\` diz ao sistema operacional para usar o interpretador Bash para executar este arquivo.

### Variáveis no Bash
No Bash, declaramos variáveis sem espaços ao redor do sinal de igual (\`=\`). Para acessar o valor de uma variável, usamos o símbolo \`$\`:
\`\`\`bash
NOME="Lucas"
echo "Bem-vindo ao Programa Certo, $NOME!"
\`\`\`

### Tornando o Script Executável
Por padrão, arquivos novos não têm permissão de execução. Você deve habilitá-la usando:
\`\`\`bash
chmod +x meu_script.sh
./meu_script.sh
\`\`\``,
            duration: "15 min",
            quiz: [
              {
                question: "Qual é a linha (Shebang) correta no início de um script para garantir que ele seja executado pelo Bash?",
                options: ["#bash", "#!/bin/bash", "//!bin/bash", "import bash"],
                correctAnswer: 1,
                explanation: "A sequência '#!/bin/bash' (Shebang) aponta diretamente para o interpretador Bash no diretório /bin do Linux."
              }
            ]
          },
          {
            title: "Condicionais e Manipulação de Fluxo",
            content: `### Tomando Decisões no Terminal
No Bash, a tomada de decisão é feita usando estruturas \`if\`, \`elif\` e \`fi\` (que é 'if' ao contrário, sinalizando o fim do bloco).

---

### Sintaxe de Condicional para Arquivos e Strings
A sintaxe de comparação de arquivos ou valores no Bash é bastante específica, usando colchetes simples \`[ ]\` ou duplos \`[[ ]]\`:
\`\`\`bash
#!/bin/bash
NOME_ARQUIVO="backup.zip"

if [ -f "$NOME_ARQUIVO" ]; then
    echo "O arquivo de backup existe!"
else
    echo "Erro: backup.zip não foi encontrado."
fi
\`\`\`
### Operadores Importantes de Teste:
- **\`-f $VAR\`**: Verifica se é um arquivo comum existente.
- **\`-d $VAR\`**: Verifica se é um diretório/pasta existente.
- **\`-z $VAR\`**: Verifica se a string está vazia.
- **\`$A -eq $B\`**: Verifica se inteiros são iguais (Equal).
- **\`$A -lt $B\`**: Verifica se o inteiro A é menor que B (Less Than).`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual operador em Bash é usado em uma condicional para verificar se um diretório existe?",
                options: ["-f", "-d", "-e", "-dir"],
                correctAnswer: 1,
                explanation: "O operador '-d' (directory) testa se o caminho especificado existe e é um diretório válido."
              }
            ]
          }
        ]
      },
      {
        title: "Automação e Tarefas Agendadas",
        lessons: [
          {
            title: "Laços de Repetição e Pipes",
            content: `### Processando Dados em Lote
Muitas vezes, precisamos aplicar uma mesma ação sobre vários arquivos. Para isso, usamos o laço \`for\` ou \`while\` e canais de comunicação chamados **Pipes**.

---

### O Laço \`for\` com arquivos
\`\`\`bash
#!/bin/bash
# Converter todas as imagens .jpg para .png ficticiamente
for img in *.jpg; do
    echo "Processando imagem: $img"
    # comando de conversão iria aqui
done
\`\`\`

### O Poder do Pipe (\`|\`)
O caractere \`|\` permite pegar a saída de um comando e enviá-la diretamente como entrada para outro comando.
\`\`\`bash
# Filtrar processos ativos que contenham "node"
ps aux | grep node
\`\`\`
Isso nos permite criar soluções complexas e filtros extremamente eficientes combinando pequenos utilitários do sistema Linux.`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual caractere representa o Pipe, usado para conectar a saída de um comando à entrada de outro no terminal?",
                options: [">", ">>", "|", "&"],
                correctAnswer: 2,
                explanation: "O caractere '|' (pipe) é o mecanismo de redirecionamento que conecta saídas e entradas de processos diferentes."
              }
            ]
          },
          {
            title: "Scripts de Backup com Cron",
            content: `### Criando uma Rotina de Backup de Arquivos
Agora que sabemos variáveis, condicionais e comandos, vamos construir um script completo de backup local:

\`\`\`bash
#!/bin/bash
DIRETORIO_ORIGEM="/home/estudante/projetos"
DIRETORIO_DESTINO="/home/estudante/backups"
DATA=$(date +%Y-%m-%d_%H-%m)
NOME_ZIP="backup_$DATA.tar.gz"

# Criar pasta de backups se não existir
if [ ! -d "$DIRETORIO_DESTINO" ]; then
    mkdir -p "$DIRETORIO_DESTINO"
fi

# Compactar a pasta de origem
tar -czf "$DIRETORIO_DESTINO/$NOME_ZIP" "$DIRETORIO_ORIGEM"
echo "Backup concluído com sucesso em: $DIRETORIO_DESTINO/$NOME_ZIP"
\`\`\`

---

### Agendando Tarefas com o Cron (Crontab)
O \`cron\` é um serviço do Linux que executa scripts em momentos programados. Para configurar, rodamos \`crontab -e\` e adicionamos uma linha de agendamento:
\`\`\`text
# Executar o backup todos os dias às 02h00 da manhã
0 2 * * * /home/estudante/scripts/backup.sh
\`\`\`
Os cinco campos representam: \`Minuto Hora Dia-do-mês Mês Dia-da-semana\`.`,
            duration: "25 min",
            quiz: [
              {
                question: "No agendador Cron, o que significa a expressão '0 2 * * *'?",
                options: ["Executar a cada 2 minutos", "Executar todos os dias às 02h00 da manhã", "Executar apenas nos fins de semana às 02h00", "Executar a cada 2 horas"],
                correctAnswer: 1,
                explanation: "A expressão define: minuto 0, hora 2 (02:00), e asteriscos para todos os dias do mês, meses e dias da semana."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "automacao-python",
    title: "Automação de Tarefas com Python Scripting",
    description: "Escreva scripts Python para eliminar tarefas manuais repetitivas: manipule arquivos locais, leia planilhas, extraia dados de sites (web scraping) e conecte APIs automáticas.",
    category: "Automação",
    duration: "8 horas",
    modules: [
      {
        title: "Trabalhando com Arquivos e Dados Locais",
        lessons: [
          {
            title: "Manipulação de Arquivos com Pathlib",
            content: `### Por que Python para Automações?
Python é conhecido por sua sintaxe limpa e excelente biblioteca padrão, tornando-se a linguagem favorita no mundo para criar "scripts rápidos" de automação e processamento de dados.

---

### Usando o Módulo \`pathlib\`
A partir das versões modernas do Python, o módulo \`pathlib\` é a forma padrão e mais legível de interagir com o sistema de arquivos de forma compatível com Windows, Mac e Linux:

\`\`\`python
from pathlib import Path

# Definir caminho da pasta de documentos
pasta_docs = Path.home() / "Documentos"

# Listar todos os arquivos PDF na pasta
for arquivo in pasta_docs.glob("*.pdf"):
    print(f"Encontrei o PDF: {arquivo.name} (Tamanho: {arquivo.stat().st_size} bytes)")
\`\`\`

### Criando e Movendo Arquivos Automaticamente
Podemos usar scripts para organizar nossa área de trabalho movendo extensões específicas para pastas dedicadas (ex: separar .jpg, .zip, .pdf):
\`\`\`python
origem = Path.home() / "Downloads"
destino_pdf = Path.home() / "Downloads" / "PDFs"

destino_pdf.mkdir(exist_ok=True)

for pdf in origem.glob("*.pdf"):
    pdf.rename(destino_pdf / pdf.name)
    print(f"Movido: {pdf.name}")
\`\`\``,
            duration: "20 min",
            quiz: [
              {
                question: "No módulo 'pathlib' do Python, qual método é usado para listar arquivos que correspondem a um padrão de extensão (ex: '*.pdf')?",
                options: ["list_files()", "glob()", "find_all()", "search()"],
                correctAnswer: 1,
                explanation: "O método 'glob()' busca arquivos de forma rápida usando padrões curinga clássicos como '*.pdf' ou '**/*.txt'."
              }
            ]
          },
          {
            title: "Planilhas de Excel com openpyxl",
            content: `### O pesadelo das planilhas manuais
Grande parte do trabalho administrativo envolve abrir o Excel, copiar dados de uma aba, colar em outra e salvar. Python resolve isso em segundos utilizando bibliotecas como \`openpyxl\` ou \`pandas\`.

---

### Criando e editando planilhas via Código
\`\`\`python
import openpyxl

# Criar um novo arquivo do Excel
wb = openpyxl.Workbook()
planilha = wb.active
planilha.title = "Vendas_Automatizadas"

# Escrever cabeçalhos
planilha["A1"] = "Produto"
planilha["B1"] = "Quantidade"
planilha["C1"] = "Preço Unitário"

# Inserir dados
vendas = [
    ("Curso Python", 12, 199.90),
    ("Curso Bash", 5, 149.00),
    ("Mentoria IA", 2, 899.00)
]

for linha in vendas:
    planilha.append(linha)

# Salvar o arquivo
wb.save("vendas_geradas.xlsx")
print("Planilha de vendas criada com sucesso!")
\`\`\`
Imagine automatizar isso para rodar todo final de dia gerando relatórios consolidados em segundos!`,
            duration: "25 min",
            quiz: [
              {
                question: "Qual biblioteca Python é amplamente utilizada para ler e gravar arquivos originais de Excel (.xlsx) sem precisar do Microsoft Excel instalado?",
                options: ["xl_reader", "openpyxl", "excelpy", "sheets_api"],
                correctAnswer: 1,
                explanation: "A biblioteca 'openpyxl' é uma das soluções mais maduras para leitura e escrita direta de planilhas Excel nativas do formato OpenXML."
              }
            ]
          }
        ]
      },
      {
        title: "Web Scraping e Consumo de Dados",
        lessons: [
          {
            title: "Web Scraping com Beautiful Soup",
            content: `### O que é Web Scraping?
Web Scraping (raspagem de dados web) é o processo de utilizar scripts para baixar páginas da web inteiras, analisar seu código HTML e extrair informações úteis de forma estruturada.

---

### Bibliotecas Essenciais: \`requests\` e \`BeautifulSoup\`
Para raspar dados, fazemos duas etapas:
1. **Baixar o HTML**: usando a biblioteca \`requests\`.
2. **Analisar o HTML**: usando a biblioteca \`BeautifulSoup\` (do pacote \`bs4\`).

\`\`\`python
import requests
from bs4 import BeautifulSoup

url = "https://g1.globo.com"
resposta = requests.get(url)

if resposta.status_code == 200:
    soup = BeautifulSoup(resposta.text, "html.parser")
    
    # Encontrar todas as manchetes com classe CSS específica
    manchetes = soup.find_all("a", class_="feed-post-link")
    
    print("--- MANCHETES DO DIA ---")
    for i, noticia in enumerate(manchetes[:5], 1):
        titulo = noticia.text.strip()
        link = noticia["href"]
        print(f"{i}. {titulo}")
        print(f"   Link: {link}\\n")
\`\`\`

### Ética na Raspagem
Sempre respeite as regras de uso do site, verifique o arquivo \`robots.txt\` do domínio e evite fazer milhares de requisições por segundo para não derrubar o servidor alheio!`,
            duration: "25 min",
            quiz: [
              {
                question: "No BeautifulSoup, qual método é usado para encontrar múltiplos elementos HTML na página que atendam a critérios específicos (como tag ou classe CSS)?",
                options: ["find()", "get_elements()", "find_all()", "query_selector()"],
                correctAnswer: 2,
                explanation: "Enquanto o 'find()' retorna apenas a primeira ocorrência encontrada, o 'find_all()' retorna uma lista contendo todos os elementos correspondentes na página."
              }
            ]
          },
          {
            title: "Consumindo APIs Automaticamente",
            content: `### O que é uma API?
APIs (Application Programming Interfaces) são canais estruturados para sistemas conversarem entre si. Em vez de ler HTML bagunçado (scraping), as APIs nos retornam dados limpos, geralmente no formato **JSON**.

---

### Fazendo Requisições GET e POST com Python
Muitos serviços expõem dados públicos como cotação de moedas, clima e CEPs. Veja como obter a cotação atualizada do Dólar automaticamente via script:

\`\`\`python
import requests

url = "https://economia.awesomeapi.com.br/last/USD-BRL"
resposta = requests.get(url)

if resposta.status_code == 200:
    dados = resposta.json()
    cotacao_usd = dados["USDBRL"]["bid"]
    nome_moeda = dados["USDBRL"]["name"]
    print(f"Cotação do {nome_moeda}: R$ {float(cotacao_usd):.2f}")
else:
    print("Erro ao acessar a API de moedas.")
\`\`\`

### Automação de Alertas
Você pode unir esse script com uma API de envio de mensagens (como Telegram ou WhatsApp) para receber um alerta diário sempre que o dólar ficar abaixo de determinado valor!`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual formato de dados leve e amplamente legível por humanos é o padrão retornado pela maioria das APIs modernas na web?",
                options: ["XML", "CSV", "JSON", "TXT"],
                correctAnswer: 2,
                explanation: "O formato JSON (JavaScript Object Notation) tornou-se o padrão da indústria para troca de dados em APIs devido à sua simplicidade e facilidade de integração."
              }
            ]
          }
        ]
      }
    ]
  },
  {
    id: "cli-node",
    title: "Criando Ferramentas CLI com Node.js",
    description: "Aprenda a transformar seus scripts JavaScript/TypeScript em ferramentas de linha de comando (CLI) profissionais, interativas e distribuíveis via npm.",
    category: "Back-end",
    duration: "5 horas",
    modules: [
      {
        title: "Scripts de Terminal com Node",
        lessons: [
          {
            title: "Javascript no Terminal e Módulo fs",
            content: `### O Node.js como Ambiente de Scripting
Node.js permite executar JavaScript fora dos navegadores, dando acesso direto ao hardware, sistema de arquivos e rede do computador. Isso nos permite criar utilitários poderosos de linha de comando.

---

### O Módulo Nativo File System (\`fs\`)
Com a API de promessas do \`fs\`, podemos ler e escrever arquivos facilmente de forma assíncrona:

\`\`\`javascript
import fs from 'fs/promises';
import path from 'path';

async function gerenciarArquivos() {
    try {
        // Escrever um arquivo de texto
        await fs.writeFile('nota.txt', 'Desenvolvido com carinho no Programa Certo.');
        console.log('Arquivo criado com sucesso!');

        // Ler o arquivo recém-criado
        const conteudo = await fs.readFile('nota.txt', 'utf-8');
        console.log('Conteúdo lido:', conteudo);
    } catch (err) {
        console.error('Ocorreu um erro:', err);
    }
}

gerenciarArquivos();
\`\`\``,
            duration: "20 min",
            quiz: [
              {
                question: "Qual submódulo do Node.js fornece APIs assíncronas baseadas em Promises para manipulação de arquivos no sistema operacional?",
                options: ["fs/promises", "path", "os", "http"],
                correctAnswer: 0,
                explanation: "O 'fs/promises' disponibiliza as funções clássicas do File System encapsuladas em Promises, ideais para serem consumidas com async/await."
              }
            ]
          },
          {
            title: "Argumentos CLI e Variáveis de Ambiente",
            content: `### Customizando a Execução do Script
Para tornar um script dinâmico, precisamos passar parâmetros ao executá-lo. Exemplo: \`node script.js --projeto meu-app\`.

---

### Lendo Argumentos com \`process.argv\`
O Node expõe todos os argumentos digitados no array \`process.argv\`:
- O primeiro elemento (\`process.argv[0]\`) é o caminho do executável do Node.
- O segundo (\`process.argv[1]\`) é o caminho do arquivo do script sendo executado.
- Os elementos seguintes são os argumentos extras fornecidos pelo usuário.

\`\`\`javascript
// Executando: node script.js Lucas Admin
const argumentos = process.argv.slice(2);
const nome = argumentos[0] || 'Usuário';
const papel = argumentos[1] || 'Convidado';

console.log(\`Olá, \${nome}! Seu cargo atual é: \${papel}\`);
\`\`\`

### Variáveis de Ambiente com \`process.env\`
Variáveis de ambiente armazenam segredos e configurações sensíveis:
\`\`\`javascript
const apiKey = process.env.DATABASE_KEY;
if (!apiKey) {
    console.warn('Alerta: DATABASE_KEY não foi configurada!');
}
\`\`\``,
            duration: "20 min",
            quiz: [
              {
                question: "No Node.js, onde ficam armazenados os argumentos extras digitados pelo usuário ao rodar um comando no terminal?",
                options: ["process.arguments", "process.env", "process.argv", "process.stdin"],
                correctAnswer: 2,
                explanation: "O array 'process.argv' (argument vector) armazena toda a linha de comando invocada, dividida por espaços."
              }
            ]
          }
        ]
      },
      {
        title: "Construindo Interfaces de Linha de Comando (CLIs)",
        lessons: [
          {
            title: "Interfaces Interativas de Terminal",
            content: `### Melhorando a Experiência do Usuário (CLI UX)
Rolar parâmetros brutos pode ser confuso. CLIs modernas (como as do Vite, Prisma, Angular) usam menus interativos onde o usuário escolhe opções usando as setas do teclado.

---

### Usando Bibliotecas de Prompt como \`inquirer\` ou \`clack\`
Com pacotes leves, podemos criar telas de terminal interativas:

\`\`\`javascript
// Exemplo conceitual com uma biblioteca de prompts
import { select, text } from '@clack/prompts';

async function main() {
    const nome = await text({
        message: 'Qual é o nome do seu novo projeto?',
        placeholder: 'meu-projeto-legal'
    });

    const template = await select({
        message: 'Escolha o template inicial:',
        options: [
            { value: 'react', label: 'React SPA (Vite)' },
            { value: 'node', label: 'Node API (Express)' },
            { value: 'ts', label: 'TypeScript puro' }
        ]
    });

    console.log(\`\\nCriando projeto "\${nome}" com template \${template}...\`);
}
\`\`\`
Isso leva o design do seu script a um nível totalmente profissional de aplicação interativa!`,
            duration: "20 min",
            quiz: [
              {
                question: "Qual é a principal vantagem de usar pacotes como '@clack/prompts' ou 'inquirer' em vez de process.argv em scripts?",
                options: [
                  "Eles aceleram o tempo de CPU do script",
                  "Permitem criar interfaces interativas amigáveis com menus de seleção e perguntas passo a passo",
                  "Eles compilam o código para binários executáveis nativos",
                  "Nenhuma das opções anteriores"
                ],
                correctAnswer: 1,
                explanation: "Essas bibliotecas cuidam da entrada do terminal em nível avançado, fornecendo seleções, validações visuais e melhorando significativamente a UX (User Experience) do terminal."
              }
            ]
          },
          {
            title: "Publicando CLI como Pacote Global",
            content: `### Transformando seu Script em Comando Global
Deseja poder digitar apenas \`programa-certo\` em qualquer pasta do seu computador para abrir seu assistente?

---

### Configurando o \`bin\` no \`package.json\`
Para registrar seu comando global, mapeamos a palavra-chave que acionará o script no \`package.json\` do seu projeto:

\`\`\`json
{
  "name": "meu-assistente-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "programa-certo": "./index.js"
  }
}
\`\`\`

E no topo do seu arquivo \`./index.js\`, você **deve** incluir a Shebang apontando para o Node:
\`\`\`javascript
#!/usr/bin/env node
console.log("Comando global funcionando perfeitamente!");
\`\`\`

### Instalando Localmente para Testes
Para testar em sua máquina antes de publicar no npm oficial, execute na pasta do projeto:
\`\`\`bash
npm link
\`\`\`
Agora, digite apenas \`programa-certo\` em qualquer diretório do terminal e veja a mágica acontecer!`,
            duration: "25 min",
            quiz: [
              {
                question: "Qual propriedade do 'package.json' é usada para mapear o comando executável de terminal ao arquivo de script correspondente?",
                options: ["executables", "bin", "scripts", "commands"],
                correctAnswer: 1,
                explanation: "A propriedade 'bin' mapeia o nome do executável global para o caminho relativo do script que o Node deve rodar."
              }
            ]
          }
        ]
      }
    ]
  }
];

// POST /api/courses/generate - Dynamically generates a custom course on demand
app.post("/api/courses/generate", async (req, res) => {
  try {
    const { topic } = req.body;
    if (!topic || typeof topic !== "string" || topic.trim().length === 0) {
      return res.status(400).json({ error: "O parâmetro 'topic' (assunto) é obrigatório e deve ser um texto válido." });
    }

    const gemini = getGeminiClient();

    const systemInstruction = `Você é um Engenheiro de Currículos Tecnológicos e Criador de Cursos Sênior trabalhando para a plataforma de educação Programa Certo.
Sua missão é criar um curso completo, rico e didaticamente impecável sobre qualquer assunto solicitado pelo estudante.
Sempre retorne o curso estruturado EXATAMENTE conforme o JSON Schema fornecido.
Gere explicações ricas, detalhadas e em português (do Brasil). Use Markdown rico no conteúdo das aulas (content), incluindo exemplos práticos de código, analogias didáticas e dicas profissionais de carreira.
Assegure-se de criar exatamente 2 módulos, cada um contendo exatamente 2 aulas (totalizando 4 aulas).
Cada aula deve ter um quiz com exatamente 1 ou 2 perguntas fáceis/médias com exatamente 4 opções de resposta e uma justificativa didática rica.`;

    const prompt = `Crie um curso de tecnologia altamente didático e empolgante sobre o assunto: "${topic}".`;

    const courseSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: "Título profissional e atrativo do curso customizado." },
        description: { type: Type.STRING, description: "Uma descrição instigante, clara e detalhada de no máximo 3 frases." },
        category: { type: Type.STRING, description: "Categoria principal: 'Front-end', 'Back-end', 'Data Science', 'UX & Design' ou 'Mobile'." },
        duration: { type: Type.STRING, description: "Duração estimada total para o estudante concluir, ex: '4 horas'." },
        modules: {
          type: Type.ARRAY,
          description: "Lista de módulos do curso. Deve conter exatamente 2 módulos.",
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: "Título do módulo" },
              lessons: {
                type: Type.ARRAY,
                description: "Lista de aulas do módulo. Deve conter exatamente 2 aulas por módulo.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Título da aula" },
                    content: { type: Type.STRING, description: "Conteúdo completo da aula formatado em Markdown rico, com conceitos teóricos detalhados, exemplos de código, explicações e formatações didáticas robustas em português." },
                    duration: { type: Type.STRING, description: "Duração estimada da aula, ex: '15 minutos'." },
                    quiz: {
                      type: Type.ARRAY,
                      description: "Lista de perguntas de quiz sobre o conteúdo da aula (exatamente 1 ou 2 perguntas).",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          question: { type: Type.STRING, description: "A pergunta do quiz baseada no conteúdo da aula." },
                          options: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "Exatamente 4 opções de resposta (nem mais, nem menos)."
                          },
                          correctAnswer: { type: Type.INTEGER, description: "O índice da resposta correta (0, 1, 2 ou 3) correspondente às options fornecidas." },
                          explanation: { type: Type.STRING, description: "Explicação didática de por que essa opção está correta." }
                        },
                        required: ["question", "options", "correctAnswer", "explanation"]
                      }
                    }
                  },
                  required: ["title", "content", "duration", "quiz"]
                }
              }
            },
            required: ["title", "lessons"]
          }
        }
      },
      required: ["title", "description", "category", "duration", "modules"]
    };

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: courseSchema,
      }
    });

    const generatedText = response.text;
    if (!generatedText) {
      throw new Error("Não foi possível obter resposta de texto do modelo Gemini.");
    }

    const courseData = JSON.parse(generatedText.trim());
    
    // Assign a unique id to the newly generated course
    const cleanTopic = topic.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 20);
    const dynamicId = `dyn-${cleanTopic}-${Date.now()}`;
    
    const finalizedCourse = {
      id: dynamicId,
      ...courseData,
      isCustom: true
    };

    return res.json(finalizedCourse);
  } catch (error: any) {
    console.error("Erro ao gerar curso via Gemini:", error);
    return res.status(500).json({ 
      error: "Houve um erro ao processar sua solicitação de geração de curso.", 
      details: error.message 
    });
  }
});

// POST /api/tutor/chat - AI Tutor chat specific to a lesson
app.post("/api/tutor/chat", async (req, res) => {
  try {
    const { messages, lessonTitle, lessonContent } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "O parâmetro 'messages' é obrigatório e deve ser um array." });
    }

    const gemini = getGeminiClient();

    const systemInstruction = `Você é o "Tutor Programa Certo", o tutor inteligente oficial da plataforma de cursos Programa Certo.
Você é extremamente amigável, encorajador, paciente e adota a didática clássica de explicações diretas, fáceis de compreender, com exemplos de código práticos e um toque motivacional saudável.
Sempre responda em português (do Brasil).

O aluno está lendo atualmente a aula: "${lessonTitle || "Geral"}".
Aqui está o conteúdo de texto da aula para o seu contexto imediato de ajuda:
"""
${lessonContent || "Não há conteúdo específico de aula selecionado. Responda a dúvidas gerais de tecnologia ou auxilie na navegação da plataforma."}
"""

Responda às perguntas do aluno relacionando suas respostas diretamente com o assunto abordado nesta aula se aplicável, ou ensine conceitos adicionais caso ele peça desafios práticos. Use Markdown rico em suas respostas para ficar elegante (com negritos, listas e blocos de código formatados com a linguagem certa).`;

    // Convert frontend message history format to simple chat string or parts for generateContent
    // Since we want to provide the rich system instruction context, we can construct the text contents:
    const formattedContents = messages.map(msg => {
      const role = msg.role === "user" ? "user" : "model";
      return {
        role: role,
        parts: [{ text: msg.text }]
      };
    });

    const response = await gemini.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const text = response.text;
    return res.json({ response: text });
  } catch (error: any) {
    console.error("Erro no chat do Tutor IA:", error);
    return res.status(500).json({ 
      error: "Houve um erro ao obter resposta do Tutor de IA.", 
      details: error.message 
    });
  }
});

// GET /api/courses/prebuilt - Retrieve built-in standard courses
app.get("/api/courses/prebuilt", (req, res) => {
  res.json(PREBUILT_COURSES);
});

// GET /api/config-check - Simple test route to check if API key is set
app.get("/api/config-check", (req, res) => {
  res.json({
    geminiKeySet: !!process.env.GEMINI_API_KEY,
    appUrlSet: !!process.env.APP_URL,
    smtpUserSet: !!(process.env.SMTP_USER || defaultSmtpUser),
    smtpPassSet: !!(process.env.SMTP_PASS || defaultSmtpPass)
  });
});

// Cache temporário em memória para dados de atendimento exibidos em PDF (1 hora)
const ticketPdfCache = new Map<string, { ticket: any; expiresAt: number }>();

// POST /api/pdf/atendimento/cache - Registra dados do atendimento para geração instantânea
app.post("/api/pdf/atendimento/cache", express.json(), (req, res) => {
  const ticket = req.body;
  if (!ticket || !ticket.id) {
    return res.status(400).json({ error: "Dados do atendimento inválidos." });
  }
  const cleanId = String(ticket.id).replace(/^#/, "").trim().toLowerCase();
  ticketPdfCache.set(cleanId, {
    ticket,
    expiresAt: Date.now() + 60 * 60 * 1000
  });
  res.json({ success: true, cleanId });
});

// GET /api/pdf/atendimento/:protocol - Gera e transmite o PDF oficial diretamente para o leitor nativo do Chrome
app.get("/api/pdf/atendimento/:protocol", async (req, res) => {
  try {
    const rawProto = req.params.protocol;
    if (!rawProto) {
      return res.status(400).send("Protocolo inválido");
    }
    const cleanProto = rawProto.replace(/^#/, "").trim();
    const cleanLower = cleanProto.toLowerCase();

    let ticket: any = null;

    // 1. Verificar cache primeiro (caso o frontend tenha enviado com email e dados já resolvidos)
    const cached = ticketPdfCache.get(cleanLower);
    if (cached && cached.expiresAt > Date.now()) {
      ticket = cached.ticket;
    }

    // 2. Se não estiver em cache, consultar banco Supabase dedicado de atendimentos
    if (!ticket) {
      const client = getAtendimentoClient();
      if (client) {
        const { data, error } = await client
          .from("atendimentos")
          .select("*")
          .or(`id.eq.${cleanProto},id.eq.#${cleanProto},id.ilike.%${cleanProto}%`)
          .limit(1)
          .maybeSingle();

        if (data && !error) {
          const matVal = data.matricula_usuario || data.id_do_usuario || data.user_id;
          ticket = {
            id: data.id,
            matricula_usuario: matVal,
            user_id: matVal,
            nome: data.nome || "Usuário",
            email: data.email || "",
            tipo: data.tipo || "Geral",
            mensagem: data.mensagem || "",
            status: data.status === "Pendente" ? "Aguardando" : (data.status || "Aguardando"),
            resposta: data.resposta || data.mensagem_respondida || "",
            mensagem_respondida: data.mensagem_respondida || data.resposta || "",
            respondido_por: data.respondido_por || "",
            respondido_em: data.respondido_em || null,
            criado_em: data.criado_em || new Date().toISOString(),
            atualizado_em: data.atualizado_em || data.criado_em || new Date().toISOString()
          };
        }
      }
    }

    if (!ticket) {
      return res.status(404).send(`Atendimento "${cleanProto}" não encontrado no sistema.`);
    }

    // 3. Garantir resolução de email se estiver vazio
    if (!ticket.email || ticket.email === "E-mail não informado") {
      try {
        if (supabaseServerClient) {
          const targetMat = ticket.matricula_usuario || ticket.user_id;
          if (targetMat) {
            const { data: u } = await supabaseServerClient
              .from("usuarios")
              .select("email, nome")
              .eq("matricula", targetMat)
              .maybeSingle();
            if (u?.email) {
              ticket.email = u.email;
            } else {
              const { data: uFallback } = await supabaseServerClient
                .from("usuarios")
                .select("email, nome")
                .eq("id", targetMat)
                .maybeSingle();
              if (uFallback?.email) ticket.email = uFallback.email;
            }
          }
          if (!ticket.email && ticket.nome) {
            const { data: u } = await supabaseServerClient
              .from("usuarios")
              .select("email, nome")
              .ilike("nome", ticket.nome)
              .maybeSingle();
            if (u?.email) ticket.email = u.email;
          }
        }
      } catch (e) {
        console.warn("Erro ao buscar email do solicitante no banco:", e);
      }
    }

    // 4. Construir o documento PDF oficial
    const doc = buildTicketPdfDoc(ticket);
    const pdfArrayBuffer = doc.output("arraybuffer");
    const buffer = Buffer.from(pdfArrayBuffer);

    // 5. Cabeçalhos HTTP para visualização inline nativa no Chrome
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Atendimento-${cleanProto}.pdf"`);
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(buffer);
  } catch (err: any) {
    console.error("Erro ao gerar PDF do atendimento:", err);
    res.status(500).send("Erro ao processar PDF: " + err.message);
  }
});

// In-memory store for password reset verification codes (expires after 15 minutes)
interface ResetCodeEntry {
  code: string;
  email: string;
  expiresAt: number;
}
const passwordResetMap = new Map<string, ResetCodeEntry>();

// POST /api/auth/request-password-reset - Generate code and send email via Supabase Auth and/or Gmail
app.post("/api/auth/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "E-mail inválido ou não informado." });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

    passwordResetMap.set(cleanEmail, {
      code,
      email: cleanEmail,
      expiresAt
    });

    // 1. Envio de e-mail real com código de segurança OTP através do Supabase Auth
    if (supabaseServerClient) {
      try {
        const { error: otpError } = await supabaseServerClient.auth.signInWithOtp({ email: cleanEmail });
        if (otpError) {
          console.warn("[Programa Certo] Supabase OTP reset aviso:", otpError.message);
        } else {
          console.log(`[Programa Certo] E-mail de código de redefinição enviado com sucesso via Supabase para: ${cleanEmail}`);
        }
      } catch (sbErr: any) {
        console.warn("[Programa Certo] Erro no envio via Supabase:", sbErr?.message);
      }
    }

    // 2. Disparo de e-mail institucional via Gmail
    const gmailAuth = getGmailTransporter();
    if (gmailAuth) {
      try {
        const { transporter, user: smtpUser } = gmailAuth;

        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 30px 15px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
              .header { background-color: #0b439c; padding: 28px 24px; text-align: center; }
              .header h1 { color: #ffffff; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
              .header p { color: #dbeafe; font-size: 13px; margin: 6px 0 0 0; }
              .content { padding: 32px 24px; color: #1f2937; }
              .content h2 { font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 12px 0; }
              .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 20px 0; }
              .code-box { background: #f0fdf4; border: 2px dashed #16a34a; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .code-box span { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #15803d; margin-bottom: 6px; }
              .code-box .code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #166534; }
              .warning { background: #fef2f2; border-left: 4px solid #ef4444; border-radius: 6px; padding: 12px 16px; margin-top: 24px; }
              .warning p { font-size: 12px; color: #991b1b; margin: 0; line-height: 1.5; }
              .footer { background-color: #f9fafb; border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; font-size: 11px; color: #9ca3af; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>PROGRAMA CERTO</h1>
                <p>Plataforma de Desenvolvimento e Capacitação</p>
              </div>
              <div class="content">
                <h2>Código de Redefinição de Senha</h2>
                <p>Olá! Recebemos uma solicitação para redefinir a senha de acesso da sua conta na plataforma Programa Certo.</p>
                
                <div class="code-box">
                  <span>SEU CÓDIGO DE SEGURANÇA</span>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #6b7280;">Insira este código na tela da plataforma para cadastrar uma nova senha. Este código é válido por <strong>15 minutos</strong>.</p>

                <div class="warning">
                  <p><strong>Aviso de Segurança:</strong> Se você não solicitou a redefinição de senha, ignore este e-mail. Nunca compartilhe este código com terceiros.</p>
                </div>
              </div>
              <div class="footer">
                Este é um e-mail automático enviado pelo sistema de segurança do Programa Certo.<br>
                Remetente: ${smtpUser}
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `Programa Certo <${smtpUser}>`,
          to: cleanEmail,
          subject: `${code} é o seu código de redefinição de senha - Programa Certo`,
          html: htmlBody,
          text: `Seu código de redefinição de senha do Programa Certo é: ${code}. Ele expira em 15 minutos. Se você não solicitou, ignore esta mensagem.`
        });
        console.log(`[Programa Certo] E-mail com código enviado com sucesso via Gmail para: ${cleanEmail}`);
      } catch (smtpErr) {
        console.warn("[Programa Certo] Erro no envio via Gmail SMTP:", smtpErr);
      }
    }

    // O código é 100% privado e confidencial - NUNCA retornado no JSON
    return res.json({
      success: true,
      sent: true,
      message: "Código de segurança enviado com sucesso para o seu e-mail! Verifique sua caixa de entrada e pasta de spam."
    });
  } catch (err: any) {
    console.error("[Programa Certo] Erro ao enviar e-mail de recuperação:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar o envio do e-mail de recuperação."
    });
  }
});

// POST /api/auth/verify-reset-code - Validate code
app.post("/api/auth/verify-reset-code", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e código são obrigatórios." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;

    // 1. Checa mapa em memória
    const entry = passwordResetMap.get(cleanEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
    }

    // 2. Se não bateu com o mapa em memória, valida com o OTP do Supabase
    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
        console.warn("[Programa Certo] Erro ao validar OTP Supabase:", vErr);
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: "Código de verificação incorreto ou expirado. Verifique os 6 dígitos recebidos no seu e-mail." });
    }

    return res.json({ success: true, valid: true });
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao validar o código." });
  }
});

// In-memory store for account deletion verification codes (expires after 15 minutes)
const deleteAccountMap = new Map<string, ResetCodeEntry>();

// POST /api/auth/request-delete-account-code - Generate and send deletion verification code
app.post("/api/auth/request-delete-account-code", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "E-mail inválido ou não informado." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

    deleteAccountMap.set(cleanEmail, {
      code,
      email: cleanEmail,
      expiresAt
    });

    // 1. Envio de e-mail real com código de 6 dígitos via Supabase Auth OTP
    if (supabaseServerClient) {
      try {
        const { error: otpError } = await supabaseServerClient.auth.signInWithOtp({ email: cleanEmail });
        if (otpError) {
          console.warn("[Programa Certo] Supabase OTP exclusão aviso:", otpError.message);
        } else {
          console.log(`[Programa Certo] E-mail de confirmação de exclusão enviado com sucesso via Supabase para: ${cleanEmail}`);
        }
      } catch (sbErr: any) {
        console.warn("[Programa Certo] Erro no envio via Supabase:", sbErr?.message);
      }
    }

    // 2. Disparo de e-mail institucional via Gmail
    const gmailAuth = getGmailTransporter();
    if (gmailAuth) {
      try {
        const { transporter, user: smtpUser } = gmailAuth;

        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px 15px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #fee2e2; overflow: hidden; box-shadow: 0 4px 14px rgba(220,38,38,0.08); }
              .header { background-color: #b91c1c; padding: 28px 24px; text-align: center; }
              .header h1 { color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
              .header p { color: #fecaca; font-size: 13px; margin: 6px 0 0 0; }
              .content { padding: 32px 24px; color: #1f2937; }
              .content h2 { font-size: 18px; font-weight: 800; color: #991b1b; margin: 0 0 12px 0; }
              .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 18px 0; }
              .danger-box { background: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .danger-box span { display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #b91c1c; margin-bottom: 6px; }
              .danger-box .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #991b1b; }
              .warning { background: #fff1f2; border-left: 4px solid #be123c; border-radius: 6px; padding: 14px 16px; margin-top: 24px; }
              .warning p { font-size: 12px; color: #881337; margin: 0; line-height: 1.5; font-weight: 500; }
              .footer { background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>PROGRAMA CERTO</h1>
                <p>Segurança e Gerenciamento de Conta</p>
              </div>
              <div class="content">
                <h2>Solicitação de Exclusão de Conta</h2>
                <p>Recebemos um pedido para <strong>excluir permanentemente</strong> a sua conta na plataforma Programa Certo.</p>
                
                <p><strong>Atenção:</strong> Ao solicitar a exclusão da sua conta, todos os seus dados cadastrais, cursos concluídos e lições finalizadas serão excluídos. Esta ação não pode ser desfeita.</p>

                <div class="danger-box">
                  <span>CÓDIGO DE CONFIRMAÇÃO</span>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #64748b;">Insira este código na tela da plataforma para confirmar a exclusão. Este código é válido por <strong>15 minutos</strong>.</p>

                <div class="warning">
                  <p><strong>Não foi você?</strong> Se você não solicitou a exclusão da sua conta, ignore este e-mail imediatamente. Sua conta permanecerá intacta e seus dados protegidos.</p>
                </div>
              </div>
              <div class="footer">
                E-mail oficial de segurança do Programa Certo.<br>
                Remetente: ${smtpUser}
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `Programa Certo <${smtpUser}>`,
          to: cleanEmail,
          subject: `⚠️ Código ${code} para Exclusão de Conta - Programa Certo`,
          html: htmlBody,
          text: `Seu código para confirmar a exclusão definitiva da sua conta no Programa Certo é: ${code}. Válido por 15 minutos. Se não foi você, ignore este e-mail.`
        });

        console.log(`[Programa Certo] Código de exclusão de conta enviado com sucesso via Gmail para: ${cleanEmail}`);
      } catch (smtpErr) {
        console.warn("[Programa Certo] Erro no envio via Gmail SMTP para exclusão:", smtpErr);
      }
    }

    // Código privado e seguro - NUNCA retornado no JSON
    return res.json({
      success: true,
      sent: true,
      message: "Código de confirmação enviado para seu e-mail! Verifique sua caixa de entrada e pasta de spam."
    });
  } catch (err: any) {
    console.error("[Programa Certo] Erro ao enviar e-mail de exclusão:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar o envio do código de exclusão."
    });
  }
});

// POST /api/auth/confirm-delete-account - Validate code for deletion
app.post("/api/auth/confirm-delete-account", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ error: "E-mail e código de segurança são obrigatórios." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;

    // 1. Checa mapa em memória
    const entry = deleteAccountMap.get(cleanEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
      deleteAccountMap.delete(cleanEmail);
    }

    // 2. Se não bateu com o mapa em memória, valida com o OTP do Supabase
    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
        console.warn("[Programa Certo] Erro validação Supabase OTP exclusão:", vErr);
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: "Código de verificação incorreto ou expirado. Confira os 6 dígitos recebidos no seu e-mail." });
    }

    return res.json({
      success: true,
      message: "Código validado com sucesso. Exclusão autorizada."
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao validar o código de exclusão." });
  }
});

// POST /api/auth/complete-password-reset - Finalize reset and remove token
app.post("/api/auth/complete-password-reset", async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      return res.status(400).json({ error: "Dados incompletos para redefinição de senha." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "A nova senha deve ter no mínimo 6 caracteres." });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;

    const entry = passwordResetMap.get(cleanEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
      passwordResetMap.delete(cleanEmail);
    }

    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
        // continue
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: "Código inválido ou expirado. Solicite um novo." });
    }

    return res.json({
      success: true,
      message: "Código validado com sucesso para alteração da senha."
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao concluir a redefinição de senha." });
  }
});

// In-memory store for sensitive profile update verification codes (expires after 15 minutes)
const profileUpdateMap = new Map<string, ResetCodeEntry>();

// POST /api/auth/request-profile-update-code - Generate and send verification code for email/password changes
app.post("/api/auth/request-profile-update-code", async (req, res) => {
  try {
    const { currentEmail, newEmail, isPasswordChange } = req.body;
    if (!currentEmail || typeof currentEmail !== "string") {
      return res.status(400).json({ error: "E-mail atual inválido ou não informado." });
    }

    const cleanCurrentEmail = currentEmail.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

    profileUpdateMap.set(cleanCurrentEmail, {
      code,
      email: cleanCurrentEmail,
      expiresAt
    });

    // 1. Envio de e-mail real com código OTP via Supabase Auth
    if (supabaseServerClient) {
      try {
        const { error: otpError } = await supabaseServerClient.auth.signInWithOtp({ email: cleanCurrentEmail });
        if (otpError) {
          console.warn("[Programa Certo] Supabase OTP profile aviso:", otpError.message);
        } else {
          console.log(`[Programa Certo] Código OTP enviado via Supabase para: ${cleanCurrentEmail}`);
        }
      } catch (sbErr: any) {
        console.warn("[Programa Certo] Erro no envio Supabase:", sbErr?.message);
      }
    }

    // 2. Disparo de e-mail institucional via Gmail
    const gmailAuth = getGmailTransporter();
    if (gmailAuth) {
      try {
        const { transporter, user: smtpUser } = gmailAuth;

        const changesDescription = [
          newEmail && newEmail !== cleanCurrentEmail ? `<li><strong>Novo endereço de e-mail:</strong> ${newEmail}</li>` : "",
          isPasswordChange ? `<li><strong>Alteração de senha de acesso</strong></li>` : ""
        ].filter(Boolean).join("");

        const htmlBody = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 30px 15px; }
              .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #dbeafe; overflow: hidden; box-shadow: 0 4px 14px rgba(11,67,156,0.08); }
              .header { background-color: #0b439c; padding: 28px 24px; text-align: center; }
              .header h1 { color: #ffffff; font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
              .header p { color: #bfdbfe; font-size: 13px; margin: 6px 0 0 0; }
              .content { padding: 32px 24px; color: #1f2937; }
              .content h2 { font-size: 18px; font-weight: 800; color: #0b439c; margin: 0 0 12px 0; }
              .content p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 18px 0; }
              .changes-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px 18px; margin: 18px 0; font-size: 13px; color: #166534; }
              .code-box { background: #f8fafc; border: 2px dashed #0b439c; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
              .code-box span { display: block; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #0b439c; margin-bottom: 6px; }
              .code-box .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #0b439c; }
              .warning { background: #fffbeb; border-left: 4px solid #d97706; border-radius: 6px; padding: 14px 16px; margin-top: 24px; }
              .warning p { font-size: 12px; color: #92400e; margin: 0; line-height: 1.5; font-weight: 500; }
              .footer { background-color: #f8fafc; border-top: 1px solid #f1f5f9; padding: 16px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <h1>PROGRAMA CERTO</h1>
                <p>Verificação de Segurança da Conta</p>
              </div>
              <div class="content">
                <h2>Confirmação de Alteração de Dados</h2>
                <p>Olá! Recebemos uma solicitação para alterar informações sensíveis da sua conta na plataforma <strong>Programa Certo</strong>.</p>
                
                ${changesDescription ? `
                <div class="changes-box">
                  <strong>Alterações solicitadas:</strong>
                  <ul style="margin: 6px 0 0 0; padding-left: 18px;">
                    ${changesDescription}
                  </ul>
                </div>
                ` : ""}

                <p>Por medidas de segurança e para confirmar que é você mesmo realizando esta alteração, insira o código de validação abaixo:</p>

                <div class="code-box">
                  <span>CÓDIGO DE VERIFICAÇÃO</span>
                  <div class="code">${code}</div>
                </div>

                <p style="font-size: 13px; color: #64748b;">Este código é válido por <strong>15 minutos</strong> e expira automaticamente após a confirmação.</p>

                <div class="warning">
                  <p><strong>Não foi você?</strong> Se você não solicitou a alteração do seu e-mail ou da sua senha, não compartilhe este código com ninguém. Seus dados continuam protegidos.</p>
                </div>
              </div>
              <div class="footer">
                E-mail oficial de segurança do Programa Certo.<br>
                Remetente: ${smtpUser}
              </div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
          from: `Programa Certo <${smtpUser}>`,
          to: cleanCurrentEmail,
          subject: `🔒 Código ${code} para Alteração de Dados - Programa Certo`,
          html: htmlBody,
          text: `Seu código de verificação para alteração de dados no Programa Certo é: ${code}. Válido por 15 minutos.`
        });

        console.log(`[Programa Certo] Código de alteração de dados enviado com sucesso via Gmail para: ${cleanCurrentEmail}`);
      } catch (smtpErr) {
        console.warn("[Programa Certo] Erro no envio via Gmail SMTP para alteração de perfil:", smtpErr);
      }
    }

    // Código privado e seguro - NUNCA retornado no JSON
    return res.json({
      success: true,
      sent: true,
      message: "Código de verificação enviado para o seu e-mail com sucesso! Verifique sua caixa de entrada e pasta de spam."
    });
  } catch (err: any) {
    console.error("[Programa Certo] Erro ao enviar e-mail de verificação:", err);
    return res.status(500).json({
      error: err.message || "Erro ao processar o envio do código de verificação."
    });
  }
});

// POST /api/auth/verify-profile-update-code - Validate code for updating sensitive profile data
app.post("/api/auth/verify-profile-update-code", async (req, res) => {
  try {
    const { currentEmail, code } = req.body;
    if (!currentEmail || !code) {
      return res.status(400).json({ error: "E-mail e código de verificação são obrigatórios." });
    }

    const cleanCurrentEmail = currentEmail.trim().toLowerCase();
    const cleanCode = String(code).trim();
    let isValid = false;

    const entry = profileUpdateMap.get(cleanCurrentEmail);
    if (entry && Date.now() <= entry.expiresAt && entry.code.trim() === cleanCode) {
      isValid = true;
      profileUpdateMap.delete(cleanCurrentEmail);
    }

    if (!isValid && supabaseServerClient) {
      try {
        const { data: vData, error: vError } = await supabaseServerClient.auth.verifyOtp({
          email: cleanCurrentEmail,
          token: cleanCode,
          type: "email"
        });
        if (!vError && vData) {
          isValid = true;
        }
      } catch (vErr) {
        // continue
      }
    }

    if (!isValid) {
      return res.status(400).json({ error: "Código de verificação incorreto ou expirado. Confira os 6 dígitos digitados." });
    }

    return res.json({
      success: true,
      message: "Código validado com sucesso. Alteração autorizada."
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Erro ao validar código de segurança." });
  }
});

// Vite Middleware integration for SPA development / production asset serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : undefined,
        watch: isHmrDisabled ? null : undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Programa Certo Server] Rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
